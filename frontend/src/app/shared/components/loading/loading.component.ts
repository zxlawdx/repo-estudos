import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-2xl gap-md text-on-surface-variant">
      <span class="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
      <p class="text-body-sm">{{ label }}</p>
    </div>
  `
})
export class LoadingComponent {
  @Input() label = 'Carregando...';
}
