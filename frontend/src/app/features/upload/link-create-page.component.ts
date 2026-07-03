import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UploadService } from '../../core/services/upload.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-link-create-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ErrorMessageComponent],
  template: `
    <section class="page-shell">
      <div class="flex items-end justify-between gap-3 flex-wrap mb-lg"><app-page-header title="Cadastrar por link" subtitle="Cadastre YouTube, playlists, artigos e links externos sem alterar o armazenamento físico."></app-page-header><a routerLink="/app/upload" class="btn-secondary no-underline"><span class="material-symbols-outlined text-[18px]">upload_file</span>Upload de arquivo</a></div>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <p *ngIf="success()" class="mb-lg text-body-sm text-primary bg-primary-fixed rounded-2xl px-4 py-3">{{ success() }}</p>
      <form class="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-lg" (ngSubmit)="submit()">
        <section class="settings-card">
          <h3 class="section-title mb-md">Link do material</h3>
          <label class="filter-select"><span>URL</span><input class="form-control" type="url" [(ngModel)]="url" name="url" required placeholder="https://www.youtube.com/watch?v=..." /></label>
          <button type="button" class="btn-secondary mt-md" (click)="preview()"><span class="material-symbols-outlined text-[18px]">visibility</span>Pré-visualizar</button>
          <div class="mt-lg link-preview-panel" *ngIf="url.trim()">
            <span class="badge badge-secondary">{{ typeLabel() }}</span>
            <h4 class="text-headline-sm text-on-surface mt-3">{{ title || 'Título será definido por você ou pela API' }}</h4>
            <p class="text-body-sm text-on-surface-variant break-all">{{ url }}</p>
          </div>
        </section>
        <aside class="settings-card h-fit space-y-md">
          <h3 class="section-title">Informações</h3>
          <label class="filter-select"><span>Título</span><input class="form-control" [(ngModel)]="title" name="title" /></label>
          <label class="filter-select"><span>Canal/Autor</span><input class="form-control" [(ngModel)]="author" name="author" /></label>
          <div class="grid grid-cols-2 gap-md"><label class="filter-select"><span>Ano</span><input class="form-control" type="number" [(ngModel)]="year" name="year" /></label><label class="filter-select"><span>Tipo</span><select class="form-control" [(ngModel)]="fileType" name="fileType"><option value="auto">Detectar</option><option value="video">Vídeo</option><option value="playlist">Playlist</option><option value="article">Artigo externo</option><option value="external_link">Link externo</option></select></label></div>
          <label class="filter-select"><span>Área do conhecimento</span><input class="form-control" [(ngModel)]="category" name="category" /></label>
          <label class="filter-select"><span>Assunto</span><input class="form-control" [(ngModel)]="subject" name="subject" /></label>
          <label class="filter-select"><span>Tags</span><input class="form-control" [(ngModel)]="tags" name="tags" /></label>
          <button type="submit" [disabled]="saving()" class="btn-primary w-full justify-center py-3"><span class="material-symbols-outlined text-[18px]">add_link</span>{{ saving() ? 'Cadastrando...' : 'Cadastrar material' }}</button>
        </aside>
      </form>
    </section>
  `
})
export class LinkCreatePageComponent {
  url = ''; title = ''; author = ''; year: number | null = null; fileType = 'auto'; category = ''; subject = ''; tags = '';
  saving = signal(false); error = signal<string | null>(null); success = signal<string | null>(null);
  constructor(private upload: UploadService, private router: Router) {}
  preview(): void { if (!this.title && this.url) this.title = this.url.replace(/^https?:\/\//, '').split('/')[0]; }
  typeLabel(): string { return this.fileType === 'auto' ? 'Detecção automática' : this.fileType.replace('_', ' '); }
  submit(): void {
    this.saving.set(true); this.error.set(null); this.success.set(null);
    this.upload.createLink({ url: this.url, title: this.title, author: this.author, year: this.year, fileType: this.fileType, category: this.category, subject: this.subject, tags: this.tags }).subscribe({
      next: () => { this.saving.set(false); this.success.set('Link cadastrado com sucesso.'); setTimeout(() => this.router.navigate(['/app/library']), 900); },
      error: (err: Error) => { this.saving.set(false); this.error.set(err.message); }
    });
  }
}
