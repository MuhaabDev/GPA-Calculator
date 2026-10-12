import { ScoreBandsComponent } from '../../shared/score-bands.component';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '../../core/store.service';
import { GradeRule, defaultScale, freshData } from '../../core/models';
import { validateData } from '../../core/validation';
import { ConfirmService } from '../../shared/confirm.service';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IconComponent, ScoreBandsComponent],
  template: `<section class="page-heading">
      <div>
        <div class="eyebrow">MAKE YOURSELF AT HOME</div>
        <h1>Your space, your rules<span class="heading-dot">.</span></h1>
        <p>A few thoughtful preferences, tailored to your academic journey.</p>
      </div>
    </section>
    <div class="settings-layout">
      <div>
        <section class="panel settings-section">
          <div class="panel-heading">
            <div>
              <h2>Look & feel</h2>
              <p>Comfortable in any study session.</p>
            </div>
          </div>
          <div class="setting-row">
            <div>
              <h3>Appearance</h3>
              <p>Choose your workspace theme.</p>
            </div>
            <div class="segmented">
              <button
                [class.active]="store.data().preferences.theme === 'light'"
                (click)="setTheme('light')"
              >
                <app-icon name="sun" /> Light</button
              ><button
                [class.active]="store.data().preferences.theme === 'dark'"
                (click)="setTheme('dark')"
              >
                <app-icon name="moon" /> Dark
              </button>
            </div>
          </div>
          <div class="setting-row">
            <div>
              <h3>GPA precision</h3>
              <p>Display rounding only. Calculations keep full precision.</p>
            </div>
            <select
              aria-label="GPA decimal places"
              [ngModel]="store.data().preferences.precision"
              (ngModelChange)="precision($event)"
            >
              <option [ngValue]="1">1 decimal</option>
              <option [ngValue]="2">2 decimals</option>
              <option [ngValue]="3">3 decimals</option>
            </select>
          </div>
        </section>
        <section class="panel settings-section">
          <div class="panel-heading">
            <div>
              <h2>Your grading system</h2>
              <p>Configurable defaults, never universal university rules.</p>
            </div>
            <button class="text-button" (click)="draft = defaultRules()">Use defaults</button>
          </div>
          <div class="inline-note compact">
            <app-icon name="info" />
            <p>
              “Earns credits” controls completed credits. GPA points are independent: an F can count
              toward GPA without earning credits. Blank points exclude a grade from GPA.
            </p>
          </div>
          <div class="table-scroll">
            <table class="scale-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>GPA points</th>
                  <th>Earns credits</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (g of draft; track $index; let i = $index) {
                  <tr>
                    <td>
                      <input
                        [(ngModel)]="g.label"
                        maxlength="12"
                        [attr.aria-label]="'Grade label ' + (i + 1)"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        [(ngModel)]="g.points"
                        min="0"
                        max="10"
                        step="0.1"
                        placeholder="Non-GPA"
                        [attr.aria-label]="'Points for ' + g.label"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        [(ngModel)]="g.completed"
                        [attr.aria-label]="g.label + ' earns credits'"
                      />
                    </td>
                    <td>
                      <button
                        class="icon-button danger-hover"
                        [attr.aria-label]="'Remove grade ' + g.label"
                        (click)="draft.splice(i, 1)"
                      >
                        <app-icon name="close" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="scale-actions">
            <button
              class="text-button"
              [disabled]="draft.length >= 30"
              (click)="draft.push({ label: '', points: null, completed: false })"
            >
              <app-icon name="plus" /> Add grade rule</button
            ><button class="button primary small" (click)="saveScale()">Save grading system</button>
          </div>
          @if (scaleError()) {
            <p class="field-error" role="alert">{{ scaleError() }}</p>
          }
          <p class="form-hint">
            Changing points recalculates all existing records and saved scenarios. You cannot remove
            or rename grades already in use. Pending includes blank grades and non-credit, non-GPA
            grades such as I and W.
          </p>
        </section>
        <app-score-bands />
      </div>
      <aside>
        <section class="panel settings-section">
          <div class="panel-heading">
            <div>
              <h2>Your data belongs to you.</h2>
              <p>Keep a copy. Bring it with you.</p>
            </div>
            <app-icon name="lock" />
          </div>
          <p class="muted">
            Records are stored in this browser, for this application address. Browser cleanup, a
            different browser, or a different address can make them unavailable. The API does not
            store your records.
          </p>
          <button class="button secondary full" (click)="export()">
            <app-icon name="download" /> Export JSON backup</button
          ><button class="button secondary full" (click)="file.click()">
            <app-icon name="upload" /> Import a backup</button
          ><input
            #file
            type="file"
            accept=".json,application/json"
            class="sr-only"
            aria-label="Import JSON backup"
            (change)="importFile($event)"
          />
          @if (importError()) {
            <p class="field-error" role="alert">{{ importError() }}</p>
          }
          <p class="form-hint">
            Imports are validated before replacing your current workspace. Export first if you want
            to keep both.
          </p>
        </section>
        <section class="panel settings-section danger-zone">
          <h3>A fresh start</h3>
          <p>Remove semesters, scenarios, goals, and preferences from this browser.</p>
          <button class="text-button danger-text" (click)="reset()">
            Reset all application data <app-icon name="arrow" />
          </button>
        </section>
        <div class="aside-note">
          <h3>About repeated courses</h3>
          <p>
            The selected custom policy uses the latest finalized, non-excluded attempt, even if
            lower. Pending / incomplete attempts do not replace grades. Completed non-GPA grades
            (such as P) replace earlier grades without contributing GPA points. This is not a
            universal university policy.
          </p>
          <h3>About completed credits</h3>
          <p>
            Attempted credits count every attempt. Unique earned credits count each linked course
            once if any attempt earns credit, even after a later failure. GPA Calculator does not
            determine graduation eligibility. Different-credit retakes are unsupported; linked
            credit hours are fixed.
          </p>
        </div>
      </aside>
    </div>`,
})
export class SettingsComponent {
  store = inject(Store);
  confirm = inject(ConfirmService);
  draft: GradeRule[] = structuredClone(this.store.data().scale);
  scaleError = signal('');
  importError = signal('');
  defaultRules = defaultScale;
  setTheme(theme: 'light' | 'dark') {
    this.store.update((d) => (d.preferences.theme = theme));
  }
  precision(n: number) {
    this.store.update((d) => (d.preferences.precision = n));
  }
  saveScale() {
    try {
      const next = structuredClone(this.store.data());
      next.scale = this.draft.map((g) => ({
        ...g,
        label: g.label.trim(),
        points: g.points === null ? null : Number(g.points),
      }));
      const used = [
        ...next.semesters.flatMap((s) => s.courses),
        ...next.scenarios.flatMap((s) => s.courses),
      ].find((c) => c.grade && !next.scale.some((g) => g.label === c.grade));
      if (used)
        throw new Error(
          `Grade ${used.grade} is in use. Update those courses and scenarios before renaming or removing it.`,
        );
      const max = Math.max(...next.scale.map((g) => g.points ?? 0));
      next.target.gpa = Math.min(next.target.gpa, max);
      const validated = validateData(next);
      this.store.replace(validated);
      this.draft = structuredClone(validated.scale);
      this.scaleError.set('');
      this.store.toast('Grading system saved');
    } catch (e) {
      this.scaleError.set((e as Error).message);
    }
  }
  export() {
    this.store.persistence.download(
      this.store.data(),
      `gpa-calculator-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
    this.store.toast('Backup exported');
  }
  async importFile(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000)
        throw new Error('The backup is too large. Use a JSON file smaller than 5 MB.');
      const next = validateData(JSON.parse(await file.text()));
      this.importError.set('');
      this.confirm.ask(
        'Replace this workspace?',
        `This validated backup contains ${next.semesters.length} semesters and ${next.scenarios.length} scenarios. Your current records will be replaced.`,
        () => {
          this.store.replace(next);
          this.draft = structuredClone(next.scale);
          this.store.toast('Backup imported');
        },
        'Import backup',
      );
    } catch (e) {
      this.importError.set(
        e instanceof SyntaxError ? 'This is not a valid JSON backup.' : (e as Error).message,
      );
    } finally {
      input.value = '';
    }
  }
  reset() {
    this.confirm.ask(
      'Start over completely?',
      'All academic records, scenarios, and settings in this browser will be removed. Export a backup first if you may need them again.',
      () => {
        this.store.replace(freshData());
        this.draft = defaultScale();
        this.store.toast('Workspace reset');
      },
      'Reset everything',
    );
  }
}
