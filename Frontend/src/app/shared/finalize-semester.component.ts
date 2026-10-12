import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Semester } from '../core/models';
import { Store } from '../core/store.service';
import { apiError } from '../core/api.service';
import { DialogComponent } from './dialog.component';
@Component({
  selector: 'app-finalize-semester',
  standalone: true,
  imports: [FormsModule, DialogComponent],
  template: ` <app-dialog
    title="Review your final grades."
    eyebrow="COMPLETE CURRENT SEMESTER"
    (closed)="close()"
  >
    <p class="form-hint">
      Only fully assessed, valid 100-mark breakdowns receive a calculated final grade. For missing
      marks, explicitly enter your official grade or go back and finish the assessments. Best-case
      grades are never copied automatically.
    </p>
    <form (ngSubmit)="save()">
      <div class="final-grade-list">
        @for (c of semester().courses; track c.id) {
          @let p = potential(c.id);
          <label
            ><span
              ><strong>{{ c.name }}</strong
              ><small>{{
                p?.source === 'recorded'
                  ? 'Previously entered grade'
                  : p?.allGraded && p?.valid
                    ? 'All assessed: ' + p?.earned + '/100 → ' + p?.grade
                    : 'Missing marks or invalid breakdown — official grade required'
              }}</small></span
            ><select
              [(ngModel)]="grades[c.id]"
              [name]="c.id"
              [disabled]="busy()"
              [attr.aria-label]="'Final grade for ' + c.name"
            >
              <option value="">Choose final grade…</option>
              @for (g of store.data().scale; track g.label) {
                <option [value]="g.label">
                  {{ g.label }} · {{ g.points === null ? 'Non-GPA' : g.points + ' GPA' }}
                </option>
              }
            </select></label
          >
        }
      </div>
      <label class="check-label"
        ><input type="checkbox" name="confirmed" [(ngModel)]="confirmed" [disabled]="busy()" />I
        reviewed every final grade, including any entered manually for incomplete
        assessments.</label
      >
      <p class="form-hint">
        This records the selected grades, marks {{ semester().name }} Completed, and ends best-case
        tracking. Assessment entries are preserved. Recorded grades remain editable in the course
        table.
      </p>
      @if (error()) {
        <p class="field-error" role="alert">{{ error() }}</p>
      }
      <div class="dialog-actions">
        <button type="button" class="button secondary" (click)="close()" [disabled]="busy()">
          Keep tracking</button
        ><button class="button primary" [disabled]="busy() || !confirmed || !ready()">
          {{ busy() ? 'Saving…' : 'Confirm final grades' }}
        </button>
      </div>
    </form>
  </app-dialog>`,
})
export class FinalizeSemesterComponent {
  semester = input.required<Semester>();
  closed = output<void>();
  store = inject(Store);
  grades: Record<string, string> = {};
  confirmed = false;
  busy = signal(false);
  error = signal('');
  ngOnInit() {
    for (const c of this.semester().courses) {
      const p = this.potential(c.id);
      this.grades[c.id] = c.grade ?? (p?.allGraded && p.valid ? (p.grade ?? '') : '');
    }
  }
  potential(id: string) {
    return this.store.potential()?.courses.find((c) => c.attemptId === id);
  }
  ready() {
    return this.semester().courses.every((c) => !!this.grades[c.id]);
  }
  close() {
    if (!this.busy()) this.closed.emit();
  }
  save() {
    if (!this.confirmed || !this.ready() || this.busy()) return;
    const snapshot = structuredClone(this.store.data());
    if (snapshot.currentSemesterId !== this.semester().id) {
      this.error.set('The current semester changed. Close and review again.');
      return;
    }
    this.busy.set(true);
    this.store.api
      .finalize(
        snapshot,
        this.semester().courses.map((c) => ({ attemptId: c.id, grade: this.grades[c.id] })),
      )
      .subscribe({
        next: (final) => {
          if (
            JSON.stringify([
              snapshot.scale,
              snapshot.semesters,
              snapshot.currentSemesterId,
              snapshot.scoreBands,
            ]) !==
            JSON.stringify([
              this.store.data().scale,
              this.store.data().semesters,
              this.store.data().currentSemesterId,
              this.store.data().scoreBands,
            ])
          ) {
            this.busy.set(false);
            this.error.set('Your records changed during review. Close and review again.');
            return;
          }
          this.store.update((d) => {
            const s = d.semesters.find((s) => s.id === final.id)!;
            for (const c of s.courses) c.grade = final.courses.find((x) => x.id === c.id)!.grade;
            s.status = 'completed';
            d.currentSemesterId = null;
          });
          this.busy.set(false);
          this.store.toast('Final grades saved. Semester completed.');
          this.closed.emit();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(apiError(e));
        },
      });
  }
}
