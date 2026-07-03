import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

interface DashboardData {
  stats?: { total?: number; pending?: number; inProgress?: number };
  recents?: any[];
  paths?: any[];
  profile?: { display_name?: string };
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-container-max mx-auto w-full">
      <div class="mb-xl">
        <h2 class="text-headline-md text-on-surface">Dashboard Principal</h2>
        <p class="text-body-md text-on-surface-variant">
          Bem-vindo{{ data()?.profile?.display_name ? ', ' + data()?.profile?.display_name : '' }} de volta ao seu santuário de estudos.
        </p>
      </div>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <ng-container *ngIf="!loading() && !error()">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
          <div class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex items-center gap-lg">
            <div class="p-4 rounded-full bg-primary/10 text-primary">
              <span class="material-symbols-outlined text-3xl">description</span>
            </div>
            <div>
              <span class="text-label-sm text-on-surface-variant">Total de arquivos</span>
              <h3 class="text-headline-md text-on-surface">{{ data()?.stats?.total ?? 0 }}</h3>
            </div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex items-center gap-lg">
            <div class="p-4 rounded-full bg-tertiary/10 text-tertiary">
              <span class="material-symbols-outlined text-3xl">pending_actions</span>
            </div>
            <div>
              <span class="text-label-sm text-on-surface-variant">Pendentes de revisão</span>
              <h3 class="text-headline-md text-on-surface">{{ data()?.stats?.pending ?? 0 }}</h3>
            </div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex items-center gap-lg">
            <div class="p-4 rounded-full bg-error-container/40 text-error">
              <span class="material-symbols-outlined text-3xl">auto_stories</span>
            </div>
            <div>
              <span class="text-label-sm text-on-surface-variant">Em progresso</span>
              <h3 class="text-headline-md text-on-surface">{{ data()?.stats?.inProgress ?? 0 }}</h3>
            </div>
          </div>
        </div>

        <section class="mb-xl">
          <div class="flex items-center justify-between mb-md">
            <h3 class="text-headline-sm text-on-surface">Adicionados Recentemente</h3>
            <a routerLink="/app/library" class="text-primary text-label-md hover:underline">Ver todos</a>
          </div>
          <div *ngIf="!data()?.recents?.length">
            <p class="text-body-sm text-on-surface-variant">Sem dados.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            <div *ngFor="let item of data()?.recents" class="bg-surface-container-lowest border border-outline-variant rounded-xl p-md hover:shadow-md transition-all">
              <h4 class="text-label-md font-bold mb-1 line-clamp-1">{{ item.final_name || item.suggested_name || item.original_name }}</h4>
              <p class="text-body-sm text-on-surface-variant">{{ item.file_type }} • {{ item.status }}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 class="text-headline-sm text-on-surface mb-md">Trilhas Públicas</h3>
          <div *ngIf="!data()?.paths?.length">
            <p class="text-body-sm text-on-surface-variant">Sem dados.</p>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-md">
            <a *ngFor="let path of data()?.paths" routerLink="/app/paths" class="bg-surface-container-lowest border border-outline-variant p-md rounded-xl text-center hover:bg-secondary-container transition-colors">
              <span class="material-symbols-outlined text-primary mb-2 text-3xl">route</span>
              <p class="text-label-md text-on-surface truncate">{{ path.title }}</p>
            </a>
          </div>
        </section>
      </ng-container>
    </section>
  `
})
export class DashboardPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<DashboardData | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<DashboardData>('/dashboard/summary').subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o dashboard.');
        this.loading.set(false);
      }
    });
  }
}
