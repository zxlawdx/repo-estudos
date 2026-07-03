import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-error-message',
  standalone: true,
  template: `
    <div class="flex items-start gap-3 p-md bg-error-container/40 border border-error/30 rounded-xl text-on-error-container">
      <span class="material-symbols-outlined">error</span>
      <p class="text-body-sm">{{ message }}</p>
    </div>
  `
})
export class ErrorMessageComponent {
  @Input() message = 'Não foi possível carregar os dados. Tente novamente.';
}
