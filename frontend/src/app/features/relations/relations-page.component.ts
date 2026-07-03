import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RelationsService } from '../../core/services/relations.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { asRecord, firstArray, pickString } from '../../shared/utils/view.utils';

@Component({
  selector: 'app-relations-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, ErrorMessageComponent, EmptyStateComponent],
  template: `
<section class="page-shell">
  <app-page-header title="Relações" subtitle="Gerencie origem, destino, tipo, direção, peso e justificativa das relações."></app-page-header>
  <div class="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-lg">
    <form class="settings-card h-fit space-y-md" (ngSubmit)="create()">
      <h3 class="section-title">Nova relação</h3>
      <div class="grid grid-cols-2 gap-md">
        <label class="filter-select"><span>Tipo da origem</span><select class="form-control" [(ngModel)]="sourceType" name="sourceType"><option value="material">Material</option><option value="path">Trilha</option><option value="category">Categoria</option><option value="subject">Assunto</option><option value="tag">Tag</option><option value="topic">Tópico</option></select></label>
        <label class="filter-select"><span>ID da origem</span><input class="form-control" [(ngModel)]="sourceId" name="sourceId" required placeholder="UUID/ID"></label>
      </div>
      <div class="grid grid-cols-2 gap-md">
        <label class="filter-select"><span>Tipo do destino</span><select class="form-control" [(ngModel)]="targetType" name="targetType"><option value="material">Material</option><option value="path">Trilha</option><option value="category">Categoria</option><option value="subject">Assunto</option><option value="tag">Tag</option><option value="topic">Tópico</option></select></label>
        <label class="filter-select"><span>ID do destino</span><input class="form-control" [(ngModel)]="targetId" name="targetId" required placeholder="UUID/ID"></label>
      </div>
      <div class="grid grid-cols-2 gap-md">
        <label class="filter-select"><span>Relação</span><select class="form-control" [(ngModel)]="relationType" name="relationType"><option value="prerequisite">Pré-requisito</option><option value="depends_on">Depende de</option><option value="related">Relacionado</option><option value="complementary">Complementar</option><option value="custom">Personalizado</option></select></label>
        <label class="filter-select"><span>Peso</span><input class="form-control" type="number" min="1" [(ngModel)]="weight" name="weight"></label>
      </div>
      <label class="filter-select"><span>Direção</span><select class="form-control" [(ngModel)]="direction" name="direction"><option value="directed">Direcionada</option><option value="undirected">Sem direção</option></select></label>
      <label class="filter-select"><span>Nota/justificativa</span><textarea class="form-control min-h-[90px]" [(ngModel)]="note" name="note"></textarea></label>
      <button class="btn-primary w-full justify-center" [disabled]="saving()">{{ saving()?'Salvando...':'Criar relação' }}</button>
    </form>

    <section>
      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
      <app-empty-state *ngIf="!loading()&&!error()&&!items().length" icon="account_tree" title="Nenhuma relação encontrada" description="As relações existentes aparecerão aqui."></app-empty-state>
      <div class="space-y-sm" *ngIf="!loading()&&items().length">
        <article *ngFor="let r of items()" class="settings-card">
          <div class="flex justify-between gap-3">
            <span class="badge badge-secondary">{{ pick(r,['relation_type','type'],'relação') }}</span>
            <button class="text-error" (click)="remove(r)"><span class="material-symbols-outlined">delete</span></button>
          </div>
          <h3 class="text-headline-sm mt-md">{{ edgeLabel(r, 'source') }} → {{ edgeLabel(r, 'target') }}</h3>
          <p class="text-label-sm text-on-surface-variant">{{ pick(r,['source_type'],'') }} → {{ pick(r,['target_type'],'') }}</p>
          <p class="text-body-sm text-on-surface-variant">{{ pick(r,['note','description'],'Sem justificativa.') }}</p>
        </article>
      </div>
    </section>
  </div>
</section>`
})
export class RelationsPageComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  items = signal<Record<string, unknown>[]>([]);
  nodes = signal<Record<string, unknown>[]>([]);
  sourceType = 'material'; sourceId = ''; targetType = 'material'; targetId = ''; relationType = 'prerequisite'; direction = 'directed'; weight = 1; note = '';

  constructor(private service: RelationsService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list({ limit: 500 }).subscribe({
      next: (res) => {
        const obj = asRecord(res);
        this.items.set(firstArray<Record<string, unknown>>(res, ['edges', 'relations', 'items', 'rows']));
        this.nodes.set(firstArray<Record<string, unknown>>(obj['nodes'] || res, ['nodes']));
        this.loading.set(false);
      },
      error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
    });
  }

  create(): void {
    this.saving.set(true);
    this.error.set(null);
    this.service.create({
      sourceType: this.sourceType, sourceId: this.sourceId,
      targetType: this.targetType, targetId: this.targetId,
      relationType: this.relationType, direction: this.direction,
      weight: this.weight, note: this.note
    }).subscribe({
      next: () => { this.saving.set(false); this.sourceId = ''; this.targetId = ''; this.note = ''; this.load(); },
      error: (err: Error) => { this.error.set(err.message); this.saving.set(false); }
    });
  }

  remove(r: Record<string, unknown>): void { const id = String(r['id'] || ''); if (!id) return; this.service.delete(id).subscribe({ next: () => this.load(), error: (err: Error) => this.error.set(err.message) }); }
  pick(i: unknown, k: string[], f = ''): string { return pickString(i, k, f); }
  edgeLabel(edge: Record<string, unknown>, side: 'source' | 'target'): string {
    const direct = pickString(edge, [`${side}_label`, `${side}_title`, side], '');
    if (direct && !direct.includes('[object')) return direct;
    const id = String(edge[`${side}_id`] || edge[side] || '');
    const node = this.nodes().find(n => String(n['id']) === id);
    return node ? pickString(node, ['label', 'title', 'name'], id) : id || side;
  }
}
