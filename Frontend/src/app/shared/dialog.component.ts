import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { IconComponent } from './icon.component';
@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [IconComponent],
  template: `<dialog
    #dialog
    (cancel)="cancel($event)"
    (click)="backdrop($event)"
    aria-labelledby="dialog-title"
  >
    <div class="dialog-content">
      <div class="dialog-heading">
        <div>
          <span class="eyebrow">{{ eyebrow() }}</span>
          <h2 id="dialog-title">{{ title() }}</h2>
        </div>
        <button type="button" class="icon-button" aria-label="Close dialog" (click)="closed.emit()">
          <app-icon name="close" />
        </button>
      </div>
      <ng-content />
    </div>
  </dialog>`,
})
export class DialogComponent {
  title = input('');
  eyebrow = input('YOUR WORKSPACE');
  closed = output<void>();
  el = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    afterNextRender(() => this.el().nativeElement.showModal());
  }
  ngOnDestroy() {
    if (this.el().nativeElement.open) this.el().nativeElement.close();
  }
  cancel(event: Event) {
    event.preventDefault();
    this.closed.emit();
  }
  backdrop(event: MouseEvent) {
    if (event.target === this.el().nativeElement) this.closed.emit();
  }
}
