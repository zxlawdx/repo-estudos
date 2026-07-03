import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header class="h-16 w-full sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant md:pl-[260px]">
      <div class="flex justify-between items-center px-lg h-full max-w-container-max mx-auto">
        <div class="flex items-center flex-1">
          <div class="relative w-full max-w-md focus-within:ring-2 focus-within:ring-primary rounded-lg">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input class="w-full bg-surface-container-low border-none rounded-lg py-2 pl-10 pr-4 text-body-md focus:ring-0"
                   placeholder="Pesquisar no repositório (⌘K)" type="text" />
          </div>
        </div>
        <div class="flex items-center gap-md ml-lg">
          <button (click)="goUpload()" class="hidden lg:flex items-center gap-2 bg-primary text-white px-md py-2 rounded-xl text-label-md hover:opacity-90 transition-opacity active:scale-95">
            <span class="material-symbols-outlined">add</span>
            Quick Upload
          </button>
          <button (click)="logout()" class="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Sair">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>
  `
})
export class TopbarComponent {
  constructor(private router: Router, private auth: AuthService) {}

  goUpload() {
    this.router.navigate(['/app/upload']);
  }

  logout() {
    this.auth.logout();
  }
}
