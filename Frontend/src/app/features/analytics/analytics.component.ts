import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../../core/store.service';
import { ChartComponent } from '../../shared/chart.component';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [RouterLink, ChartComponent, IconComponent],
  template: `<section class="page-heading">
      <div>
        <div class="eyebrow">A DIFFERENT PERSPECTIVE</div>
        <h1>See how far you’ve come<span class="heading-dot">.</span></h1>
        <p>The patterns behind your progress, built from your real records.</p>
      </div>
      <span class="pill">{{ store.max() }} GPA SCALE</span>
    </section>
    @if ((semesters().length || store.current()) && store.actual()) {
      <div class="three-metrics">
        <section class="metric">
          <span class="metric-label">Best original semester</span>
          <div class="metric-value">{{ store.format(best()?.original?.gpa) }}</div>
          <p>{{ best()?.name ?? 'No graded attempts yet' }}</p>
        </section>
        <section class="metric">
          <span class="metric-label">Lowest original semester</span>
          <div class="metric-value">{{ store.format(lowest()?.original?.gpa) }}</div>
          <p>{{ lowest()?.name ?? 'No graded attempts yet' }}</p>
        </section>
        <section class="metric">
          <span class="metric-label">Historical cumulative trend</span>
          <div class="metric-value">{{ store.signed(trend()) }}</div>
          <p>First to latest semester with a cumulative GPA</p>
        </section>
      </div>
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>The shape of your progress</h2>
            <p>What you earned then. How your record looks today.</p>
          </div>
        </div>
        <div class="segmented history-toggle" aria-label="GPA history view">
          @for (v of views; track v.value) {
            <button
              type="button"
              [class.active]="view() === v.value"
              [attr.aria-pressed]="view() === v.value"
              (click)="view.set(v.value)"
            >
              {{ v.label }}
            </button>
          }
        </div>
        <app-chart
          [labels]="progressLabels()"
          [datasets]="progress()"
          [details]="chartDetails()"
          [max]="store.max()"
          label="Historical and retrospectively adjusted cumulative GPA"
        />
        <p class="form-hint">
          Historical uses only attempts available by that semester. Retrospective applies today’s
          replacement grades to courses first taken by that semester. Larger markers identify retake
          activity or changed grades.
        </p>
        <details class="history-table">
          <summary>Explore semester values</summary>
          <div class="table-scroll">
            <table class="course-table">
              <thead>
                <tr>
                  <th>Semester</th>
                  <th>Original GPA</th>
                  <th>Adjusted GPA</th>
                  <th>Change</th>
                  <th>Historical cumulative</th>
                  <th>Retrospective cumulative</th>
                </tr>
              </thead>
              <tbody>
                @for (s of semesters(); track s.id) {
                  <tr>
                    <td>{{ s.name }}</td>
                    <td>{{ store.format(s.original.gpa) }}</td>
                    <td>{{ store.format(s.result.gpa) }}</td>
                    <td>{{ store.signed(s.improvement) }}</td>
                    <td>{{ store.format(s.historical.gpa) }}</td>
                    <td>{{ store.format(s.cumulativeGpa) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="form-hint">
            — means no GPA-counted courses, not a zero GPA. A retake-only semester has an original
            attempt GPA, but no adjusted semester GPA.
          </p>
        </details>
      </section>
      <div class="two-columns">
        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>Credits, collected</h2>
              <p>Unique earned credits at the end of each semester</p>
            </div>
          </div>
          <app-chart
            [labels]="labels()"
            [datasets]="credits()"
            kind="bar"
            label="Unique earned credit hours over time"
          />
        </section>
        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>A closer look at your grades</h2>
              <p>Completed-semester attempt grades, including GPA-excluded attempts</p>
            </div>
          </div>
          <app-chart
            [labels]="gradeLabels()"
            [datasets]="distribution()"
            kind="bar"
            label="Number of attempts per grade"
          />
        </section>
      </div>
      <section class="panel retake-impact">
        <div class="panel-heading">
          <div>
            <div class="eyebrow">ANOTHER CHAPTER</div>
            <h2>The effect of a retake</h2>
            <p>Every attempt stays in your story, even when its GPA contribution changes.</p>
          </div>
        </div>
        <div class="three-metrics compact-metrics">
          <div>
            <span class="metric-label">Retaken courses</span
            ><strong>{{ store.actual()?.retakenCourses }}</strong>
          </div>
          <div>
            <span class="metric-label">Current GPA impact</span
            ><strong>{{ store.signed(store.actual()?.retakeImpact) }}</strong>
          </div>
          <div>
            <span class="metric-label">Original semesters with retakes</span
            ><strong>{{ affected() }}</strong>
          </div>
        </div>
        @for (c of retakes(); track c.courseId) {
          <article class="retake-row">
            <div class="retake-row-heading">
              <div>
                <h3>
                  {{ c.name }} <span class="muted">{{ c.code }}</span>
                </h3>
                <p>
                  {{ c.originalSemesterName }} →
                  {{ c.effectiveSemesterName ?? 'No effective grade' }} · {{ c.credits }} unique
                  credits
                </p>
              </div>
              <span class="grade-comparison"
                >{{ c.originalGrade ?? 'Pending' }} <span>→</span>
                {{ c.effectiveGrade ?? '—' }}</span
              >
            </div>
            <div class="retake-facts">
              <span
                >Original semester GPA
                <strong
                  >{{ store.format(origin(c.originalSemesterId)?.original?.gpa) }} →
                  {{ store.format(origin(c.originalSemesterId)?.result?.gpa) }}</strong
                ></span
              ><span
                >Current cumulative impact
                <strong>{{ store.signed(c.cumulativeImpact) }}</strong></span
              >
            </div>
            <details class="attempt-history">
              <summary>{{ c.attempts.length }} attempts · view history</summary>
              @for (a of c.attempts; track a.id) {
                <p>
                  <strong>{{ a.semesterName }}</strong> · {{ a.grade ?? 'Pending' }}
                  @if (a.effective) {
                    <span class="badge">Effective</span>
                  }
                  @if (a.order > 1) {
                    <span class="muted">{{
                      !a.finalized || a.excluded
                        ? 'No replacement'
                        : store.signed(a.gpaImpact) + ' cumulative change at that time'
                    }}</span>
                  }
                </p>
              }
            </details>
          </article>
        } @empty {
          <div class="mini-empty">
            <h3>Room for a second attempt.</h3>
            <p>
              Select “Retake Existing Course” when adding a course in a later semester to see its
              effect here.
            </p>
          </div>
        }
        <p class="form-hint">
          Total impact compares today’s GPA with the same record using only first attempts. Each
          course’s impact compares today’s GPA with just that course restored to its first attempt;
          individual impacts may not sum when GPA eligibility changes. Semester changes include all
          replacements. — means a comparison has no GPA.
        </p>
      </section>
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>Your academic journey</h2>
            <p>A timeline drawn from your saved attempts</p>
          </div>
        </div>
        <ol class="academic-timeline">
          @for (s of semesters(); track s.id; let i = $index; let last = $last) {
            <li>
              <div>
                <h3>
                  {{ s.name }}
                  @if (last) {
                    <span class="badge">Current standing</span>
                  }
                </h3>
                <p>
                  {{ i === 0 ? 'First recorded semester' : journey(i) }} · Historical cumulative
                  {{ store.format(s.historical.gpa) }} · {{ s.historical.completedCredits }} unique
                  earned credits
                </p>
                @for (change of s.retakeChanges; track $index) {
                  <p class="timeline-change">{{ change }}</p>
                }
              </div>
            </li>
          }
        </ol>
      </section>
      <div class="inline-note">
        <app-icon name="info" />
        <p>
          This custom replacement policy is not a universal university rule. Historical values are
          reconstructed from saved grades and semester order; editing past records or grade rules
          recalculates them. Reorder semesters on the Semesters page.
        </p>
      </div>
    } @else {
      <section class="empty-state panel">
        <div class="empty-symbol"><app-icon name="analytics" /></div>
        <h2>
          {{
            store.busy()
              ? 'Bringing your history into view…'
              : 'Good insights start with your story.'
          }}
        </h2>
        <p>
          {{
            store.error()
              ? 'Reconnect the calculation server to explore your saved history.'
              : store.busy()
                ? 'Calculating from your saved attempts.'
                : 'Add a semester to begin your academic timeline.'
          }}
        </p>
        <a routerLink="/semesters" class="button primary"
          >Go to semesters <app-icon name="arrow"
        /></a>
      </section>
    }`,
})
export class AnalyticsComponent {
  store = inject(Store);
  view = signal('both');
  views = [
    { value: 'both', label: 'Compare both' },
    { value: 'historical', label: 'Historical' },
    { value: 'adjusted', label: 'Retrospective' },
  ];
  semesters = computed(() => this.store.actual()?.semesters ?? []);
  graded = computed(() => this.semesters().filter((s) => s.original.gpa !== null));
  best = computed(() => [...this.graded()].sort((a, b) => b.original.gpa! - a.original.gpa!).at(0));
  lowest = computed(() =>
    [...this.graded()].sort((a, b) => a.original.gpa! - b.original.gpa!).at(0),
  );
  trend = computed(() => {
    const ss = this.semesters().filter((s) => s.historical.gpa !== null);
    return ss.length > 1 ? ss.at(-1)!.historical.gpa! - ss[0].historical.gpa! : null;
  });
  labels = computed(() => this.semesters().map((s) => s.name));
  progressLabels = computed(() => [
    ...this.labels(),
    ...(this.store.current() ? [this.store.current()!.name + ' · best case'] : []),
  ]);
  progress = computed(() => [
    {
      label: 'Historical cumulative',
      data: [
        ...this.semesters().map((s) => s.historical.gpa),
        ...(this.store.current() ? [null] : []),
      ],
      borderColor: '#2e6952',
      backgroundColor: '#2e6952',
      pointRadius: this.semesters().map((s) => (s.retakeChanges.length ? 7 : 4)),
      hidden: this.view() === 'adjusted',
    },
    {
      label: 'Retrospectively adjusted',
      data: [
        ...this.semesters().map((s) => s.cumulativeGpa),
        ...(this.store.current() ? [null] : []),
      ],
      borderColor: '#a0b58b',
      backgroundColor: '#a0b58b',
      borderDash: [5, 4],
      pointRadius: this.semesters().map((s) => (s.improvement ? 7 : 4)),
      hidden: this.view() === 'historical',
    },
    ...(this.store.current()
      ? [
          {
            label: 'Best case · current semester',
            data: [
              ...this.semesters().map((s, i) =>
                i === this.semesters().length - 1 ? s.historical.gpa : null,
              ),
              this.store.potential()?.cumulative?.gpa ?? null,
            ],
            borderColor: '#b58a45',
            backgroundColor: '#b58a45',
            borderDash: [3, 5],
            pointRadius: 6,
          },
        ]
      : []),
  ]);
  chartDetails = computed(() => [
    ...this.semesters().map((s) => [
      `Original / adjusted semester: ${this.store.format(s.original.gpa)} / ${this.store.format(s.result.gpa)}`,
      `Semester change: ${this.store.signed(s.improvement)}`,
      `${s.original.attemptedCredits} attempted credits this semester`,
      `${s.historical.completedCredits} unique earned / ${s.historical.gpaCredits} GPA credits at that time`,
      ...s.retakeChanges,
      ...(this.store
        .actual()
        ?.courses.filter((c) => c.originalSemesterId === s.id && c.attempts.length > 1)
        .map(
          (c) =>
            `${c.name}: ${c.originalGrade ?? 'Pending'} → ${c.effectiveGrade ?? '—'} (${c.effectiveSemesterName ?? 'pending'})`,
        ) ?? []),
    ]),
    ...(this.store.current()
      ? [
          [
            'Best case only · ungraded assessments assumed full marks',
            `${this.store.potential()?.marksLost ?? '—'} marks lost · ${this.store.potential()?.remaining ?? '—'} still available`,
            this.store.potential()?.issue ?? 'Completed historical values are unchanged.',
          ],
        ]
      : []),
  ]);
  credits = computed(() => [
    {
      label: 'Unique earned credits to date',
      data: this.semesters().map((s) => s.historical.completedCredits),
      backgroundColor: '#91aa78',
      borderColor: '#91aa78',
      borderRadius: 4,
    },
  ]);
  gradeLabels = computed(() =>
    this.store
      .data()
      .scale.filter((g) =>
        this.store
          .completedSemesters()
          .flatMap((s) => s.courses)
          .some((c) => c.grade === g.label),
      )
      .map((g) => g.label),
  );
  distribution = computed(() => [
    {
      label: 'Attempts',
      data: this.gradeLabels().map(
        (g) =>
          this.store
            .completedSemesters()
            .flatMap((s) => s.courses)
            .filter((c) => c.grade === g).length,
      ),
      backgroundColor: '#547d68',
      borderColor: '#547d68',
      borderRadius: 4,
    },
  ]);
  retakes = computed(() =>
    (this.store.actual()?.courses ?? [])
      .filter((c) => c.attempts.length > 1)
      .sort((a, b) => (b.cumulativeImpact ?? -Infinity) - (a.cumulativeImpact ?? -Infinity)),
  );
  affected = computed(() => new Set(this.retakes().map((c) => c.originalSemesterId)).size);
  origin(id: string) {
    return this.semesters().find((s) => s.id === id);
  }
  journey(i: number) {
    const a = this.semesters()[i - 1].historical.gpa,
      b = this.semesters()[i].historical.gpa;
    return a === null || b === null
      ? 'Academic record updated'
      : b > a
        ? `GPA increased ${this.store.signed(b - a)}`
        : b < a
          ? `GPA decreased ${this.store.signed(b - a)}`
          : 'GPA held steady';
  }
}
