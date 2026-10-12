import { Component, inject, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '../core/store.service';
import { ScoreBand, defaultScoreBands } from '../core/models';
import { validateScoreBands } from '../core/validation';
@Component({
  selector: 'app-score-bands',
  standalone: true,
  imports: [FormsModule],
  template: `<section class="panel settings-section">
    <div class="panel-heading">
      <div>
        <h2>Marks → grades</h2>
        <p>Score boundaries for current-semester assessment projections</p>
      </div>
    </div>
    <p class="form-hint">
      Minimums are inclusive. Each band ends just before the next minimum; the top band includes
      100. Start at 0 for complete coverage. These are your rules, not universal university
      boundaries.
    </p>
    <div class="table-scroll">
      <table class="scale-table">
        <thead>
          <tr>
            <th>Minimum %</th>
            <th>Letter grade</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (b of draft; track $index; let i = $index) {
            <tr>
              <td>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  [(ngModel)]="b.minimum"
                  [attr.aria-label]="'Minimum percentage ' + (i + 1)"
                />
              </td>
              <td>
                <select [(ngModel)]="b.grade" [attr.aria-label]="'Boundary grade ' + (i + 1)">
                  @for (g of store.data().scale; track g.label) {
                    @if (g.points !== null) {
                      <option [value]="g.label">{{ g.label }} · {{ g.points }}</option>
                    }
                  }
                </select>
              </td>
              <td>
                <button
                  class="text-button"
                  [attr.aria-label]="'Remove boundary ' + (i + 1)"
                  (click)="draft.splice(i, 1)"
                >
                  Remove
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="scale-actions">
      <button class="text-button" [disabled]="draft.length >= 30" (click)="add()">
        + Add boundary</button
      ><button class="button primary small" (click)="save()">Save score boundaries</button>
    </div>
    <div class="scale-actions">
      <button class="text-button" (click)="preset()">Load example 4.0 boundaries</button
      ><button class="text-button" (click)="clear()">Leave unconfigured</button>
    </div>
    @if (error()) {
      <p class="field-error" role="alert">{{ error() }}</p>
    }
    @if (!store.data().scoreBands.length) {
      <p class="form-hint">
        No score conversion configured. Actual grades remain available; assessment projections need
        valid boundaries.
      </p>
    }
    <p class="form-hint">
      Changing these boundaries recalculates current potential only. Previously confirmed final
      letter grades stay unchanged. The example preset maps 93 to A− / 3.7; edit it to match your
      university.
    </p>
  </section>`,
})
export class ScoreBandsComponent {
  store = inject(Store);
  draft: ScoreBand[] = [];
  error = signal('');
  private last = '';
  constructor() {
    effect(() => {
      const bands = this.store.data().scoreBands,
        key = JSON.stringify(bands);
      if (key !== this.last) {
        this.last = key;
        this.draft = structuredClone(bands);
      }
    });
  }
  add() {
    this.draft.push({
      minimum: 0,
      grade: this.store.data().scale.find((g) => g.points !== null)!.label,
    });
  }
  preset() {
    const bands = defaultScoreBands();
    try {
      validateScoreBands(this.store.data().scale, bands);
      this.draft = bands;
      this.error.set('');
    } catch {
      this.error.set(
        'This preset requires the standard 4.0 letter grades. Add boundaries for your custom scale instead.',
      );
    }
  }
  save() {
    try {
      if (!this.draft.length)
        throw new Error('Add boundaries, or explicitly choose Leave unconfigured.');
      validateScoreBands(this.store.data().scale, this.draft);
      this.store.update(
        (d) => (d.scoreBands = structuredClone(this.draft).sort((a, b) => b.minimum - a.minimum)),
      );
      this.error.set('');
      this.store.toast('Score boundaries saved');
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  clear() {
    this.store.update((d) => (d.scoreBands = []));
    this.draft = [];
    this.error.set('');
    this.store.toast('Assessment conversion left unconfigured');
  }
}
