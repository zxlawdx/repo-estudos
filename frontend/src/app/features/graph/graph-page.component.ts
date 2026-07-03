import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GraphData, GraphEdge, GraphNode } from '../../core/models/app.models';
import { GraphService } from '../../core/services/graph.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { pickString } from '../../shared/utils/view.utils';

interface PositionedNode extends GraphNode { x: number; y: number; }

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="page-shell">
      <app-page-header title="Grafo global" subtitle="Visualize materiais, trilhas, categorias, tags, tópicos e dependências."></app-page-header>
      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <div *ngIf="!loading()" class="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-lg">
        <section class="settings-card overflow-hidden">
          <div class="flex items-center justify-between gap-3 flex-wrap mb-md">
            <div class="chips-row"><button class="filter-chip active">Todos</button><button class="filter-chip">Materiais</button><button class="filter-chip">Trilhas</button><button class="filter-chip">Categorias</button></div>
            <div class="flex gap-2"><button class="btn-secondary" (click)="resetView()"><span class="material-symbols-outlined text-[18px]">center_focus_strong</span>Reset</button><button class="btn-primary" (click)="savePositions()"><span class="material-symbols-outlined text-[18px]">save</span>Salvar posições</button></div>
          </div>

          <div class="graph-canvas" (wheel)="zoom($event)">
            <svg [attr.viewBox]="viewBox()" class="w-full h-full select-none" (mousemove)="move($event)" (mouseup)="stopDrag()" (mouseleave)="stopDrag()">
              <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#94a3b8"></path></marker></defs>
              <line *ngFor="let edge of edges()" [attr.x1]="nodeX(edgeSource(edge))" [attr.y1]="nodeY(edgeSource(edge))" [attr.x2]="nodeX(edgeTarget(edge))" [attr.y2]="nodeY(edgeTarget(edge))" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"></line>
              <g *ngFor="let node of nodes()" [attr.transform]="'translate(' + node.x + ',' + node.y + ')'" (mousedown)="startDrag($event, node)" (click)="selectNode(node)">
                <circle r="34" class="graph-node-circle"></circle>
                <text text-anchor="middle" y="5" class="graph-node-icon">{{ icon(node) }}</text>
                <text text-anchor="middle" y="52" class="graph-node-label">{{ label(node) }}</text>
              </g>
            </svg>
            <div *ngIf="!nodes().length" class="graph-empty"><span class="material-symbols-outlined">hub</span><p>Nenhum nó retornado pelo endpoint /api/graph.</p></div>
          </div>
        </section>

        <aside class="settings-card h-fit">
          <h3 class="section-title mb-md">Detalhes do nó</h3>
          <div *ngIf="!selected()" class="text-body-sm text-on-surface-variant">Clique em um nó para ver detalhes.</div>
          <div *ngIf="selected()" class="safe-status-panel">
            <div class="safe-status-row"><span>Título</span><b>{{ label(selected()) }}</b></div>
            <div class="safe-status-row"><span>Tipo</span><b>{{ selected()?.type || 'nó' }}</b></div>
            <div class="safe-status-row"><span>ID</span><b class="break-all">{{ selected()?.id }}</b></div>
          </div>
          <p *ngIf="saved()" class="mt-md text-body-sm text-primary bg-primary-fixed rounded-2xl px-4 py-3">Posições salvas.</p>
        </aside>
      </div>
    </section>
  `
})
export class GraphPageComponent implements OnInit {
  loading = signal(true); error = signal<string | null>(null); nodes = signal<PositionedNode[]>([]); edges = signal<GraphEdge[]>([]); selected = signal<PositionedNode | null>(null); saved = signal(false);
  private dragging: PositionedNode | null = null; private offset = { x: 0, y: 0 }; scale = signal(1); panX = signal(0); panY = signal(0);
  constructor(private graph: GraphService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.graph.global().subscribe({ next: (res: GraphData) => { const nodes = Array.isArray(res.nodes) ? res.nodes : []; this.nodes.set(nodes.map((n, i) => ({ ...n, x: typeof n.x === 'number' ? n.x : 120 + (i % 5) * 160, y: typeof n.y === 'number' ? n.y : 120 + Math.floor(i / 5) * 150 }))); this.edges.set(Array.isArray(res.edges) ? res.edges : []); this.loading.set(false); this.loadPositions(); }, error: (err: Error) => { this.error.set(err.message); this.loading.set(false); } }); }
  loadPositions(): void { this.graph.positions('global').subscribe({ next: (res) => { const map = (res && typeof res === 'object' ? res as Record<string, unknown> : {}) as Record<string, unknown>; this.nodes.update((nodes) => nodes.map((node) => { const p = map[node.id] as { x?: number; y?: number } | undefined; return p ? { ...node, x: Number(p.x ?? node.x), y: Number(p.y ?? node.y) } : node; })); }, error: () => undefined }); }
  viewBox(): string { return `${this.panX()} ${this.panY()} ${900 / this.scale()} ${620 / this.scale()}`; }
  resetView(): void { this.scale.set(1); this.panX.set(0); this.panY.set(0); }
  zoom(event: WheelEvent): void { event.preventDefault(); this.scale.set(Math.max(0.55, Math.min(1.8, this.scale() + (event.deltaY > 0 ? -0.08 : 0.08)))); }
  startDrag(event: MouseEvent, node: PositionedNode): void { event.preventDefault(); this.dragging = node; this.offset = { x: event.offsetX - node.x, y: event.offsetY - node.y }; }
  move(event: MouseEvent): void { if (!this.dragging) return; const x = event.offsetX - this.offset.x; const y = event.offsetY - this.offset.y; const id = this.dragging.id; this.nodes.update((nodes) => nodes.map((n) => n.id === id ? { ...n, x, y } : n)); }
  stopDrag(): void { this.dragging = null; }
  selectNode(node: PositionedNode): void { this.selected.set(node); }
  savePositions(): void { const positions: Record<string, { x: number; y: number }> = {}; this.nodes().forEach((n) => { positions[n.id] = { x: n.x, y: n.y }; }); this.graph.savePositions({ scope: 'global', positions }).subscribe({ next: () => this.saved.set(true), error: (err: Error) => this.error.set(err.message) }); }
  nodeX(id: string): number { return this.nodes().find((n) => n.id === id)?.x || 0; }
  nodeY(id: string): number { return this.nodes().find((n) => n.id === id)?.y || 0; }
  edgeSource(edge: GraphEdge): string { return String(edge.source || edge.from || ''); }
  edgeTarget(edge: GraphEdge): string { return String(edge.target || edge.to || ''); }
  label(node: GraphNode | null): string { return pickString(node, ['label', 'title', 'name'], node?.id || 'Nó'); }
  icon(node: GraphNode): string { const t = String(node.type || '').toLowerCase(); if (t.includes('path')) return '⟲'; if (t.includes('category')) return '◎'; if (t.includes('tag')) return '#'; return '📄'; }
}
