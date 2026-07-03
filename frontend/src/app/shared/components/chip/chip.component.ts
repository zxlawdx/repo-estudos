import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chip',
  standalone: true,
  template: `
    <span class="px-3 py-1 bg-surface-container-high rounded-full text-label-sm text-on-surface-variant border border-outline-variant">
      <ng-content></ng-content>
    </span>
  `
})
export class ChipComponent {}
