import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [CommonModule, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-container-max mx-auto w-full">
      <div class="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h2 class="text-headline-md text-on-surface mb-2">Categorias de Estudo</h2>
          <p class="text-body-md text-on-surface-variant">Explore seu acervo organizado por áreas de conhecimento.</p>
        </div>
      </div>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading() && !error() && !categories().length"
                        icon="category" title="Nenhuma categoria cadastrada"
                        description="Crie categorias para organizar seus materiais de estudo."></app-empty-state>

      <div class="bento-grid" *ngIf="!loading() && categories().length">
        <div *ngFor="let cat of categories()" class="folder-transition bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden cursor-pointer">
          <div class="p-md border-b border-outline-variant flex justify-between items-start">
            <div class="p-3 bg-primary-container rounded-xl text-on-primary-container">
              <span class="material-symbols-outlined">folder</span>
            </div>
            <span class="text-label-sm px-2 py-1 bg-surface-container-high rounded text-on-surface-variant">{{ cat.file_count ?? 0 }} arquivos</span>
          </div>
          <div class="p-md">
            <h3 class="text-headline-sm mb-1">{{ cat.name }}</h3>
            <p class="text-body-sm text-on-surface-variant">{{ cat.description || '' }}</p>
          </div>
        </div>

        <div class="folder-transition bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xl cursor-pointer hover:border-primary transition-all">
          <span class="material-symbols-outlined text-[32px] text-on-surface-variant mb-2">add_circle</span>
          <span class="text-headline-sm text-on-surface-variant">Nova Categoria</span>
        </div>
      </div>
    </section>
  `
})
export class CategoriesPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  categories = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/categories/tree').subscribe({
      next: (res) => {
        this.categories.set(Array.isArray(res) ? res : res?.categories || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar as categorias.');
        this.loading.set(false);
      }
    });
  }
}
