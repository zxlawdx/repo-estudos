import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UploadService } from '../../core/services/upload.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-upload-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ErrorMessageComponent],
  template: `
    <section class="page-shell">
      <div class="flex items-end justify-between gap-3 flex-wrap mb-lg"><app-page-header title="Upload" subtitle="Envie arquivos para o Google Drive e cadastre metadados acadêmicos."></app-page-header><a routerLink="/app/link" class="btn-secondary no-underline"><span class="material-symbols-outlined text-[18px]">add_link</span>Cadastrar link</a></div>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <p *ngIf="success()" class="mb-lg text-body-sm text-primary bg-primary-fixed rounded-2xl px-4 py-3">{{ success() }}</p>

      <form class="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-lg" (ngSubmit)="submit()">
        <section class="settings-card">
          <div class="upload-drop" [class.border-primary]="dragging()" (dragover)="onDrag($event, true)" (dragleave)="onDrag($event, false)" (drop)="onDrop($event)">
            <span class="material-symbols-outlined text-6xl text-primary">cloud_upload</span>
            <h3 class="text-headline-sm text-on-surface">Arraste o arquivo aqui</h3>
            <p class="text-body-md text-on-surface-variant">ou escolha um PDF, slide, artigo, livro, prova ou resumo.</p>
            <input type="file" #fileInput class="hidden" (change)="onFileInput($event)" />
            <button type="button" class="btn-primary mt-md" (click)="fileInput.click()">Escolher arquivo</button>
          </div>

          <div *ngIf="file()" class="mt-lg rounded-3xl border border-outline-variant bg-surface-container-low p-lg flex items-center gap-3">
            <span class="material-symbols-outlined text-primary">description</span>
            <div class="min-w-0"><strong class="block truncate">{{ file()?.name }}</strong><span class="text-label-sm text-on-surface-variant">{{ fileSize() }}</span></div>
          </div>
        </section>

        <aside class="settings-card space-y-md h-fit">
          <h3 class="section-title">Metadados</h3>
          <label class="filter-select"><span>Título sugerido/final</span><input class="form-control" [(ngModel)]="title" name="title" placeholder="Nome organizado do material" /></label>
          <label class="filter-select"><span>Autor</span><input class="form-control" [(ngModel)]="author" name="author" /></label>
          <div class="grid grid-cols-2 gap-md"><label class="filter-select"><span>Ano</span><input class="form-control" type="number" [(ngModel)]="year" name="year" /></label><label class="filter-select"><span>Tipo</span><select class="form-control" [(ngModel)]="fileType" name="fileType"><option value="book">Livro</option><option value="article">Artigo</option><option value="slide">Slide</option><option value="test">Prova</option><option value="summary">Resumo</option><option value="video">Vídeo</option></select></label></div>
          <label class="filter-select"><span>Categoria</span><input class="form-control" [(ngModel)]="category" name="category" /></label>
          <label class="filter-select"><span>Assunto</span><input class="form-control" [(ngModel)]="subject" name="subject" /></label>
          <label class="filter-select"><span>Ciclo</span><input class="form-control" [(ngModel)]="cycle" name="cycle" /></label>
          <label class="filter-select"><span>Tags</span><input class="form-control" [(ngModel)]="tags" name="tags" placeholder="java, banco de dados" /></label>
          <label class="filter-select"><span>Visibilidade</span><select class="form-control" [(ngModel)]="visibility" name="visibility"><option value="private">Privado</option><option value="public">Público</option></select></label>
          <label class="filter-select"><span>Observações</span><textarea class="form-control min-h-[96px]" [(ngModel)]="note" name="note"></textarea></label>
          <button type="submit" [disabled]="uploading() || !file()" class="btn-primary w-full justify-center py-3 disabled:opacity-60"><span class="material-symbols-outlined text-[18px]">cloud_upload</span>{{ uploading() ? 'Enviando...' : 'Enviar arquivo' }}</button>
          <div *ngIf="uploading()" class="w-full h-2 rounded-full bg-surface-container-high overflow-hidden"><div class="h-full w-2/3 bg-primary animate-pulse"></div></div>
        </aside>
      </form>
    </section>
  `
})
export class UploadPageComponent {
  file = signal<File | null>(null);
  dragging = signal(false);
  uploading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  title = ''; author = ''; year: number | null = null; fileType = 'book'; category = ''; subject = ''; cycle = ''; tags = ''; visibility = 'private'; note = '';
  constructor(private upload: UploadService, private router: Router) {}
  onDrag(event: DragEvent, value: boolean): void { event.preventDefault(); this.dragging.set(value); }
  onDrop(event: DragEvent): void { event.preventDefault(); this.dragging.set(false); const f = event.dataTransfer?.files?.[0]; if (f) this.setFile(f); }
  onFileInput(event: Event): void { const input = event.target as HTMLInputElement; const f = input.files?.[0]; if (f) this.setFile(f); }
  setFile(file: File): void { this.file.set(file); if (!this.title) this.title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '); }
  fileSize(): string { const size = this.file()?.size || 0; return `${(size / 1024 / 1024).toFixed(2)} MB`; }
  submit(): void {
    const selected = this.file(); if (!selected) return;
    this.uploading.set(true); this.error.set(null); this.success.set(null);
    const form = new FormData();
    form.append('file', selected); form.append('title', this.title); form.append('fileType', this.fileType); form.append('author', this.author); if (this.year) form.append('year', String(this.year));
    form.append('category', this.category); form.append('subject', this.subject); form.append('cycle', this.cycle); form.append('tags', this.tags); form.append('visibility', this.visibility); form.append('note', this.note); form.append('status', 'pending');
    this.upload.upload(form).subscribe({ next: () => { this.uploading.set(false); this.success.set('Upload concluído com sucesso.'); setTimeout(() => this.router.navigate(['/app/library']), 900); }, error: (err: Error) => { this.uploading.set(false); this.error.set(err.message); } });
  }
}
