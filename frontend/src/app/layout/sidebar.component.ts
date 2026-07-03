import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { pickString } from '../shared/utils/view.utils';

interface NavItem { path: string; icon: string; label: string; adminOnly?: boolean; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-white border-r border-outline-variant py-md z-50 shadow-sm">
      <div class="px-lg mb-lg">
        <div class="inline-flex items-center gap-2 rounded-2xl bg-primary-fixed px-3 py-2 mb-3">
          <span class="material-symbols-outlined text-primary">menu_book</span>
          <strong class="text-primary">Repositório</strong>
        </div>
        <p class="text-label-sm text-on-surface-variant uppercase tracking-wider">Estudos Acadêmicos</p>
      </div>

      <a routerLink="/app/profile" class="mx-4 mb-md flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 hover:bg-surface-container-low transition">
        <span class="w-10 h-10 rounded-2xl bg-secondary-container text-primary flex items-center justify-center overflow-hidden font-bold">
          <img *ngIf="avatar()" [src]="avatar()" alt="Avatar" class="w-full h-full object-cover" />
          <span *ngIf="!avatar()">{{ initials() }}</span>
        </span>
        <span class="min-w-0">
          <strong class="block text-label-md text-on-surface truncate">{{ displayName() }}</strong>
          <span class="block text-label-sm text-on-surface-variant truncate">{{ role() }}</span>
        </span>
      </a>

      <nav class="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
        <a *ngFor="let item of visibleItems()" [routerLink]="item.path" routerLinkActive="bg-secondary-container text-primary font-bold border-l-4 border-primary"
           [routerLinkActiveOptions]="{exact: false}"
           class="flex items-center gap-3 rounded-r-2xl px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <span class="material-symbols-outlined">{{ item.icon }}</span>
          <span class="text-label-md">{{ item.label }}</span>
        </a>
      </nav>

      <div class="px-2 pt-2 mt-auto space-y-1 border-t border-outline-variant">
        <a routerLink="/app/profile" routerLinkActive="bg-secondary-container text-primary font-bold border-l-4 border-primary"
           class="flex items-center gap-3 rounded-r-2xl px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <span class="material-symbols-outlined">account_circle</span><span class="text-label-md">Meu perfil</span>
        </a>
        <a routerLink="/app/settings" routerLinkActive="bg-secondary-container text-primary font-bold border-l-4 border-primary"
           class="flex items-center gap-3 rounded-r-2xl px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <span class="material-symbols-outlined">settings</span><span class="text-label-md">Configurações</span>
        </a>
        <button type="button" (click)="auth.logout()" class="w-full flex items-center gap-3 rounded-r-2xl px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <span class="material-symbols-outlined">logout</span><span class="text-label-md">Sair</span>
        </button>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  constructor(public auth: AuthService) {}

  items: NavItem[] = [
    { path: '/app/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/app/library', icon: 'library_books', label: 'Biblioteca' },
    { path: '/app/upload', icon: 'upload_file', label: 'Upload' },
    { path: '/app/review', icon: 'rate_review', label: 'Revisão' },
    { path: '/app/paths', icon: 'route', label: 'Trilhas' },
    { path: '/app/categories', icon: 'category', label: 'Categorias' },
    { path: '/app/history', icon: 'history', label: 'Histórico' },
    { path: '/app/graph', icon: 'hub', label: 'Grafo' },
    { path: '/app/relations', icon: 'account_tree', label: 'Relações' },
    { path: '/app/reviews', icon: 'reviews', label: 'Resenhas' },
    { path: '/app/admin/users', icon: 'admin_panel_settings', label: 'Gerência', adminOnly: true }
  ];

  visibleItems = computed(() => this.items.filter((item) => !item.adminOnly || this.auth.isAdmin()));
  displayName = computed(() => pickString(this.auth.profile(), ['display_name', 'displayName', 'name', 'email'], 'Usuário'));
  role = computed(() => pickString(this.auth.profile(), ['role'], 'viewer'));
  avatar = computed(() => pickString(this.auth.profile(), ['avatar_url', 'profilePhotoUrl'], ''));
  initials = computed(() => this.displayName().trim().charAt(0).toUpperCase() || 'U');
}
