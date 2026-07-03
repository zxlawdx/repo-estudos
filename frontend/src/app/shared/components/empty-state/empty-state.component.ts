import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-2xl text-center">
      <span class="material-symbols-outlined text-6xl text-outline-variant mb-md">{{ icon }}</span>
      <h3 class="text-headline-sm text-on-surface">{{ title }}</h3>
      <p class="text-body-md text-on-surface-variant max-w-sm mt-1">{{ description }}</p>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = 'folder_open';
  @Input() title = 'Sem dados';
  @Input() description = 'Nada para mostrar por aqui ainda.';
}
