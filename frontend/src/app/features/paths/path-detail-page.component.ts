import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-path-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-2xl mx-auto w-full">
      <a routerLink="/app/paths" class="text-primary text-label-md hover:underline">&larr; Voltar para trilhas</a>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <div *ngIf="!loading() && !error() && detail() as d" class="mt-lg">
        <h2 class="text-headline-lg text-on-surface mb-2">{{ d.title }}</h2>
        <p class="text-body-md text-on-surface-variant mb-xl">{{ d.description }}</p>

        <div class="flex flex-col gap-md">
          <article *ngFor="let item of d.items; let i = index" class="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
            <div class="flex justify-between items-start mb-sm">
              <span class="px-sm py-xs bg-surface-variant text-on-surface-variant rounded text-[10px] uppercase font-bold">{{ item.file_type || 'material' }}</span>
              <span class="px-sm py-[2px] bg-secondary-container text-on-secondary-container rounded-full text-[11px] font-semibold" *ngIf="i === 0">Comece aqui</span>
            </div>
            <h3 class="text-headline-sm mb-1">{{ item.title || item.final_name }}</h3>
            <p class="text-body-sm text-on-surface-variant">{{ item.status || 'não iniciado' }}</p>
          </article>
        </div>
      </div>
    </section>
  `
})
export class PathDetailPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  detail = signal<any | null>(null);

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Trilha não encontrada.');
      this.loading.set(false);
      return;
    }
    this.api.get<any>(`/paths/${id}`).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar a trilha.');
        this.loading.set(false);
      }
    });
  }
}
