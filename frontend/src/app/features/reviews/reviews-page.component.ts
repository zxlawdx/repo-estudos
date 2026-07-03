import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReviewsService } from '../../core/services/reviews.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { fileTitle, firstArray, formatDate, pickString } from '../../shared/utils/view.utils';

@Component({
  selector: 'app-reviews-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
<section class="page-shell">
  <app-page-header title="Resenhas" subtitle="Feed de resenhas, comentários, reações e filtros por material ou trilha."></app-page-header>
  <div class="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-lg">
    <section>
      <div class="settings-card mb-lg">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
          <input class="form-control md:col-span-2" [(ngModel)]="search" placeholder="Buscar resenhas..." (keyup.enter)="load()">
          <button class="btn-primary justify-center" (click)="load()">Buscar</button>
        </div>
      </div>

      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading()&&!error()&&!reviews().length" icon="reviews" title="Nenhuma resenha encontrada" description="Quando houver publicações, elas aparecerão aqui."></app-empty-state>

      <article *ngFor="let r of reviews()" class="settings-card mb-md">
        <div class="flex justify-between gap-3 flex-wrap">
          <span class="badge badge-secondary">{{ pick(r,['post_type','type'],'resenha') }}</span>
          <span class="text-label-sm text-on-surface-variant">{{ date(r) }}</span>
        </div>
        <h3 class="text-headline-sm mt-md">{{ pick(r,['title','material_title'],'Resenha sem título') }}</h3>
        <p class="text-label-sm text-on-surface-variant" *ngIf="pick(r,['material_name','material_title','file_title'],'')">
          Material: {{ pick(r,['material_name','material_title','file_title'],'') }}
        </p>
        <p class="text-body-md text-on-surface-variant whitespace-pre-line">{{ pick(r,['body','content','text'],'Sem conteúdo.') }}</p>
        <div class="flex gap-2 mt-md flex-wrap">
          <button class="btn-secondary" (click)="react(r)"><span class="material-symbols-outlined text-[18px]">thumb_up</span>{{ pick(r,['like_count'],'0') }}</button>
          <button class="btn-secondary"><span class="material-symbols-outlined text-[18px]">comment</span>{{ pick(r,['comment_count'],'0') }}</button>
          <button class="btn-secondary" (click)="save(r)"><span class="material-symbols-outlined text-[18px]">bookmark</span>Salvar</button>
        </div>
      </article>
    </section>

    <aside class="settings-card h-fit space-y-md">
      <h3 class="section-title">Nova resenha</h3>
      <label class="filter-select"><span>Material</span><select class="form-control" [(ngModel)]="materialId"><option value="">Selecione um material</option><option *ngFor="let m of materials()" [value]="idOf(m)">{{ materialTitle(m) }}</option></select></label>
      <input class="form-control" [(ngModel)]="title" placeholder="Título">
      <textarea class="form-control min-h-[140px]" [(ngModel)]="body" placeholder="Escreva sua resenha com pelo menos 20 caracteres..."></textarea>
      <button class="btn-primary w-full justify-center" (click)="create()" [disabled]="saving()">{{ saving()?'Salvando...':'Publicar resenha' }}</button>
    </aside>
  </div>
</section>`
})
export class ReviewsPageComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  reviews = signal<Record<string, unknown>[]>([]);
  materials = signal<Record<string, unknown>[]>([]);
  search = '';
  title = '';
  body = '';
  materialId = '';

  constructor(private service: ReviewsService) {}
  ngOnInit(): void { this.loadMaterials(); this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list({ q: this.search, search: this.search }).subscribe({
      next: (res) => { this.reviews.set(firstArray<Record<string, unknown>>(res, ['posts', 'reviews', 'items', 'rows'])); this.loading.set(false); },
      error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
    });
  }

  loadMaterials(): void {
    this.service.materials({ limit: 100 }).subscribe({
      next: (res) => this.materials.set(firstArray<Record<string, unknown>>(res, ['materials', 'files', 'items', 'rows'])),
      error: () => undefined
    });
  }

  create(): void {
    if (!this.materialId) { this.error.set('Selecione um material antes de publicar a resenha.'); return; }
    this.saving.set(true);
    this.error.set(null);
    this.service.create({ title: this.title, body: this.body, materialId: this.materialId, postType: 'review', status: 'published' }).subscribe({
      next: () => { this.saving.set(false); this.title = ''; this.body = ''; this.materialId = ''; this.load(); },
      error: (err: Error) => { this.error.set(err.message); this.saving.set(false); }
    });
  }

  react(r: Record<string, unknown>): void { const id = String(r['id'] || ''); if (id) this.service.reaction(id).subscribe({ next: () => this.load(), error: (err: Error) => this.error.set(err.message) }); }
  save(r: Record<string, unknown>): void { const id = String(r['id'] || ''); if (id) this.service.save(id).subscribe({ next: () => this.load(), error: (err: Error) => this.error.set(err.message) }); }
  pick(i: unknown, k: string[], f = ''): string { return pickString(i, k, f); }
  date(i: unknown): string { return formatDate(pickString(i, ['created_at', 'createdAt', 'date'], '')); }
  idOf(m: Record<string, unknown>): string { return String(m['id'] || m['material_id'] || m['file_id'] || ''); }
  materialTitle(m: Record<string, unknown>): string { return fileTitle(m); }
}
