import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ErrorMessageComponent],
  template: `
    <main class="min-h-screen flex items-center justify-center bg-background p-md">
      <div class="w-full max-w-[460px] bg-white border border-outline-variant rounded-3xl p-xl md:p-2xl shadow-sm">
        <div class="mb-lg inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-primary text-white"><span class="material-symbols-outlined text-3xl">person_add</span></div>
        <h2 class="text-headline-md mb-xs text-on-surface">Solicitar acesso</h2>
        <p class="text-body-md text-on-surface-variant mb-xl">Crie sua conta para acessar a biblioteca acadêmica.</p>

        <form class="space-y-lg" (ngSubmit)="onSubmit()">
          <div class="space-y-xs"><label class="text-label-md text-on-surface-variant block">Nome completo</label><input class="form-control" type="text" name="displayName" [(ngModel)]="displayName" required autocomplete="name" /></div>
          <div class="space-y-xs"><label class="text-label-md text-on-surface-variant block">E-mail</label><input class="form-control" type="email" name="email" [(ngModel)]="email" required autocomplete="email" /></div>
          <div class="space-y-xs"><label class="text-label-md text-on-surface-variant block">Senha</label><input class="form-control" type="password" name="password" [(ngModel)]="password" required autocomplete="new-password" /></div>

          <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
          <p *ngIf="success()" class="text-body-sm text-primary bg-primary-fixed rounded-2xl px-4 py-3">{{ success() }}</p>

          <button type="submit" [disabled]="loading()" class="w-full py-4 bg-primary text-on-primary text-label-md rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-60">
            {{ loading() ? 'Enviando...' : 'Criar conta' }}
          </button>
        </form>

        <p class="text-body-md text-on-surface-variant mt-xl text-center">Já tem conta? <a routerLink="/login" class="text-primary font-bold hover:underline">Entrar</a></p>
      </div>
    </main>
  `
})
export class SignupPageComponent {
  displayName = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.auth.signup(this.email.trim(), this.password, this.displayName.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Conta criada. Faça login para continuar.');
        setTimeout(() => this.router.navigate(['/login']), 900);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message || 'Não foi possível criar a conta.');
      }
    });
  }
}
