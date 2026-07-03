import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { firstArray, formatDate, pickNumber, pickString } from '../../shared/utils/view.utils';
import { LearningPath, StudyMaterial } from '../../core/models/app.models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
    <section class="page-shell">
      <app-page-header title="Dashboard" subtitle="Resumo do seu repositório, últimos materiais e atalhos rápidos."></app-page-header>

      <app-loading *ngIf="loading()" label="Carregando resumo..."></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <ng-container *ngIf="!loading()">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
          <article *ngFor="let card of statCards()" class="stat-card">
            <div class="flex items-center justify-between gap-3">
              <div><p class="stat-label">{{ card.label }}</p><strong class="stat-value">{{ card.value }}</strong></div>
              <span class="material-symbols-outlined text-primary text-3xl">{{ card.icon }}</span>
            </div>
          </article>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-lg">
          <section class="settings-card">
            <div class="flex items-center justify-between gap-3 mb-md">
              <h3 class="section-title">Últimos materiais</h3>
              <a routerLink="/app/library" class="btn-secondary text-decoration-none">Ver biblioteca</a>
            </div>
            <app-empty-state *ngIf="!materials().length" icon="folder_open" title="Nenhum material recente" description="Quando houver materiais cadastrados, eles aparecerão aqui."></app-empty-state>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-md" *ngIf="materials().length">
              <a *ngFor="let material of materials()" [routerLink]="['/app/library', idOf(material)]" class="file-card block no-underline">
                <div class="flex items-start justify-between gap-2"><span class="badge badge-secondary">{{ label(material.file_type || material.type) }}</span><span class="material-symbols-outlined text-outline">chevron_right</span></div>
                <h4 class="file-card-title mt-3">{{ title(material) }}</h4>
                <p class="file-card-subtitle">{{ material.author || material.original_name || 'Sem autor informado' }}</p>
                <div class="file-card-meta"><span>{{ material.category_name || 'Sem categoria' }}</span><span>{{ material.year || '—' }}</span></div>
              </a>
            </div>
          </section>

          <aside class="space-y-lg">
            <section class="settings-card">
              <h3 class="section-title mb-md">Ações rápidas</h3>
              <div class="grid grid-cols-2 gap-sm">
                <a routerLink="/app/upload" class="quick-action"><span class="material-symbols-outlined">upload_file</span>Upload</a>
                <a routerLink="/app/link" class="quick-action"><span class="material-symbols-outlined">add_link</span>Link</a>
                <a routerLink="/app/review" class="quick-action"><span class="material-symbols-outlined">rate_review</span>Revisão</a>
                <a routerLink="/app/graph" class="quick-action"><span class="material-symbols-outlined">hub</span>Grafo</a>
              </div>
            </section>

            <section class="settings-card">
              <div class="flex items-center justify-between mb-md"><h3 class="section-title">Trilhas</h3><a routerLink="/app/paths" class="text-primary text-label-md">Abrir</a></div>
              <div *ngIf="!paths().length" class="text-body-sm text-on-surface-variant">Nenhuma trilha encontrada.</div>
              <div class="space-y-sm" *ngIf="paths().length">
                <a *ngFor="let path of paths()" [routerLink]="['/app/paths', path.id || path.path_id]" class="block rounded-2xl border border-outline-variant p-3 hover:bg-surface-container-low no-underline">
                  <strong class="text-on-surface block truncate">{{ path.title || path.name || 'Trilha sem título' }}</strong>
                  <span class="text-label-sm text-on-surface-variant">{{ path.material_count || 0 }} materiais</span>
                </a>
              </div>
            </section>

            <section class="settings-card">
              <h3 class="section-title mb-md">Atividade recente</h3>
              <div *ngIf="!history().length" class="text-body-sm text-on-surface-variant">Nenhuma atividade recente.</div>
              <div *ngFor="let h of history()" class="activity-row"><span class="material-symbols-outlined text-primary">history</span><span><b>{{ pick(h, ['action'], 'Ação') }}</b><small>{{ date(h) }}</small></span></div>
            </section>
          </aside>
        </div>
      </ng-container>
    </section>
  `
})
export class DashboardPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  raw = signal<unknown>({});
  materials = signal<StudyMaterial[]>([]);
  paths = signal<LearningPath[]>([]);
  history = signal<Record<string, unknown>[]>([]);

  constructor(private dashboard: DashboardService) {}

  ngOnInit(): void {
    this.dashboard.summary().subscribe({
      next: (res) => {
        this.raw.set(res);
        this.materials.set(firstArray<StudyMaterial>(res, ['materials', 'latestMaterials', 'recentFiles', 'files']).slice(0, 6));
        this.paths.set(firstArray<LearningPath>(res, ['paths', 'learningPaths', 'trails']).slice(0, 5));
        this.history.set(firstArray<Record<string, unknown>>(res, ['history', 'recentActivity', 'activities']).slice(0, 6));
        this.loading.set(false);
      },
      error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
    });
  }

  statCards(): Array<{ label: string; value: number; icon: string }> {
    const raw = this.raw();
    return [
      { label: 'Materiais', value: pickNumber(raw, ['totalMaterials', 'materialsTotal', 'filesTotal', 'files_count'], this.materials().length), icon: 'library_books' },
      { label: 'Trilhas', value: pickNumber(raw, ['totalPaths', 'pathsTotal', 'paths_count'], this.paths().length), icon: 'route' },
      { label: 'Categorias', value: pickNumber(raw, ['totalCategories', 'categoriesTotal', 'categories_count'], 0), icon: 'category' },
      { label: 'Atividades', value: pickNumber(raw, ['actions', 'historyTotal', 'activity_count'], this.history().length), icon: 'history' }
    ];
  }
  title(material: StudyMaterial): string { return pickString(material, ['title', 'final_name', 'suggested_name', 'name', 'original_name'], 'Material sem título'); }
  label(type: unknown): string { return String(type || 'material').replace('_', ' '); }
  idOf(material: StudyMaterial): string { return String(material.id || material.material_id || material.file_id || ''); }
  pick(item: unknown, keys: string[], fallback = ''): string { return pickString(item, keys, fallback); }
  date(item: unknown): string { return formatDate(pickString(item, ['created_at', 'createdAt', 'date'], '')); }
}
