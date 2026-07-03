import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem { path: string; icon: string; label: string; adminOnly?: boolean; }

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-outline-variant shadow-xl rounded-t-3xl flex justify-around items-center px-2 py-2 safe-area-bottom" aria-label="Navegação principal">
      <a *ngFor="let item of mainItems" [routerLink]="item.path" routerLinkActive="bg-primary-container text-on-primary-container rounded-2xl"
         class="min-w-0 flex-1 flex flex-col items-center justify-center text-on-surface-variant px-2 py-1.5 transition active:scale-95">
        <span class="material-symbols-outlined">{{ item.icon }}</span>
        <span class="text-[11px] font-semibold truncate">{{ item.label }}</span>
      </a>
      <button type="button" (click)="toggleMore()" [class.bg-primary-container]="moreOpen()" [class.text-on-primary-container]="moreOpen()"
              class="min-w-0 flex-1 flex flex-col items-center justify-center text-on-surface-variant px-2 py-1.5 rounded-2xl transition active:scale-95">
        <span class="material-symbols-outlined">apps</span>
        <span class="text-[11px] font-semibold">Mais</span>
      </button>
    </nav>

    <div *ngIf="moreOpen()" class="md:hidden fixed inset-0 z-40 bg-black/30" (click)="toggleMore(false)"></div>
    <section *ngIf="moreOpen()" class="md:hidden fixed left-3 right-3 bottom-[86px] z-50 bg-white border border-outline-variant rounded-3xl shadow-2xl p-4 safe-area-bottom">
      <div class="w-12 h-1 rounded-full bg-outline-variant mx-auto mb-3"></div>
      <div class="flex items-center justify-between mb-3">
        <strong class="text-on-surface">Mais telas</strong>
        <button type="button" (click)="toggleMore(false)" class="p-2 rounded-xl hover:bg-surface-container-low"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <a *ngFor="let item of moreItems()" [routerLink]="item.path" (click)="toggleMore(false)" class="flex items-center gap-2 rounded-2xl border border-outline-variant p-3 text-label-md text-on-surface-variant hover:bg-surface-container-low">
          <span class="material-symbols-outlined text-primary">{{ item.icon }}</span>{{ item.label }}
        </a>
      </div>
    </section>
  `
})
export class BottomNavComponent {
  moreOpen = signal(false);
  constructor(private auth: AuthService) {}

  mainItems: NavItem[] = [
    { path: '/app/dashboard', icon: 'home', label: 'Dashboard' },
    { path: '/app/library', icon: 'book', label: 'Biblioteca' },
    { path: '/app/upload', icon: 'add_circle', label: 'Upload' },
    { path: '/app/paths', icon: 'route', label: 'Trilhas' }
  ];

  allMore: NavItem[] = [
    { path: '/app/link', icon: 'add_link', label: 'Cadastrar link' },
    { path: '/app/review', icon: 'rate_review', label: 'Revisão' },
    { path: '/app/categories', icon: 'category', label: 'Categorias' },
    { path: '/app/history', icon: 'history', label: 'Histórico' },
    { path: '/app/graph', icon: 'hub', label: 'Grafo' },
    { path: '/app/relations', icon: 'account_tree', label: 'Relações' },
    { path: '/app/reviews', icon: 'reviews', label: 'Resenhas' },
    { path: '/app/profile', icon: 'account_circle', label: 'Perfil' },
    { path: '/app/settings', icon: 'settings', label: 'Configurações' },
    { path: '/app/admin/users', icon: 'admin_panel_settings', label: 'Gerência', adminOnly: true }
  ];
  moreItems = computed(() => this.allMore.filter((item) => !item.adminOnly || this.auth.isAdmin()));

  toggleMore(force?: boolean): void { this.moreOpen.set(typeof force === 'boolean' ? force : !this.moreOpen()); }
}
