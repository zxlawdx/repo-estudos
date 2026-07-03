import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
}
interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [CommonModule, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-container-max mx-auto w-full">
      <h2 class="text-headline-md text-on-surface mb-md">Grafo de Conhecimento</h2>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <div *ngIf="!loading() && !error()" class="relative bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden" style="height: 560px;">
        <svg class="absolute inset-0 w-full h-full" (mousemove)="onMouseMove($event)" (mouseup)="onMouseUp()">
          <line *ngFor="let e of edges()" [attr.x1]="nodeById(e.source)?.x" [attr.y1]="nodeById(e.source)?.y"
                [attr.x2]="nodeById(e.target)?.x" [attr.y2]="nodeById(e.target)?.y"
                stroke="#737686" stroke-width="1.5" />
          <g *ngFor="let n of nodes()" [attr.transform]="'translate(' + n.x + ',' + n.y + ')'"
             (mousedown)="onMouseDown($event, n)" style="cursor: grab;">
            <rect x="-70" y="-24" width="140" height="48" rx="10" fill="white" stroke="#c3c6d7"></rect>
            <text x="0" y="5" text-anchor="middle" font-size="12" fill="#191c1e">{{ n.label }}</text>
          </g>
        </svg>
      </div>
      <div class="mt-md flex justify-end" *ngIf="!loading() && !error()">
        <button (click)="savePositions()" class="bg-primary text-on-primary px-lg py-2 rounded-xl text-label-md hover:opacity-90">
          Salvar posições
        </button>
      </div>
    </section>
  `
})
export class GraphPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  nodes = signal<GraphNode[]>([]);
  edges = signal<GraphEdge[]>([]);

  private dragging: GraphNode | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/graph').subscribe({
      next: (graphRes) => {
        const rawNodes = (graphRes?.nodes || []) as any[];
        const rawEdges = (graphRes?.edges || []) as any[];
        this.edges.set(rawEdges.map((e) => ({ id: e.id, source: e.source || e.fromId, target: e.target || e.toId })));

        this.api.get<any>('/graph/positions').subscribe({
          next: (posRes) => {
            const positions: Record<string, { x: number; y: number }> = {};
            (posRes?.positions || posRes || []).forEach((p: any) => {
              positions[p.nodeKey || p.node_key || p.id] = { x: p.x, y: p.y };
            });
            this.nodes.set(
              rawNodes.map((n, i) => {
                const key = n.key || n.id;
                const pos = positions[key];
                return {
                  id: key,
                  label: n.label || n.name || key,
                  type: n.type,
                  x: pos?.x ?? 120 + (i % 4) * 180,
                  y: pos?.y ?? 100 + Math.floor(i / 4) * 120
                };
              })
            );
            this.loading.set(false);
          },
          error: () => {
            this.nodes.set(rawNodes.map((n, i) => ({ id: n.key || n.id, label: n.label || n.name, type: n.type, x: 120 + (i % 4) * 180, y: 100 + Math.floor(i / 4) * 120 })));
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.error.set('Não foi possível carregar o grafo.');
        this.loading.set(false);
      }
    });
  }

  nodeById(id: string) {
    return this.nodes().find((n) => n.id === id);
  }

  onMouseDown(event: MouseEvent, node: GraphNode) {
    event.preventDefault();
    this.dragging = node;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.dragging) return;
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.nodes.update((list) =>
      list.map((n) => (n.id === this.dragging!.id ? { ...n, x, y } : n))
    );
  }

  onMouseUp() {
    this.dragging = null;
  }

  savePositions() {
    const payload = {
      positions: this.nodes().map((n) => ({ nodeKey: n.id, x: n.x, y: n.y }))
    };
    this.api.post('/graph/positions', payload).subscribe();
  }
}
