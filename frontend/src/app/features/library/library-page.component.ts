import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FilesService } from '../../core/services/files.service';
import { StudyMaterial } from '../../core/models/app.models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { firstArray, fileTitle, fileTypeLabel, pickString, statusLabel } from '../../shared/utils/view.utils';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
    <section class="page-shell">
      <div class="flex items-end justify-between gap-3 flex-wrap mb-lg">
        <app-page-header title="Biblioteca" subtitle="Materiais acadêmicos, links, vídeos, livros, provas e resumos."></app-page-header>
        <div class="flex gap-2"><a routerLink="/app/link" class="btn-secondary no-underline"><span class="material-symbols-outlined text-[18px]">add_link</span> Link</a><a routerLink="/app/upload" class="btn-primary no-underline"><span class="material-symbols-outlined text-[18px]">add</span> Upload</a></div>
      </div>

      <div class="chips-row mb-md">
        <button *ngFor="let chip of chips" type="button" (click)="typeFilter = chip.value; load()" [class.active]="typeFilter === chip.value" class="filter-chip"><span class="material-symbols-outlined text-[16px]" *ngIf="chip.icon">{{ chip.icon }}</span>{{ chip.label }}</button>
      </div>

      <section class="settings-card mb-lg">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-md">
          <label class="filter-select md:col-span-2"><span>Busca</span><input class="form-control" [(ngModel)]="search" (keyup.enter)="load()" placeholder="Título, autor, tag..." /></label>
          <label class="filter-select"><span>Status</span><select class="form-control" [(ngModel)]="statusFilter" (change)="load()"><option value="">Todos</option><option value="approved">Aprovado</option><option value="pending">Pendente</option><option value="rejected">Rejeitado</option></select></label>
          <label class="filter-select"><span>Visibilidade</span><select class="form-control" [(ngModel)]="visibility" (change)="load()"><option value="">Todas</option><option value="public">Público</option><option value="private">Privado</option></select></label>
        </div>
      </section>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading() && !error() && !materials().length" icon="folder_open" title="Nenhum material encontrado" description="Ajuste os filtros ou cadastre um novo material."></app-empty-state>

      <div class="bento-grid" *ngIf="!loading() && materials().length">
        <article *ngFor="let material of materials()" class="file-card">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap gap-2"><span class="badge badge-secondary">{{ typeLabel(material) }}</span><span class="badge" [class.badge-approved]="String(material.status).toLowerCase()==='approved'" [class.badge-pending]="String(material.status).toLowerCase()==='pending'">{{ status(material.status) }}</span></div>
            <span class="material-symbols-outlined text-outline">description</span>
          </div>
          <h3 class="file-card-title mt-md">{{ title(material) }}</h3>
          <p class="file-card-subtitle">{{ material.original_name || material.description || 'Sem descrição curta' }}</p>
          <div class="file-card-meta">
            <div><label>Autor</label><span>{{ material.author || '—' }}</span></div>
            <div><label>Ano</label><span>{{ material.year || '—' }}</span></div>
            <div><label>Categoria</label><span>{{ category(material) || '—' }}</span></div>
            <div><label>Assunto</label><span>{{ material.subject_name || '—' }}</span></div>
          </div>
          <div class="flex items-center gap-2 flex-wrap mt-md">
            <a [routerLink]="['/app/library', idOf(material)]" class="btn-primary no-underline">Abrir</a>
            <a *ngIf="previewUrl(material)" [href]="previewUrl(material)" target="_blank" rel="noopener" class="btn-secondary no-underline"><span class="material-symbols-outlined text-[18px]">open_in_new</span></a>
            <a [routerLink]="['/app/reader', idOf(material)]" class="btn-secondary no-underline">Leitor</a>
          </div>
        </article>
      </div>
    </section>
  `
})
export class LibraryPageComponent implements OnInit {
  String = String;
  loading = signal(true);
  error = signal<string | null>(null);
  materials = signal<StudyMaterial[]>([]);
  search = '';
  typeFilter = 'all';
  statusFilter = '';
  visibility = '';
  chips = [
    { value: 'all', label: 'Todos', icon: '' }, { value: 'book', label: 'Livros', icon: 'menu_book' }, { value: 'article', label: 'Artigos', icon: '' },
    { value: 'slide', label: 'Slides', icon: '' }, { value: 'video', label: 'Vídeos', icon: 'smart_display' }, { value: 'playlist', label: 'Playlists', icon: 'video_library' },
    { value: 'external_link', label: 'Links', icon: 'link' }, { value: 'pending', label: 'Pendentes', icon: 'pending' }
  ];

  constructor(private files: FilesService, private route: ActivatedRoute) {}
  ngOnInit(): void { this.search = this.route.snapshot.queryParamMap.get('q') || ''; this.load(); }

  load(): void {
    this.loading.set(true); this.error.set(null);
    const params: Record<string, unknown> = { q: this.search, search: this.search, status: this.statusFilter, visibility: this.visibility };
    if (this.typeFilter && this.typeFilter !== 'all' && this.typeFilter !== 'pending') params['type'] = this.typeFilter;
    if (this.typeFilter === 'pending') params['status'] = 'pending';
    this.files.list(params).subscribe({
      next: (res) => { this.materials.set(firstArray<StudyMaterial>(res, ['files', 'materials', 'items', 'content'])); this.loading.set(false); },
      error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
    });
  }

  idOf(material: StudyMaterial): string { return String(material.id || material.material_id || material.file_id || ''); }
  title(material: StudyMaterial): string { return fileTitle(material); }
  typeLabel(material: StudyMaterial): string { return fileTypeLabel(material.file_type || material.type); }
  status(value: unknown): string { return statusLabel(value); }
  category(material: StudyMaterial): string { return pickString(material, ['category_name']); }
  previewUrl(material: StudyMaterial): string { return pickString(material, ['google_drive_preview_url', 'preview_url', 'google_drive_url', 'url']); }
}
