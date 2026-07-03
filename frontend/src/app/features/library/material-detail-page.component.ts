import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-material-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-3xl mx-auto w-full">
      <a routerLink="/app/library" class="text-primary text-label-md hover:underline">&larr; Voltar para biblioteca</a>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <div *ngIf="!loading() && !error() && file() as f" class="mt-lg space-y-lg">
        <h2 class="text-headline-lg text-on-surface">{{ f.final_name || f.suggested_name || f.original_name }}</h2>

        <div class="grid grid-cols-2 gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
          <div><label class="text-xs text-outline block mb-1">Autor</label><p>{{ f.author || '—' }}</p></div>
          <div><label class="text-xs text-outline block mb-1">Ano</label><p>{{ f.year || '—' }}</p></div>
          <div><label class="text-xs text-outline block mb-1">Tipo</label><p>{{ f.file_type || '—' }}</p></div>
          <div><label class="text-xs text-outline block mb-1">Status</label><p>{{ f.status || '—' }}</p></div>
        </div>

        <div class="flex gap-sm" *ngIf="f.previewUrl || f.downloadUrl">
          <a *ngIf="f.previewUrl" [href]="f.previewUrl" target="_blank" class="bg-primary text-on-primary px-lg py-2 rounded-xl text-label-md">Abrir</a>
          <a *ngIf="f.downloadUrl" [href]="f.downloadUrl" target="_blank" class="border border-outline-variant px-lg py-2 rounded-xl text-label-md">Baixar</a>
        </div>
      </div>
    </section>
  `
})
export class MaterialDetailPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  file = signal<any | null>(null);

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Material não encontrado.');
      this.loading.set(false);
      return;
    }
    this.api.get<any>(`/files/${id}`).subscribe({
      next: (res) => {
        this.file.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o material.');
        this.loading.set(false);
      }
    });
  }
}
