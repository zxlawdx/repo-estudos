import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { CategoriesService } from '../../core/services/categories.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { firstArray, pickNumber, pickString } from '../../shared/utils/view.utils';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
    <section class="page-shell">
      <app-page-header title="Categorias" subtitle="Áreas, assuntos, ciclos e tags do repositório."></app-page-header>
      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading() && !error() && !categories().length" icon="category" title="Nenhuma categoria cadastrada" description="O endpoint respondeu vazio. Cadastre categorias ou confira a integração /api/categories/tree."></app-empty-state>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg" *ngIf="!loading() && categories().length">
        <article *ngFor="let cat of categories()" class="settings-card">
          <div class="flex items-start justify-between gap-3"><div><h3 class="section-title">{{ name(cat) }}</h3><p class="text-body-sm text-on-surface-variant">{{ pick(cat, ['description'], 'Área do conhecimento') }}</p></div><span class="badge badge-secondary">{{ count(cat) }} materiais</span></div>
          <div class="mt-md space-y-sm">
            <details *ngFor="let subject of children(cat, ['subjects', 'assuntos'])" class="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3" open>
              <summary class="cursor-pointer font-semibold text-on-surface">{{ name(subject) }}</summary>
              <div class="mt-2 flex flex-wrap gap-2"><span *ngFor="let cycle of children(subject, ['cycles', 'ciclos'])" class="badge badge-secondary">{{ name(cycle) }}</span><span *ngIf="!children(subject, ['cycles', 'ciclos']).length" class="text-label-sm text-on-surface-variant">Sem ciclos</span></div>
            </details>
          </div>
        </article>
      </div>
    </section>
  `
})
export class CategoriesPageComponent implements OnInit {
  loading = signal(true); error = signal<string | null>(null); categories = signal<Record<string, unknown>[]>([]);
  constructor(private categoriesService: CategoriesService) {}
  ngOnInit(): void { this.categoriesService.tree().subscribe({ next: (res) => { this.categories.set(firstArray<Record<string, unknown>>(res, ['categories', 'tree', 'items'])); this.loading.set(false); }, error: (err: Error) => { this.error.set(err.message); this.loading.set(false); } }); }
  name(item: unknown): string { return pickString(item, ['name', 'title', 'label'], 'Sem nome'); }
  pick(item: unknown, keys: string[], fallback = ''): string { return pickString(item, keys, fallback); }
  count(item: unknown): number { return pickNumber(item, ['file_count', 'files_count', 'count'], 0); }
  children(item: unknown, keys: string[]): Record<string, unknown>[] { return firstArray<Record<string, unknown>>(item, keys); }
}
