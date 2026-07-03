import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-paths-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-container-max mx-auto w-full">
      <h2 class="text-headline-md text-on-surface mb-md">Trilhas de Estudo</h2>
      <p class="text-body-md text-on-surface-variant mb-xl">Descubra por onde começar e qual material ler depois.</p>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading() && !error() && !paths().length"
                        icon="route" title="Nenhuma trilha criada"
                        description="Crie sua primeira trilha de estudo para organizar a sequência de materiais."></app-empty-state>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg" *ngIf="!loading() && paths().length">
        <a *ngFor="let path of paths()" [routerLink]="['/app/paths', path.id]"
           class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg hover:shadow-md transition-all">
          <span class="material-symbols-outlined text-primary text-3xl mb-2">route</span>
          <h3 class="text-headline-sm text-on-surface mb-1">{{ path.title }}</h3>
          <p class="text-body-sm text-on-surface-variant">{{ path.description || '' }}</p>
        </a>
      </div>
    </section>
  `
})
export class PathsPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  paths = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/paths').subscribe({
      next: (res) => {
        this.paths.set(Array.isArray(res) ? res : res?.paths || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar as trilhas.');
        this.loading.set(false);
      }
    });
  }
}
