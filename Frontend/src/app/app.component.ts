import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from './core/store.service';
import { IconComponent } from './shared/icon.component';
import { DialogComponent } from './shared/dialog.component';
import { ConfirmService } from './shared/confirm.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent, DialogComponent],
  template: ` <a class="skip-link" href="#main">Skip to content</a>
    <div class="app-shell">
      <aside class="sidebar" [class.is-open]="menu()">
        <a routerLink="/" class="brand" (click)="menu.set(false)"
          ><span class="brand-mark">g<span>.</span></span
          ><span class="brand-name">GPA Calculator</span></a
        >
        <div class="workspace-label">YOUR ACADEMIC SPACE</div>
        <nav aria-label="Main navigation">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="menu.set(false)"
              ><app-icon [name]="item.icon" /><span>{{ item.label }}</span>
              @if (item.path === '/simulator') {
                <span class="nav-new">WHAT IF</span>
              }
            </a>
          }
        </nav>
        <div class="sidebar-bottom">
          <div class="local-note">
            <span class="local-dot"></span
            ><span>Made for your next chapter.<small>Private. Local. Yours.</small></span>
          </div>
          <a routerLink="/settings" routerLinkActive="active" (click)="menu.set(false)"
            ><app-icon name="settings" /> Settings</a
          ><button class="theme-toggle" (click)="theme()">
            <app-icon [name]="store.data().preferences.theme === 'light' ? 'moon' : 'sun'" />{{
              store.data().preferences.theme === 'light' ? 'Dark appearance' : 'Light appearance'
            }}<span>↗</span>
          </button>
          <div class="profile">
            <div class="avatar">S</div>
            <div>Student workspace<small>Local workspace · no sign-in</small></div>
          </div>
        </div>
      </aside>
      @if (menu()) {
        <button class="nav-scrim" aria-label="Close navigation" (click)="menu.set(false)"></button>
      }
      <div class="main-shell">
        <header class="topbar">
          <div class="breadcrumb">
            <button
              class="icon-button mobile-menu"
              aria-label="Open navigation"
              (click)="menu.set(!menu())"
            >
              <app-icon name="menu" /></button
            ><span>Workspace</span><span class="slash">/</span><span>Academic planner</span>
          </div>
          <div class="topbar-right">
            <span class="saved-indicator"
              ><span class="local-dot" [class.warning-dot]="store.persistence.warning()"></span
              >{{
                store.persistence.warning() ? 'Storage needs attention' : 'Saved on this browser'
              }}</span
            ><a routerLink="/settings" class="top-avatar" aria-label="Workspace settings">S</a>
          </div>
        </header>
        <main id="main">
          @if (store.persistence.warning()) {
            <div class="alert warning" role="alert">
              <app-icon name="info" />
              <div>{{ store.persistence.warning() }}</div>
              <button class="text-button" (click)="store.persistence.recover()">
                Export recovery
              </button>
            </div>
          }
          @if (store.error()) {
            <div class="alert error" role="alert">
              <app-icon name="info" />
              <div>{{ store.error() }}</div>
              <button class="text-button" (click)="store.refresh()">Retry</button>
            </div>
          }
          <router-outlet />
        </main>
        <footer class="app-footer">
          <span>GPA Calculator · A little clarity for your academic journey.</span
          ><span><app-icon name="lock" /> Your records stay in your browser</span>
        </footer>
      </div>
    </div>
    @if (store.notice()) {
      <div class="toast" role="status"><app-icon name="check" />{{ store.notice() }}</div>
    }
    @if (confirm.pending(); as p) {
      <app-dialog [title]="p.title" eyebrow="PLEASE CONFIRM" (closed)="confirm.pending.set(null)"
        ><p class="muted">{{ p.message }}</p>
        <div class="dialog-actions">
          <button class="button secondary" (click)="confirm.pending.set(null)">Cancel</button
          ><button class="button danger" (click)="confirm.confirm()">{{ p.label }}</button>
        </div></app-dialog
      >
    }`,
})
export class AppComponent {
  store = inject(Store);
  confirm = inject(ConfirmService);
  menu = signal(false);
  nav = [
    { path: '/', label: 'Overview', icon: 'overview' },
    { path: '/semesters', label: 'Semesters', icon: 'semesters' },
    { path: '/calculator', label: 'GPA calculator', icon: 'calculator' },
    { path: '/simulator', label: 'Simulator', icon: 'simulator' },
    { path: '/goals', label: 'Goals & planning', icon: 'goals' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
  ];
  theme() {
    this.store.update(
      (d) => (d.preferences.theme = d.preferences.theme === 'light' ? 'dark' : 'light'),
    );
  }
}
