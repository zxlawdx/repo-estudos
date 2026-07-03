import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { firstArray, pickString } from '../../shared/utils/view.utils';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
<section class="page-shell">
  <app-page-header title="Gerência" subtitle="Usuários, permissões e status. Visível apenas para administradores."></app-page-header>
  <app-error-message *ngIf="!auth.isAdmin()" message="Permissão negada: apenas administradores devem gerenciar usuários."></app-error-message>
  <ng-container *ngIf="auth.isAdmin()">
    <app-loading *ngIf="loading()"></app-loading>
    <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
    <app-empty-state *ngIf="!loading()&&!error()&&!users().length" icon="group" title="Nenhum usuário encontrado" description="O endpoint de gerência respondeu vazio."></app-empty-state>
    <div class="settings-card overflow-x-auto" *ngIf="!loading()&&users().length">
      <table class="w-full text-left text-body-sm">
        <thead><tr class="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase"><th class="py-3">Usuário</th><th class="py-3">E-mail</th><th class="py-3">Papel</th><th class="py-3">Status</th><th class="py-3">Ações</th></tr></thead>
        <tbody>
          <tr *ngFor="let u of users()" class="border-b border-outline-variant">
            <td class="py-3">
              <div class="flex items-center gap-3">
                <img *ngIf="avatar(u); else initials" [src]="avatar(u)" alt="Foto do usuário" class="w-10 h-10 rounded-full object-cover border border-outline-variant" loading="lazy">
                <ng-template #initials><div class="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold">{{ initialsOf(u) }}</div></ng-template>
                <span>{{ pick(u,['display_name','displayName','name'],'Usuário') }}</span>
              </div>
            </td>
            <td class="py-3">{{ pick(u,['email'],'—') }}</td>
            <td class="py-3"><span class="badge badge-secondary">{{ pick(u,['role'],'viewer') }}</span></td>
            <td class="py-3">{{ pick(u,['status'],'active') }}</td>
            <td class="py-3"><button class="btn-secondary">Editar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </ng-container>
</section>`
})
export class AdminUsersPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  users = signal<Record<string, unknown>[]>([]);
  constructor(private admin: AdminService, public auth: AuthService) {}
  ngOnInit(): void {
    if (!this.auth.isAdmin()) { this.loading.set(false); return; }
    this.admin.users().subscribe({
      next: (res) => { this.users.set(firstArray<Record<string, unknown>>(res, ['users', 'items', 'rows'])); this.loading.set(false); },
      error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
    });
  }
  pick(i: unknown, k: string[], f = ''): string { return pickString(i, k, f); }
  avatar(u: unknown): string { return pickString(u, ['avatar_url', 'profilePhotoUrl', 'avatarUrl'], ''); }
  initialsOf(u: unknown): string { return (this.pick(u, ['display_name', 'name'], 'U').trim()[0] || 'U').toUpperCase(); }
}
