import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-container-max mx-auto w-full">
      <h2 class="text-headline-md text-on-surface mb-xl">Gestão de Usuários</h2>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading() && !error() && !users().length"
                        icon="group" title="Nenhum usuário encontrado"
                        description="Não há usuários cadastrados para gerenciar no momento."></app-empty-state>

      <table class="w-full text-left text-body-sm" *ngIf="!loading() && users().length">
        <thead>
          <tr class="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase">
            <th class="py-2">Nome</th>
            <th class="py-2">E-mail</th>
            <th class="py-2">Papel</th>
            <th class="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users()" class="border-b border-outline-variant">
            <td class="py-2">{{ u.display_name }}</td>
            <td class="py-2">{{ u.email }}</td>
            <td class="py-2">{{ u.role }}</td>
            <td class="py-2">{{ u.status }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `
})
export class AdminUsersPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  users = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('/admin-proxy/users').subscribe({
      next: (res) => {
        this.users.set(Array.isArray(res) ? res : res?.users || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os usuários (permissão de administrador necessária).');
        this.loading.set(false);
      }
    });
  }
}
