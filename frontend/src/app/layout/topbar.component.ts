import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { FilesService } from '../core/services/files.service';
import { firstArray, fileTitle, pickString } from '../shared/utils/view.utils';
import { StudyMaterial } from '../core/models/app.models';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <header class="h-auto min-h-16 w-full sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-outline-variant">
      <div class="flex flex-wrap md:flex-nowrap items-center gap-3 px-md md:px-lg py-3 max-w-container-max mx-auto">
        <div class="md:hidden inline-flex items-center gap-2 font-bold text-primary">
          <span class="material-symbols-outlined">menu_book</span>
          <span>Repositório</span>
        </div>

        <div class="relative flex-1 min-w-[180px] md:max-w-2xl">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input class="w-full bg-surface-container-low border border-transparent rounded-2xl py-2.5 pl-10 pr-4 text-body-sm md:text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                 placeholder="Pesquisar no repositório" type="text" [(ngModel)]="query" (keyup.enter)="search()" />
          <div *ngIf="query.trim() && results().length" class="absolute left-0 right-0 mt-2 bg-white border border-outline-variant rounded-2xl shadow-xl overflow-hidden z-50">
            <button *ngFor="let item of results()" type="button" (click)="openResult(item)" class="w-full text-left px-4 py-3 hover:bg-surface-container-low border-b border-outline-variant last:border-0">
              <strong class="block text-body-sm text-on-surface truncate">{{ title(item) }}</strong>
              <span class="text-label-sm text-on-surface-variant">Material encontrado na biblioteca</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 ml-auto">
          <a routerLink="/app/upload" class="hidden sm:inline-flex items-center gap-2 bg-primary text-white px-md py-2 rounded-2xl text-label-md hover:opacity-90 transition-opacity">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Upload rápido
          </a>
          <a routerLink="/app/profile" class="hidden md:flex items-center gap-2 rounded-2xl border border-outline-variant px-3 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low">
            <span class="w-7 h-7 rounded-xl bg-secondary-container text-primary grid place-items-center overflow-hidden font-bold">
              <img *ngIf="avatar()" [src]="avatar()" alt="Avatar" class="w-full h-full object-cover" />
              <span *ngIf="!avatar()">{{ initials() }}</span>
            </span>
            <span class="max-w-[140px] truncate">{{ displayName() }}</span>
          </a>
          <button (click)="logout()" class="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors" title="Sair">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>
  `
})
export class TopbarComponent {
  query = '';
  results = signal<StudyMaterial[]>([]);
  displayName = computed(() => pickString(this.auth.profile(), ['display_name', 'displayName', 'name', 'email'], 'Usuário'));
  avatar = computed(() => pickString(this.auth.profile(), ['avatar_url', 'profilePhotoUrl'], ''));
  initials = computed(() => this.displayName().trim().charAt(0).toUpperCase() || 'U');

  constructor(private router: Router, private auth: AuthService, private files: FilesService) {}

  search(): void {
    const q = this.query.trim();
    if (!q) {
      this.results.set([]);
      return;
    }
    this.files.list({ q, search: q, limit: 6 }).subscribe({
      next: (res) => this.results.set(firstArray<StudyMaterial>(res, ['files', 'materials', 'items']).slice(0, 6)),
      error: () => this.router.navigate(['/app/library'], { queryParams: { q } })
    });
  }

  openResult(item: StudyMaterial): void {
    const id = String(item.id || item.material_id || item.file_id || '');
    this.results.set([]);
    if (id) this.router.navigate(['/app/library', id]);
    else this.router.navigate(['/app/library'], { queryParams: { q: this.query } });
  }

  title(item: StudyMaterial): string { return fileTitle(item); }
  logout(): void { this.auth.logout(); }
}
