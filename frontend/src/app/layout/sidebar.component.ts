import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant py-md z-50">
      <div class="px-lg mb-xl">
        <h1 class="text-headline-sm font-bold text-primary">Repositório</h1>
        <p class="text-label-sm text-on-surface-variant uppercase tracking-wider">Estudos Acadêmicos</p>
      </div>
      <nav class="flex-1 space-y-1">
        <a *ngFor="let item of items" [routerLink]="item.path" routerLinkActive="bg-secondary-container text-on-secondary-container border-l-4 border-primary font-bold"
           [routerLinkActiveOptions]="{exact: false}"
           class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 cursor-pointer active:scale-95">
          <span class="material-symbols-outlined">{{ item.icon }}</span>
          <span class="text-label-md">{{ item.label }}</span>
        </a>
      </nav>
      <div class="px-4 py-md mt-auto space-y-1 border-t border-outline-variant">
        <a routerLink="/app/settings" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
          <span class="material-symbols-outlined">settings</span>
          <span class="text-label-md">Configurações</span>
        </a>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  items = [
    { path: '/app/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/app/library', icon: 'library_books', label: 'Library' },
    { path: '/app/categories', icon: 'category', label: 'Categories' },
    { path: '/app/paths', icon: 'route', label: 'Trilhas' },
    { path: '/app/graph', icon: 'account_tree', label: 'Grafo' },
    { path: '/app/upload', icon: 'upload_file', label: 'Upload' },
    { path: '/app/profile', icon: 'account_circle', label: 'Perfil' }
  ];
}
