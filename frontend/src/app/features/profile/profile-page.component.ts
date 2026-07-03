import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-2xl mx-auto w-full">
      <h2 class="text-headline-md text-on-surface mb-xl">Meu Perfil</h2>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <div *ngIf="!loading() && !error()" class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md">
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-surface-variant">Nome de exibição</label>
          <input class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2" [(ngModel)]="displayName" name="displayName" />
        </div>
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-surface-variant">Foto de perfil</label>
          <input type="file" (change)="onPhotoSelected($event)" accept="image/*" />
        </div>

        <p *ngIf="success()" class="text-body-sm text-primary">{{ success() }}</p>

        <button (click)="save()" [disabled]="saving()" class="bg-primary text-on-primary px-lg py-2 rounded-xl text-label-md hover:opacity-90 disabled:opacity-60">
          {{ saving() ? 'Salvando...' : 'Salvar alterações' }}
        </button>
      </div>

      <div *ngIf="!loading() && stats()" class="mt-xl bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
        <h3 class="text-headline-sm mb-md">Minhas estatísticas</h3>
        <pre class="text-body-sm text-on-surface-variant whitespace-pre-wrap">{{ stats() | json }}</pre>
      </div>
    </section>
  `
})
export class ProfilePageComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  displayName = '';
  stats = signal<any | null>(null);
  private photoFile: File | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/profile/me').subscribe({
      next: (res) => {
        this.displayName = res?.display_name || '';
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o perfil.');
        this.loading.set(false);
      }
    });
    this.api.get<any>('/profile/stats').subscribe({ next: (res) => this.stats.set(res) });
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.photoFile = input.files?.[0] || null;
  }

  save() {
    this.saving.set(true);
    this.success.set(null);
    this.api.put<any>('/profile/me', { display_name: this.displayName }).subscribe({
      next: () => {
        if (this.photoFile) {
          const formData = new FormData();
          formData.append('file', this.photoFile);
          this.api.postForm('/profile/photo', formData).subscribe({
            next: () => {
              this.saving.set(false);
              this.success.set('Perfil atualizado com sucesso.');
            },
            error: () => {
              this.saving.set(false);
              this.success.set('Perfil atualizado, mas a foto falhou.');
            }
          });
        } else {
          this.saving.set(false);
          this.success.set('Perfil atualizado com sucesso.');
        }
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Não foi possível salvar o perfil.');
      }
    });
  }
}
