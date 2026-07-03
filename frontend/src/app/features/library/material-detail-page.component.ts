import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudyMaterial } from '../../core/models/app.models';
import { FilesService } from '../../core/services/files.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { fileTitle, fileTypeLabel, formatDate, pickString, statusLabel } from '../../shared/utils/view.utils';

@Component({
  selector: 'app-material-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="page-shell">
      <a routerLink="/app/library" class="text-primary text-label-md hover:underline no-underline">&larr; Voltar para biblioteca</a>
      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <article *ngIf="!loading() && material()" class="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-lg mt-lg">
        <section class="settings-card">
          <div class="flex items-start justify-between gap-3 flex-wrap mb-lg">
            <div>
              <div class="flex flex-wrap gap-2 mb-3"><span class="badge badge-secondary">{{ typeLabel() }}</span><span class="badge badge-pending">{{ statusLabelOf() }}</span></div>
              <h2 class="text-headline-md text-on-surface">{{ title() }}</h2>
              <p class="text-body-md text-on-surface-variant">{{ material()?.original_name || material()?.description || 'Metadados do material acadêmico.' }}</p>
            </div>
            <div class="flex gap-2 flex-wrap">
              <a *ngIf="externalUrl()" [href]="externalUrl()" target="_blank" rel="noopener" class="btn-primary no-underline"><span class="material-symbols-outlined text-[18px]">open_in_new</span>Abrir arquivo</a>
              <a [routerLink]="['/app/reader', id()]" class="btn-secondary no-underline"><span class="material-symbols-outlined text-[18px]">chrome_reader_mode</span>Leitor</a>
            </div>
          </div>

          <div class="preview-frame" *ngIf="previewUrl(); else noPreview">
            <iframe [src]="safePreviewUrl()" title="Pré-visualização" loading="lazy"></iframe>
          </div>
          <ng-template #noPreview>
            <div class="empty-state rounded-3xl border border-dashed border-outline-variant"><span class="material-symbols-outlined">visibility_off</span><h3>Prévia indisponível</h3><p>Use o botão abrir arquivo para visualizar no Drive ou no link original.</p></div>
          </ng-template>
        </section>

        <aside class="space-y-lg">
          <section class="settings-card">
            <h3 class="section-title mb-md">Metadados</h3>
            <div class="safe-status-panel">
              <div class="safe-status-row"><span>Autor</span><b>{{ material()?.author || '—' }}</b></div>
              <div class="safe-status-row"><span>Ano</span><b>{{ material()?.year || '—' }}</b></div>
              <div class="safe-status-row"><span>Categoria</span><b>{{ value(['category_name']) || '—' }}</b></div>
              <div class="safe-status-row"><span>Assunto</span><b>{{ value(['subject_name']) || '—' }}</b></div>
              <div class="safe-status-row"><span>Ciclo</span><b>{{ value(['cycle_name']) || '—' }}</b></div>
              <div class="safe-status-row"><span>Visibilidade</span><b>{{ material()?.visibility || '—' }}</b></div>
              <div class="safe-status-row"><span>Criado em</span><b>{{ createdAt() }}</b></div>
            </div>
          </section>
          <section class="settings-card">
            <h3 class="section-title mb-md">Ações</h3>
            <div class="grid gap-2">
              <button class="btn-secondary justify-start"><span class="material-symbols-outlined text-[18px]">edit</span>Editar metadados</button>
              <button class="btn-secondary justify-start"><span class="material-symbols-outlined text-[18px]">route</span>Vincular a trilhas</button>
              <a routerLink="/app/history" class="btn-secondary justify-start no-underline"><span class="material-symbols-outlined text-[18px]">history</span>Histórico</a>
            </div>
          </section>
        </aside>
      </article>
    </section>
  `
})
export class MaterialDetailPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  material = signal<StudyMaterial | null>(null);

  constructor(private route: ActivatedRoute, private files: FilesService, private sanitizer: DomSanitizer) {}
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.files.detail(id).subscribe({
      next: (res) => { this.material.set(res); this.loading.set(false); },
      error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
    });
  }
  id(): string { const m = this.material(); return String(m?.id || m?.material_id || m?.file_id || ''); }
  title(): string { return fileTitle(this.material()); }
  typeLabel(): string { return fileTypeLabel(this.material()?.file_type || this.material()?.type); }
  statusLabelOf(): string { return statusLabel(this.material()?.status); }
  value(keys: string[]): string { return pickString(this.material(), keys); }
  createdAt(): string { return formatDate(this.material()?.created_at); }
  externalUrl(): string { return pickString(this.material(), ['google_drive_url', 'google_drive_preview_url', 'preview_url', 'url']); }
  previewUrl(): string { return pickString(this.material(), ['google_drive_preview_url', 'preview_url', 'url']); }
  safePreviewUrl(): SafeResourceUrl { return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl()); }
}
