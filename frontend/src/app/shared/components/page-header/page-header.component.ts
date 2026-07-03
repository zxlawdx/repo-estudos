import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-xl">
      <h2 class="text-headline-md text-on-surface">{{ title }}</h2>
      <p class="text-body-md text-on-surface-variant" *ngIf="subtitle">{{ subtitle }}</p>
    </div>
  `
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
