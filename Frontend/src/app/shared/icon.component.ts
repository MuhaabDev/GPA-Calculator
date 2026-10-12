import { Component, input } from '@angular/core';
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()] || paths['arrow']" />
  </svg>`,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      svg {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class IconComponent {
  name = input('arrow');
  paths: Record<string, string> = {
    overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    semesters: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2',
    calculator: 'M5 3h14v18H5z M8 6h8v4H8z M8 14h1 M15 14h1 M8 17h1 M15 17h1',
    simulator: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
    goals: 'M20 12a8 8 0 1 1-8-8 M16 12a4 4 0 1 1-4-4 M12 12l9-9 M16 3h5v5',
    analytics: 'M4 3v17h17 M8 15v-4 M13 15V7 M18 15v-7',
    settings:
      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    plus: 'M12 5v14 M5 12h14',
    close: 'M6 6l12 12 M18 6L6 18',
    book: 'M4 4h7l1 2 1-2h7v15h-7l-1 2-1-2H4z M12 6v15',
    check: 'M5 12l4 4L19 6',
    moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5z M12 14v3',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
    upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v5h16v-5',
    edit: 'M4 16l12-12 4 4L8 20H4z M14 6l4 4',
    trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
    trend: 'M3 17l6-6 4 4 8-10 M15 5h6v6',
    info: 'M12 8h.01 M12 11v6 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    up: 'M6 14l6-6 6 6',
    down: 'M6 10l6 6 6-6',
  };
}
