import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-container-max mx-auto w-full">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
        <div>
          <h2 class="text-headline-md text-on-surface">Minha Biblioteca</h2>
          <p class="text-body-md text-on-surface-variant">Todos os materiais de estudo disponíveis.</p>
        </div>
        <a routerLink="/app/upload" class="flex items-center gap-2 bg-primary text-on-primary px-lg py-2 rounded-xl text-label-md hover:opacity-90 transition-opacity">
          <span class="material-symbols-outlined text-[20px]">add</span>
          Novo material
        </a>
      </div>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading() && !error() && !files().length"
                        icon="folder_open" title="Nenhum material encontrado"
                        description="Faça upload de um novo material ou ajuste os filtros de busca."></app-empty-state>

      <div class="bento-grid" *ngIf="!loading() && files().length">
        <div *ngFor="let file of files()" class="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col h-full folder-transition">
          <div class="flex justify-between items-start mb-md">
            <span class="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded uppercase">{{ file.file_type || 'arquivo' }}</span>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                  [class.bg-green-100]="file.status === 'approved'" [class.text-green-700]="file.status === 'approved'"
                  [class.bg-amber-100]="file.status === 'pending'" [class.text-amber-700]="file.status === 'pending'">
              {{ file.status || 'pendente' }}
            </span>
          </div>
          <h3 class="text-headline-sm text-on-surface leading-tight mb-1">{{ file.final_name || file.suggested_name || file.original_name }}</h3>
          <p class="text-body-sm text-outline italic mb-md">{{ file.original_name }}</p>
          <div class="mt-auto flex gap-sm">
            <a [routerLink]="['/app/library', file.id]" class="flex-1 bg-primary text-on-primary py-2 rounded-lg text-label-md text-center hover:opacity-90 transition-opacity">Abrir</a>
          </div>
        </div>
      </div>
    </section>
  `
})
export class LibraryPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  files = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/files').subscribe({
      next: (res) => {
        this.files.set(Array.isArray(res) ? res : res?.files || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar a biblioteca.');
        this.loading.set(false);
      }
    });
  }
}
