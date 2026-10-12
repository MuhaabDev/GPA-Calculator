import { Component, input, inject, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '../core/store.service';
import { Assessment, Course, CoursePotential } from '../core/models';
import { ConfirmService } from './confirm.service';
@Component({
  selector: 'app-assessment-course',
  standalone: true,
  imports: [FormsModule],
  template: `
    <article class="panel assessment-card">
      <div class="assessment-heading">
        <div>
          <div class="eyebrow">{{ course().name }} · {{ course().credits }} CREDITS</div>
          <h3>
            {{
              potential()?.source === 'recorded'
                ? 'Recorded final grade'
                : 'Highest Achievable Grade'
            }}
          </h3>
        </div>
        <span class="pill">{{
          potential()?.source === 'recorded' ? 'FINAL GRADE ENTERED' : 'IN PROGRESS'
        }}</span>
      </div>
      @if (potential(); as p) {
        <div class="assessment-values">
          <div>
            <strong>{{ p.maximumScore ?? '—' }}</strong
            ><span> / 100</span><small>{{ p.lost }} marks lost so far</small>
          </div>
          <div>
            <strong>{{ p.grade ?? '—' }}</strong
            ><small
              >{{ store.format(p.points) }}
              {{ p.source === 'recorded' ? 'recorded GPA' : 'potential GPA' }}
              @if (course().excluded) {
                · excluded from GPA
              }
            </small>
          </div>
        </div>
        @if (p.source !== 'recorded' && p.totalMarks === 100) {
          <div
            class="marks-track"
            role="img"
            [attr.aria-label]="
              p.earned + ' earned, ' + p.lost + ' lost, ' + p.remaining + ' marks available'
            "
          >
            <span class="earned" [style.width.%]="p.earned"></span
            ><span class="lost" [style.width.%]="p.lost"></span
            ><span class="remaining" [style.width.%]="p.remaining"></span>
          </div>
          <div class="marks-legend">
            <span><i class="earned"></i>{{ p.earned }} earned</span
            ><span><i class="lost"></i>{{ p.lost }} lost</span
            ><span><i class="remaining"></i>{{ p.remaining }} available</span>
          </div>
        }
        @if (p.issue) {
          <p class="field-error">{{ p.issue }}</p>
        }
        @if (p.source === 'recorded') {
          <p class="form-hint">
            The explicitly entered grade is fixed in projections. Assessment scores do not overwrite
            it.
          </p>
          <button class="text-button" (click)="resume()">Use assessment tracking instead</button>
        }
      }
      <details class="assessment-details">
        <summary>
          Assessment breakdown
          <span>{{
            course().assessments === undefined ? 'Not configured' : draft.length + ' sections'
          }}</span>
        </summary>
        @if (course().assessments === undefined) {
          <div class="assessment-empty">
            <p>
              Start with 100 marks still available. Build this course’s own breakdown; no universal
              assessment weights are assumed.
            </p>
            <button class="button secondary small" (click)="configure()">
              Configure assessments
            </button>
          </div>
        } @else {
          <div class="assessment-tools">
            <span class="form-hint"
              >Blank earned marks = Not Graded. Zero = Graded. Enter earned or lost; both edit the
              same result.</span
            ><button class="text-button" [disabled]="draft.length >= 100" (click)="add()">
              + Add section
            </button>
          </div>
          <div class="table-scroll">
            <table class="assessment-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Maximum</th>
                  <th>Earned</th>
                  <th>Lost</th>
                  <th>Status / actions</th>
                </tr>
              </thead>
              <tbody>
                @for (a of draft; track a.id; let i = $index) {
                  <tr>
                    <td>
                      <input
                        [(ngModel)]="a.name"
                        (change)="save()"
                        maxlength="80"
                        [attr.aria-label]="'Assessment name ' + (i + 1)"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        [(ngModel)]="a.maximumMarks"
                        (ngModelChange)="save()"
                        [attr.aria-label]="'Maximum marks for ' + a.name"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        [max]="a.maximumMarks"
                        step="0.01"
                        placeholder="—"
                        [(ngModel)]="a.earnedMarks"
                        (ngModelChange)="save()"
                        [attr.aria-label]="'Earned marks for ' + a.name"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        [max]="a.maximumMarks"
                        step="0.01"
                        placeholder="—"
                        [ngModel]="a.earnedMarks === null ? null : a.maximumMarks - a.earnedMarks"
                        (ngModelChange)="lost(a, $event)"
                        [attr.aria-label]="'Lost marks for ' + a.name"
                      />
                    </td>
                    <td>
                      <span class="badge">{{
                        a.earnedMarks === null ? 'Not Graded' : 'Graded'
                      }}</span>
                      <div class="assessment-actions">
                        <button
                          class="text-button"
                          (click)="reset(a)"
                          [attr.aria-label]="'Reset ' + a.name + ' to Not Graded'"
                        >
                          Reset</button
                        ><button
                          class="text-button"
                          (click)="remove(a)"
                          [attr.aria-label]="'Delete assessment ' + a.name"
                        >
                          Delete</button
                        ><button
                          class="text-button"
                          [disabled]="i === 0"
                          (click)="move(i, -1)"
                          [attr.aria-label]="'Move ' + a.name + ' up'"
                        >
                          ↑</button
                        ><button
                          class="text-button"
                          [disabled]="i === draft.length - 1"
                          (click)="move(i, 1)"
                          [attr.aria-label]="'Move ' + a.name + ' down'"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="form-hint">
            {{ draftTotal() }} / 100 marks allocated · A draft total can be saved, but the course
            and semester projection are unavailable until it equals 100.
          </p>
        }
        @if (error()) {
          <p class="field-error" role="alert">Not saved: {{ error() }}</p>
          <button class="text-button" (click)="discard()">Restore last saved entries</button>
        }
      </details>
    </article>
  `,
})
export class AssessmentCourseComponent {
  course = input.required<Course>();
  semesterId = input.required<string>();
  potential = input<CoursePotential>();
  store = inject(Store);
  confirm = inject(ConfirmService);
  draft: Assessment[] = [];
  error = signal('');
  private savedKey = '';
  constructor() {
    effect(() => {
      const key = JSON.stringify([this.course().id, this.course().assessments]);
      if (key !== this.savedKey) {
        this.savedKey = key;
        this.draft = structuredClone(this.course().assessments ?? []).sort(
          (a, b) => a.displayOrder - b.displayOrder,
        );
        this.error.set('');
      }
    });
  }
  row(name = 'Assessment', maximumMarks = 0): Assessment {
    return {
      id: crypto.randomUUID(),
      name,
      maximumMarks,
      earnedMarks: null,
      displayOrder: this.draft.length,
    };
  }
  configure() {
    this.draft = [this.row('Course total', 100)];
    this.save();
  }
  add() {
    this.draft.push(this.row('New assessment'));
    this.save();
  }
  draftTotal() {
    return (
      Math.round(this.draft.reduce((sum, a) => sum + (Number(a.maximumMarks) || 0), 0) * 1000000) /
      1000000
    );
  }
  save() {
    if (
      this.draft.some(
        (a) =>
          !a.name.trim() ||
          a.maximumMarks === null ||
          !Number.isFinite(a.maximumMarks) ||
          a.maximumMarks < 0 ||
          a.maximumMarks > 100 ||
          (a.earnedMarks !== null &&
            (!Number.isFinite(a.earnedMarks) ||
              a.earnedMarks < 0 ||
              a.earnedMarks > a.maximumMarks)),
      )
    ) {
      this.error.set(
        'Use a name, maximum marks from 0 to 100, and earned marks within that maximum. Correct or clear earned marks before reducing a weight.',
      );
      return;
    }
    const rows = this.draft.map((a, i) => ({ ...a, name: a.name.trim(), displayOrder: i }));
    if (this.store.saveCourse(this.semesterId(), { ...this.course(), assessments: rows }, false)) {
      this.error.set('');
    } else this.error.set('The changes could not be saved. Check the displayed message.');
  }
  lost(a: Assessment, value: number | null) {
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > a.maximumMarks)) {
      this.error.set('Lost marks must be between zero and the assessment maximum.');
      return;
    }
    a.earnedMarks = value === null ? null : Math.round((a.maximumMarks - value) * 1e8) / 1e8;
    this.save();
  }
  reset(a: Assessment) {
    if (a.earnedMarks === null) return;
    this.confirm.ask(
      'Reset this assessment?',
      `${a.name} will return to Not Graded. Its full marks will become available in the best-case projection.`,
      () => {
        a.earnedMarks = null;
        this.save();
      },
      'Reset assessment',
    );
  }
  remove(a: Assessment) {
    this.confirm.ask(
      'Delete this assessment?',
      `${a.name} and its entered marks will be removed. Adjust the remaining weights to 100 before using projections.`,
      () => {
        this.draft = this.draft.filter((x) => x.id !== a.id);
        this.save();
      },
    );
  }
  move(i: number, delta: number) {
    [this.draft[i], this.draft[i + delta]] = [this.draft[i + delta], this.draft[i]];
    this.save();
  }
  discard() {
    this.draft = structuredClone(this.course().assessments ?? []);
    this.error.set('');
  }
  resume() {
    this.confirm.ask(
      'Use assessment potential?',
      `Clear the manually entered grade for ${this.course().name}? Its assessments will determine best-case potential until you confirm a final grade.`,
      () => this.store.saveCourse(this.semesterId(), { ...this.course(), grade: null }),
      'Use assessments',
    );
  }
}
