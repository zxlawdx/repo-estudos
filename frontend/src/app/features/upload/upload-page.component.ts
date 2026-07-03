import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-upload-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ErrorMessageComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-container-max mx-auto w-full">
      <div class="mb-lg">
        <h2 class="text-headline-md text-on-surface">Upload de Materiais</h2>
        <p class="text-body-md text-on-surface-variant">Adicione novos estudos, PDFs ou documentos ao repositório.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div class="lg:col-span-2 flex flex-col gap-lg">
          <div class="min-h-[280px] border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-lowest flex flex-col items-center justify-center p-xl hover:border-primary transition-all"
               (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
            <div class="w-20 h-20 bg-primary-fixed rounded-full flex items-center justify-center mb-md">
              <span class="material-symbols-outlined text-primary text-4xl">upload_file</span>
            </div>
            <h3 class="text-headline-sm text-on-surface mb-2">{{ selectedFile()?.name || 'Arraste seus arquivos aqui' }}</h3>
            <p class="text-body-md text-on-surface-variant mb-lg text-center max-w-xs">PDF, DOCX, EPUB, PPT, imagens (máx. 50MB).</p>
            <label class="border border-primary text-primary px-lg py-sm rounded-xl text-label-md hover:bg-primary hover:text-on-primary transition-all cursor-pointer">
              Selecionar arquivo
              <input type="file" class="hidden" (change)="onFileSelected($event)" />
            </label>
          </div>
        </div>

        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg h-fit flex flex-col gap-lg">
          <h4 class="text-headline-sm">Informações</h4>
          <div class="space-y-md">
            <div class="flex flex-col gap-xs">
              <label class="text-label-sm text-on-surface-variant">Título</label>
              <input class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2" [(ngModel)]="title" name="title" />
            </div>
            <div class="flex flex-col gap-xs">
              <label class="text-label-sm text-on-surface-variant">Autor</label>
              <input class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2" [(ngModel)]="author" name="author" />
            </div>
            <div class="flex flex-col gap-xs">
              <label class="text-label-sm text-on-surface-variant">Ano</label>
              <input type="number" class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2" [(ngModel)]="year" name="year" />
            </div>
            <div class="flex flex-col gap-xs">
              <label class="text-label-sm text-on-surface-variant">Visibilidade</label>
              <select class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2" [(ngModel)]="visibility" name="visibility">
                <option value="public">Público</option>
                <option value="private">Privado</option>
              </select>
            </div>
            <div class="flex flex-col gap-xs">
              <label class="text-label-sm text-on-surface-variant">Nota interna</label>
              <textarea class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2" rows="3" [(ngModel)]="note" name="note"></textarea>
            </div>
          </div>

          <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
          <p *ngIf="success()" class="text-body-sm text-primary">{{ success() }}</p>

          <button (click)="submit()" [disabled]="uploading() || !selectedFile()"
                  class="w-full bg-primary text-on-primary py-3 rounded-xl text-label-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60">
            {{ uploading() ? 'Enviando...' : 'Finalizar e Salvar' }}
          </button>
        </div>
      </div>
    </section>
  `
})
export class UploadPageComponent {
  selectedFile = signal<File | null>(null);
  title = '';
  author = '';
  year: number | null = null;
  visibility = 'public';
  note = '';
  uploading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  constructor(private api: ApiService, private router: Router) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) this.selectedFile.set(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.selectedFile.set(file);
  }

  submit() {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
    this.success.set(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('finalName', file.name);
    if (this.title) formData.append('title', this.title);
    if (this.author) formData.append('author', this.author);
    if (this.year) formData.append('year', String(this.year));
    formData.append('visibility', this.visibility);
    if (this.note) formData.append('note', this.note);
    formData.append('status', 'pending');

    this.api.postForm<any>('/files/upload', formData).subscribe({
      next: (res) => {
        this.uploading.set(false);
        if (res && res.ok === false) {
          this.error.set(res.error || 'Falha ao enviar o arquivo.');
          return;
        }
        this.success.set('Upload concluído com sucesso.');
        setTimeout(() => this.router.navigate(['/app/library']), 1200);
      },
      error: () => {
        this.uploading.set(false);
        this.error.set('Não foi possível enviar o arquivo.');
      }
    });
  }
}
