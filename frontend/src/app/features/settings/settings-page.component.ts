import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="p-lg md:p-2xl max-w-2xl mx-auto w-full">
      <h2 class="text-headline-md text-on-surface mb-xl">Configurações</h2>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md">
        <h3 class="text-headline-sm mb-md">Status do sistema</h3>
        <div class="flex items-center justify-between">
          <span class="text-body-sm text-on-surface-variant">Google Drive</span>
          <span class="px-3 py-1 rounded-full text-label-sm"
                [class.bg-green-100]="driveOk()" [class.text-green-700]="driveOk()"
                [class.bg-error-container]="driveOk() === false" [class.text-error]="driveOk() === false">
            {{ driveOk() === null ? 'Verificando...' : (driveOk() ? 'Conectado' : 'Indisponível') }}
          </span>
        </div>
        <p class="text-body-sm text-on-surface-variant">Nenhuma chave sensível é exibida nesta tela.</p>
      </div>

      <div class="mt-xl">
        <button (click)="logout()" class="border border-error text-error px-lg py-2 rounded-xl text-label-md hover:bg-error/5 transition-all">
          Sair da conta
        </button>
      </div>
    </section>
  `
})
export class SettingsPageComponent implements OnInit {
  driveOk = signal<boolean | null>(null);

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.api.get<any>('/drive/health').subscribe({
      next: (res) => this.driveOk.set(!!(res && res.ok !== false)),
      error: () => this.driveOk.set(false)
    });
  }

  logout() {
    this.auth.logout();
  }
}
