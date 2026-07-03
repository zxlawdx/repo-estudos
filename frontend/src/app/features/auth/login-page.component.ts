import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ErrorMessageComponent],
  template: `
    <main class="min-h-screen grid lg:grid-cols-[1.08fr_.92fr] bg-background">
      <section class="hidden lg:flex flex-col justify-center p-3xl bg-gradient-to-br from-primary-fixed via-white to-secondary-container border-r border-outline-variant">
        <div class="max-w-xl">
          <div class="mb-lg inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-on-primary shadow-lg">
            <span class="material-symbols-outlined text-4xl">menu_book</span>
          </div>
          <h1 class="text-headline-lg text-primary mb-md">Repositório de Estudos</h1>
          <p class="text-body-lg text-on-surface-variant mb-xl">Biblioteca acadêmica, trilhas de estudo, revisão, relações e grafo em um só lugar.</p>
          <div class="grid grid-cols-2 gap-md">
            <div class="bg-white/80 rounded-3xl p-lg border border-outline-variant"><span class="material-symbols-outlined text-primary">library_books</span><strong class="block mt-2">Biblioteca organizada</strong><p class="text-body-sm text-on-surface-variant">PDFs, links, vídeos e materiais.</p></div>
            <div class="bg-white/80 rounded-3xl p-lg border border-outline-variant"><span class="material-symbols-outlined text-primary">hub</span><strong class="block mt-2">Grafo e trilhas</strong><p class="text-body-sm text-on-surface-variant">Dependências e progresso visual.</p></div>
          </div>
        </div>
      </section>

      <section class="flex flex-col justify-center items-center p-md md:p-3xl bg-white">
        <div class="w-full max-w-[420px]">
          <div class="lg:hidden mb-xl text-center">
            <div class="mx-auto mb-md inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-primary text-white"><span class="material-symbols-outlined text-3xl">menu_book</span></div>
            <h1 class="text-headline-md text-primary">Repositório de Estudos</h1>
          </div>
          <h2 class="text-headline-md mb-xs text-on-surface">Bem-vindo de volta</h2>
          <p class="text-body-md text-on-surface-variant mb-xl">Entre com seu e-mail e senha. O login usa Supabase Auth via Apps Script pelo backend.</p>

          <form class="space-y-lg" (ngSubmit)="onSubmit()">
            <div class="space-y-xs">
              <label class="text-label-md text-on-surface-variant block">E-mail</label>
              <input class="form-control" type="email" name="email" [(ngModel)]="email" required autocomplete="email" placeholder="nome@email.com" />
            </div>
            <div class="space-y-xs">
              <label class="text-label-md text-on-surface-variant block">Senha</label>
              <input class="form-control" type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" placeholder="••••••••" />
            </div>

            <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

            <button type="submit" [disabled]="loading()" class="w-full py-4 bg-primary text-on-primary text-label-md rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-60">
              {{ loading() ? 'Entrando...' : 'Acessar repositório' }}
            </button>
          </form>

          <p class="text-body-md text-on-surface-variant mt-xl text-center">
            Não possui uma conta?
            <a routerLink="/signup" class="text-primary font-bold hover:underline">Solicitar acesso</a>
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

  onSubmit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/app/dashboard']);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message || 'Não foi possível conectar ao servidor.');
      }
    });
  }
}
