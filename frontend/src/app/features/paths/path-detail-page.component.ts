import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PathsService } from '../../core/services/paths.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { firstArray, fileTitle, fileTypeLabel, pickNumber, pickString, statusLabel } from '../../shared/utils/view.utils';
import { StudyMaterial } from '../../core/models/app.models';

@Component({
  selector: 'app-path-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="page-shell">
      <a routerLink="/app/paths" class="text-primary text-label-md hover:underline no-underline">&larr; Voltar para trilhas</a>
      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <ng-container *ngIf="!loading() && detail()">
        <section class="settings-card mt-lg mb-lg">
          <div class="flex items-start justify-between gap-3 flex-wrap"><div><h2 class="text-headline-md text-on-surface">{{ pathTitle() }}</h2><p class="text-body-md text-on-surface-variant">{{ pick(['description'], 'Sem descrição.') }}</p></div><button class="btn-primary"><span class="material-symbols-outlined text-[18px]">add</span>Adicionar material</button></div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-md mt-lg"><div class="stat-card compact"><p class="stat-label">Materiais</p><strong class="stat-value">{{ items().length }}</strong></div><div class="stat-card compact"><p class="stat-label">Nível</p><strong class="text-headline-sm">{{ pick(['level'], 'Geral') }}</strong></div><div class="stat-card compact"><p class="stat-label">Área</p><strong class="text-headline-sm">{{ pick(['area'], '—') }}</strong></div><div class="stat-card compact"><p class="stat-label">Progresso</p><strong class="stat-value">{{ progress() }}%</strong></div></div>
        </section>
        <div class="chips-row mb-lg"><button class="filter-chip" [class.active]="tab()==='list'" (click)="tab.set('list')">Lista</button><button class="filter-chip" [class.active]="tab()==='graph'" (click)="tab.set('graph')">Grafo</button><button class="filter-chip" [class.active]="tab()==='relations'" (click)="tab.set('relations')">Relações</button></div>
        <section class="settings-card" *ngIf="tab()==='list'">
          <h3 class="section-title mb-md">Materiais ordenados</h3>
          <div *ngIf="!items().length" class="empty-state"><span class="material-symbols-outlined">playlist_add</span><h3>Trilha sem materiais</h3><p>Use “Adicionar material” para vincular itens da biblioteca.</p></div>
          <div class="space-y-sm" *ngIf="items().length">
            <article *ngFor="let item of items(); let i = index" class="rounded-2xl border border-outline-variant p-md bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div class="min-w-0"><span class="badge badge-secondary">{{ i + 1 }}</span><h4 class="text-headline-sm text-on-surface truncate mt-2">{{ itemTitle(item) }}</h4><p class="text-body-sm text-on-surface-variant">{{ fileTypeLabel(item.file_type || item.type) }} • {{ statusLabel(item.status || item.progress_status) }}</p></div>
              <div class="flex gap-2 flex-wrap"><a [routerLink]="['/app/reader', item.id || item.material_id || item.file_id]" class="btn-secondary no-underline">Começar</a><button class="btn-primary">Marcar progresso</button></div>
            </article>
          </div>
        </section>
        <section class="settings-card" *ngIf="tab()==='graph'"><h3 class="section-title mb-md">Grafo da trilha</h3><div class="graph-placeholder"><span class="material-symbols-outlined">hub</span><p>Nós, dependências, zoom, pan e posições salvas usam os endpoints /api/graph e /api/graph/positions.</p><a routerLink="/app/graph" class="btn-primary no-underline">Abrir grafo global</a></div></section>
        <section class="settings-card" *ngIf="tab()==='relations'"><h3 class="section-title mb-md">Relações da trilha</h3><p class="text-body-md text-on-surface-variant">Gerencie pré-requisitos, complementos e relações direcionais na tela Relações.</p><a routerLink="/app/relations" class="btn-secondary no-underline mt-md">Abrir relações</a></section>
      </ng-container>
    </section>
  `
})
export class PathDetailPageComponent implements OnInit {
  loading = signal(true); error = signal<string | null>(null); detail = signal<Record<string, unknown> | null>(null); items = signal<StudyMaterial[]>([]); tab = signal<'list' | 'graph' | 'relations'>('list');
  constructor(private route: ActivatedRoute, private paths: PathsService) {}
  ngOnInit(): void { const id = this.route.snapshot.paramMap.get('id') || ''; this.paths.detail(id).subscribe({ next: (res) => { this.detail.set(res as Record<string, unknown>); this.items.set(firstArray<StudyMaterial>(res, ['items', 'materials', 'files'])); this.loading.set(false); }, error: (err: Error) => { this.error.set(err.message); this.loading.set(false); } }); }
  pick(keys: string[], fallback = ''): string { return pickString(this.detail(), keys, fallback); }
  pathTitle(): string { return pickString(this.detail(), ['title', 'name'], 'Trilha sem título'); }
  progress(): number { return pickNumber(this.detail(), ['progress', 'progress_percent'], 0); }
  itemTitle(item: StudyMaterial): string { return fileTitle(item); }
  fileTypeLabel(value: unknown): string { return fileTypeLabel(value); }
  statusLabel(value: unknown): string { return statusLabel(value); }
}
