import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';
import { BottomNavComponent } from './bottom-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, BottomNavComponent],
  template: `
    <app-sidebar></app-sidebar>
    <div class="md:ml-[260px] min-h-screen flex flex-col">
      <app-topbar></app-topbar>
      <main class="flex-1 pb-24 md:pb-0">
        <router-outlet></router-outlet>
      </main>
    </div>
    <app-bottom-nav></app-bottom-nav>
  `
})
export class ShellComponent {}
