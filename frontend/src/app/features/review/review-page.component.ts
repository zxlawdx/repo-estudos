import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FilesService } from '../../core/services/files.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { firstArray, fileTitle, fileTypeLabel, statusLabel } from '../../shared/utils/view.utils';
import { StudyMaterial } from '../../core/models/app.models';

@Component({selector:'app-review-page', standalone:true, imports:[CommonModule,RouterLink,PageHeaderComponent,LoadingComponent,ErrorMessageComponent,EmptyStateComponent], template:`
<section class="page-shell"><app-page-header title="Revisão" subtitle="Materiais pendentes, sugestões de nome e metadados para aprovação."></app-page-header>
<app-loading *ngIf="loading()"></app-loading><app-error-message *ngIf="error()" [message]="error()!"></app-error-message>
<app-empty-state *ngIf="!loading()&&!error()&&!items().length" icon="rate_review" title="Nada pendente para revisar" description="Os materiais pendentes aparecerão aqui."></app-empty-state>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg" *ngIf="!loading()&&items().length">
<article *ngFor="let item of items()" class="settings-card"><div class="flex justify-between gap-3"><span class="badge badge-pending">{{ statusLabel(item.status) }}</span><span class="badge badge-secondary">{{ fileTypeLabel(item.file_type||item.type) }}</span></div><h3 class="text-headline-sm mt-md text-on-surface">{{ title(item) }}</h3><p class="text-body-sm text-on-surface-variant">Original: {{ item.original_name || '—' }}</p><div class="safe-status-panel my-md"><div class="safe-status-row"><span>Autor</span><b>{{ item.author || '—' }}</b></div><div class="safe-status-row"><span>Ano</span><b>{{ item.year || '—' }}</b></div><div class="safe-status-row"><span>Categoria</span><b>{{ item.category_name || '—' }}</b></div></div><div class="flex gap-2 flex-wrap"><a [routerLink]="['/app/library', item.id||item.material_id||item.file_id]" class="btn-secondary no-underline">Detalhes</a><button class="btn-primary">Aprovar</button><button class="btn-danger">Rejeitar</button></div></article>
</div></section>`})
export class ReviewPageComponent implements OnInit{loading=signal(true);error=signal<string|null>(null);items=signal<StudyMaterial[]>([]);constructor(private files:FilesService){}ngOnInit():void{this.files.list({status:'pending'}).subscribe({next:(res)=>{this.items.set(firstArray<StudyMaterial>(res,['files','materials','items']));this.loading.set(false)},error:(err:Error)=>{this.error.set(err.message);this.loading.set(false)}})}title(i:StudyMaterial):string{return fileTitle(i)} fileTypeLabel(v:unknown):string{return fileTypeLabel(v)} statusLabel(v:unknown):string{return statusLabel(v)}}
