import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
      <div class="w-full max-w-[420px] bg-surface-container-lowest border border-outline-variant rounded-2xl p-2xl">
        <h3 class="text-headline-md mb-xs text-on-surface">Solicitar acesso</h3>
        <p class="text-body-md text-on-surface-variant mb-xl">Crie sua conta no Repositório de Estudos.</p>

        <form class="space-y-lg" (ngSubmit)="onSubmit()">
          <div class="space-y-xs">
            <label class="text-label-md text-on-surface-variant block">Nome completo</label>
            <input class="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
                   type="text" name="displayName" [(ngModel)]="displayName" required />
          </div>
          <div class="space-y-xs">
            <label class="text-label-md text-on-surface-variant block">E-mail</label>
            <input class="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
                   type="email" name="email" [(ngModel)]="email" required />
          </div>
          <div class="space-y-xs">
            <label class="text-label-md text-on-surface-variant block">Senha</label>
            <input class="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
                   type="password" name="password" [(ngModel)]="password" required />
          </div>

          <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
          <p *ngIf="success()" class="text-body-sm text-primary">{{ success() }}</p>

          <button type="submit" [disabled]="loading()"
                  class="w-full py-4 bg-primary text-on-primary text-label-md rounded-xl hover:bg-opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-60">
            {{ loading() ? 'Enviando...' : 'Criar conta' }}
          </button>
        </form>

        <p class="text-body-md text-on-surface-variant mt-xl text-center">
          Já tem conta? <a routerLink="/login" class="text-primary font-bold hover:underline">Entrar</a>
        </p>
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

  onSubmit() {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.auth.signup(this.email, this.password, this.displayName).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res && res.ok === false) {
          this.error.set(res.message || 'Falha ao criar conta.');
          return;
        }
        this.success.set(res.message || 'Conta criada. Verifique seu e-mail.');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível conectar ao servidor.');
      }
    });
  }
}
