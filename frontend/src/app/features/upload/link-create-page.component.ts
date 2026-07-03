import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-link-create-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ErrorMessageComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-2xl mx-auto w-full">
      <h2 class="text-headline-md text-on-surface mb-md">Cadastrar Link / YouTube</h2>
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md">
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-surface-variant">URL</label>
          <input class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2" [(ngModel)]="url" name="url" placeholder="https://..." />
        </div>
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-surface-variant">Título (opcional)</label>
          <input class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2" [(ngModel)]="title" name="title" />
        </div>

        <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
        <p *ngIf="success()" class="text-body-sm text-primary">{{ success() }}</p>

        <button (click)="submit()" [disabled]="loading() || !url"
                class="w-full bg-primary text-on-primary py-3 rounded-xl text-label-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60">
          {{ loading() ? 'Salvando...' : 'Cadastrar material' }}
        </button>
      </div>
    </section>
  `
})
export class LinkCreatePageComponent {
  url = '';
  title = '';
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  constructor(private api: ApiService, private router: Router) {}

  submit() {
    this.loading.set(true);
    this.error.set(null);
    this.api.post<any>('/files/link', { url: this.url, title: this.title }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.ok === false) {
          this.error.set(res.error || 'Falha ao cadastrar link.');
          return;
        }
        this.success.set('Material cadastrado com sucesso.');
        setTimeout(() => this.router.navigate(['/app/library']), 1000);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível cadastrar o link.');
      }
    });
  }
}
