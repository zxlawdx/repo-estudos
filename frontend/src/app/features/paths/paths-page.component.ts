import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LearningPath } from '../../core/models/app.models';
import { PathsService } from '../../core/services/paths.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { firstArray, pickNumber, pickString } from '../../shared/utils/view.utils';

@Component({
  selector: 'app-paths-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
    <section class="page-shell">
      <app-page-header title="Trilhas de estudo" subtitle="Sequências de materiais com progresso, relações e grafo da trilha."></app-page-header>
      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading() && !error() && !paths().length" icon="route" title="Nenhuma trilha encontrada" description="Crie trilhas para organizar materiais obrigatórios, recomendados e complementares."></app-empty-state>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-lg" *ngIf="!loading() && paths().length">
        <a *ngFor="let path of paths()" [routerLink]="['/app/paths', id(path)]" class="path-card no-underline">
          <div class="flex items-start justify-between gap-3"><span class="badge badge-secondary">{{ path.level || 'Geral' }}</span><span class="material-symbols-outlined text-primary">route</span></div>
          <h3 class="text-headline-sm text-on-surface mt-md">{{ title(path) }}</h3>
          <p class="text-body-sm text-on-surface-variant min-h-[42px]">{{ path.description || 'Sem descrição.' }}</p>
          <div class="flex flex-wrap gap-2 mt-md"><span class="badge badge-secondary">{{ path.area || 'Sem área' }}</span><span class="badge badge-secondary">{{ count(path) }} materiais</span><span class="badge badge-secondary">{{ path.estimated_time || 'Tempo livre' }}</span></div>
          <div class="mt-md"><div class="flex justify-between text-label-sm text-on-surface-variant"><span>Progresso</span><b>{{ progress(path) }}%</b></div><div class="w-full h-2 rounded-full bg-surface-container-high mt-2"><div class="h-full bg-primary rounded-full" [style.width.%]="progress(path)"></div></div></div>
        </a>
      </div>
    </section>
  `
})
export class PathsPageComponent implements OnInit {
  loading = signal(true); error = signal<string | null>(null); paths = signal<LearningPath[]>([]);
  constructor(private pathsService: PathsService) {}
  ngOnInit(): void { this.pathsService.list().subscribe({ next: (res) => { this.paths.set(firstArray<LearningPath>(res, ['paths', 'items', 'learningPaths'])); this.loading.set(false); }, error: (err: Error) => { this.error.set(err.message); this.loading.set(false); } }); }
  id(path: LearningPath): string { return String(path.id || path.path_id || ''); }
  title(path: LearningPath): string { return pickString(path, ['title', 'name'], 'Trilha sem título'); }
  count(path: LearningPath): number { return pickNumber(path, ['material_count', 'materials_count', 'count'], 0); }
  progress(path: LearningPath): number { return Math.max(0, Math.min(100, pickNumber(path, ['progress', 'progress_percent'], 0))); }
}
