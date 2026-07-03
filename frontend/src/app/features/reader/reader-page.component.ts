import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-reader-page',
  standalone: true,
  imports: [CommonModule, LoadingComponent, ErrorMessageComponent],
  template: `
    <section class="p-lg md:p-2xl max-w-4xl mx-auto w-full">
      <app-loading *ngIf="loading()"></app-loading>
      <app-error-message *ngIf="error()" [message]="error()!"></app-error-message>

      <div *ngIf="!loading() && !error() && data() as d">
        <h2 class="text-headline-md mb-md">{{ d.title || d.final_name }}</h2>
        <div class="aspect-[4/5] bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden relative">
          <iframe *ngIf="d.previewUrl" [src]="d.previewUrl" class="w-full h-full" frameborder="0"></iframe>
        </div>
      </div>
    </section>
  `
})
export class ReaderPageComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<any | null>(null);

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('materialId');
    if (!id) {
      this.error.set('Material não encontrado.');
      this.loading.set(false);
      return;
    }
    this.api.get<any>(`/reader/materials/${id}`).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o leitor.');
        this.loading.set(false);
      }
    });
  }
}
