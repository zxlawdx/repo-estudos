import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ErrorMessageComponent],
  template: `
    <main class="min-h-screen grid md:grid-cols-2 bg-background">
      <section class="hidden md:flex flex-col justify-center items-center p-2xl bg-surface-container-low">
        <div class="max-w-md text-center">
          <div class="mb-lg inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary text-on-primary shadow-lg">
            <span class="material-symbols-outlined text-3xl">menu_book</span>
          </div>
          <h1 class="text-headline-lg text-primary mb-md">Repositório de Estudos</h1>
          <p class="text-body-lg text-on-surface-variant">Organize seus materiais por assunto, tipo e contexto.</p>
        </div>
      </section>
      <section class="flex flex-col justify-center items-center p-md md:p-3xl bg-surface-container-lowest">
        <div class="w-full max-w-[400px]">
          <h3 class="text-headline-md mb-xs text-on-surface">Bem-vindo de volta</h3>
          <p class="text-body-md text-on-surface-variant mb-xl">Insira suas credenciais para acessar sua biblioteca.</p>

          <form class="space-y-lg" (ngSubmit)="onSubmit()">
            <div class="space-y-xs">
              <label class="text-label-md text-on-surface-variant block">E-mail</label>
              <input class="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
                     type="email" name="email" [(ngModel)]="email" required placeholder="nome@universidade.edu" />
            </div>
            <div class="space-y-xs">
              <label class="text-label-md text-on-surface-variant block">Senha</label>
              <input class="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
                     type="password" name="password" [(ngModel)]="password" required placeholder="••••••••" />
            </div>

            <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

            <button type="submit" [disabled]="loading()"
                    class="w-full py-4 bg-primary text-on-primary text-label-md rounded-xl hover:bg-opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-60">
              {{ loading() ? 'Entrando...' : 'Acessar Repositório' }}
            </button>
          </form>

          <p class="text-body-md text-on-surface-variant mt-xl text-center">
            Não possui uma conta?
            <a routerLink="/signup" class="text-primary font-bold hover:underline">Solicitar Acesso</a>
          </p>
        </div>
      </section>
    </main>
  `
})
export class LoginPageComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email, this.password).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res && res.ok === false) {
          this.error.set(res.message || 'Falha ao entrar.');
          return;
        }
        this.auth.onLoginSuccess(res.accessToken, res.profile || null);
        this.router.navigate(['/app/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível conectar ao servidor.');
      }
    });
  }
}
