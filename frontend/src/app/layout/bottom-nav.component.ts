import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="md:hidden fixed bottom-0 w-full z-50 bg-surface-container-lowest border-t border-outline-variant shadow-lg rounded-t-xl flex justify-around items-center px-4 py-2 safe-area-bottom">
      <a *ngFor="let item of items" [routerLink]="item.path" routerLinkActive="bg-primary-container text-on-primary-container rounded-full"
         class="flex flex-col items-center justify-center text-on-surface-variant p-2 touch-manipulation scale-95 transition-transform active:bg-surface-container-high">
        <span class="material-symbols-outlined">{{ item.icon }}</span>
        <span class="text-label-sm">{{ item.label }}</span>
      </a>
    </nav>
  `
})
export class BottomNavComponent {
  items = [
    { path: '/app/dashboard', icon: 'home', label: 'Home' },
    { path: '/app/library', icon: 'book', label: 'Library' },
    { path: '/app/upload', icon: 'add_circle', label: 'Upload' },
    { path: '/app/paths', icon: 'account_tree', label: 'Trilhas' },
    { path: '/app/profile', icon: 'person', label: 'Perfil' }
  ];
}
