import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Course, Scenario, SimulationResult } from '../../core/models';
import { Store } from '../../core/store.service';
import { apiError } from '../../core/api.service';
import { ConfirmService } from '../../shared/confirm.service';
import { CourseEditorComponent } from '../../shared/course-editor.component';
import { CourseTableComponent } from '../../shared/course-table.component';
import { DialogComponent } from '../../shared/dialog.component';
import { IconComponent } from '../../shared/icon.component';
import { ChartComponent } from '../../shared/chart.component';
import { AnimatedNumberComponent } from '../../shared/animated-number.component';
@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [
    FormsModule,
    CourseEditorComponent,
    CourseTableComponent,
    DialogComponent,
    IconComponent,
    ChartComponent,
    AnimatedNumberComponent,
  ],
  template: ` <section class="page-heading">
      <div>
        <div class="eyebrow">POSSIBILITIES, NOT PREDICTIONS</div>
        <h1>A little “what if”<span class="heading-dot">.</span></h1>
        <p>Explore your next semester. Your academic record stays exactly as it is.</p>
      </div>
      <button class="button secondary" [disabled]="!courses().length" (click)="saveOpen.set(true)">
        <app-icon name="plus" /> Save scenario
      </button>
    </section>
    @if (error()) {
      <div class="alert error" role="alert">
        {{ error() }}<button class="text-button" (click)="retry.update(increment)">Retry</button>
      </div>
    }
    <div class="simulation-summary">
      <div>
        <span class="eyebrow">CURRENT GPA</span
        ><strong>{{ store.format(result()?.current?.gpa) }}</strong
        ><small
          >{{ result()?.current?.gpaCredits ?? '—' }} GPA credits from completed semesters</small
        >
      </div>
      <div class="projection-arrow"><app-icon name="arrow" /></div>
      <div>
        <span class="eyebrow">PROJECTED CUMULATIVE</span
        ><strong
          ><app-number
            [value]="result()?.projected?.gpa"
            [precision]="store.data().preferences.precision" /></strong
        ><small>
          @if (result()?.change !== null && result()?.change !== undefined) {
            <span class="positive"
              >{{ result()!.change! >= 0 ? '+' : '' }}{{ store.format(result()?.change) }}</span
            >
            GPA change
          } @else {
            Add grades to see your projection
          }
        </small>
      </div>
      <div class="projection-tag">
        <span class="pill">SIMULATION</span>
        <p>A possibility to plan around.<br />Never a promise of future results.</p>
      </div>
    </div>
    <div class="workspace-grid">
      <div>
        <section class="panel course-panel">
          <div class="panel-heading">
            <div>
              <h2>Your hypothetical courses</h2>
              <p>
                {{ result()?.future?.gpaCredits ?? 0 }} planned GPA credits ·
                {{ store.format(result()?.future?.gpa) }} expected average
              </p>
            </div>
            <button class="button primary small" (click)="editing.set(null); editor.set(true)">
              <app-icon name="plus" /> Add course
            </button>
          </div>
          @if (courses().length) {
            <div class="bulk-grade">
              <span>Try the same grade in every course</span
              ><select aria-label="Set all simulated grades" (change)="setAll($event)">
                <option value="">Choose grade…</option>
                @for (g of store.data().scale; track g.label) {
                  @if (g.points !== null) {
                    <option [value]="g.label">All {{ g.label }} · {{ g.points }} GPA</option>
                  }
                }
              </select>
            </div>
          }
          <app-course-table
            [courses]="courses()"
            (edit)="editing.set($event); editor.set(true)"
            (remove)="remove($event)"
            (changed)="save($event)"
          />
        </section>
        @if (comparison().length) {
          <section class="panel compare-panel">
            <div class="panel-heading">
              <div>
                <h2>A few possible futures</h2>
                <p>Saved scenarios use your current records and current grading scale.</p>
              </div>
            </div>
            <app-chart
              [labels]="comparisonLabels()"
              [datasets]="comparisonData()"
              kind="bar"
              [max]="store.max()"
              label="Projected GPA comparison of saved scenarios"
            />
          </section>
        }
      </div>
      <aside>
        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>Saved possibilities</h2>
              <p>Up to 12 scenarios to compare</p>
            </div>
          </div>
          @for (s of store.data().scenarios; track s.id) {
            <div class="saved-scenario">
              <button class="scenario-load" (click)="load(s)">
                <span>{{ s.name }}</span
                ><small>{{ s.courses.length }} hypothetical courses</small></button
              ><button
                class="icon-button danger-hover"
                [attr.aria-label]="'Delete ' + s.name"
                (click)="deleteScenario(s)"
              >
                <app-icon name="trash" />
              </button>
            </div>
          } @empty {
            <div class="mini-empty">
              <app-icon name="simulator" />
              <h3>Keep a possibility.</h3>
              <p>Build a scenario, give it a name, and compare it with your next idea.</p>
            </div>
          }
        </section>
        <section class="aside-note">
          <h3>Perspective helps.</h3>
          <p>
            As your GPA-counted credits grow, each new course has a smaller effect on your
            cumulative GPA. Every calculation here uses your full quality-point total.
          </p>
        </section>
      </aside>
    </div>
    @if (editor()) {
      <app-course-editor
        [course]="editing()"
        (closed)="editor.set(false)"
        (saved)="save($event); editor.set(false)"
      />
    }
    @if (saveOpen()) {
      <app-dialog
        title="Give this possibility a name."
        eyebrow="SAVE SCENARIO"
        (closed)="saveOpen.set(false)"
        ><form (ngSubmit)="saveScenario()">
          <label
            >Scenario name<input
              name="scenarioName"
              [(ngModel)]="scenarioName"
              maxlength="80"
              placeholder="e.g. My ambitious semester"
              required
              autofocus
          /></label>
          <p class="form-hint">
            Only this hypothetical course list is saved. Projections recalculate against your latest
            actual records.
          </p>
          <div class="dialog-actions">
            <button type="button" class="button secondary" (click)="saveOpen.set(false)">
              Cancel</button
            ><button
              class="button primary"
              [disabled]="!scenarioName.trim() || store.data().scenarios.length >= 12"
            >
              Save scenario
            </button>
          </div>
          @if (store.data().scenarios.length >= 12) {
            <p class="field-error">Delete an existing scenario to make room.</p>
          }
        </form></app-dialog
      >
    }`,
})
export class SimulatorComponent {
  store = inject(Store);
  confirm = inject(ConfirmService);
  courses = signal<Course[]>([]);
  result = signal<SimulationResult | null>(null);
  comparison = signal<{ name: string; gpa: number | null }[]>([]);
  error = signal('');
  editor = signal(false);
  editing = signal<Course | null>(null);
  saveOpen = signal(false);
  scenarioName = '';
  retry = signal(0);
  increment = (n: number) => n + 1;
  comparisonLabels = computed(() => this.comparison().map((s) => s.name));
  comparisonData = computed(() => [
    {
      label: 'Projected cumulative GPA',
      data: this.comparison().map((s) => s.gpa),
      backgroundColor: '#719776',
      borderColor: '#719776',
      borderRadius: 5,
    },
  ]);
  constructor() {
    effect((onCleanup) => {
      const future = this.courses(),
        d = this.store.data(),
        semesters = this.store.completedSemesters(),
        current = semesters.flatMap((s) => s.courses);
      this.retry();
      this.result.set(null);
      this.comparison.set([]);
      let sub: { unsubscribe(): void } | undefined;
      const timer = setTimeout(() => {
        sub = forkJoin([
          this.store.api.simulate(d.scale, current, future, semesters),
          ...d.scenarios.map((s) =>
            this.store.api.simulate(d.scale, current, s.courses, semesters),
          ),
        ]).subscribe({
          next: (rs) => {
            this.result.set(rs[0]);
            this.comparison.set(
              d.scenarios.map((s, i) => ({ name: s.name, gpa: rs[i + 1].projected.gpa })),
            );
            this.error.set('');
          },
          error: (e) => this.error.set(apiError(e)),
        });
      }, 120);
      onCleanup(() => {
        clearTimeout(timer);
        sub?.unsubscribe();
      });
    });
  }
  save(c: Course) {
    this.courses.update((cs) =>
      cs.some((x) => x.id === c.id) ? cs.map((x) => (x.id === c.id ? c : x)) : [...cs, c],
    );
  }
  remove(c: Course) {
    this.courses.update((cs) => cs.filter((x) => x.id !== c.id));
  }
  setAll(e: Event) {
    const grade = (e.target as HTMLSelectElement).value;
    if (grade) this.courses.update((cs) => cs.map((c) => ({ ...c, grade })));
    (e.target as HTMLSelectElement).value = '';
  }
  saveScenario() {
    if (!this.scenarioName.trim() || this.store.data().scenarios.length >= 12) return;
    this.store.update((d) =>
      d.scenarios.push({
        id: crypto.randomUUID(),
        name: this.scenarioName.trim(),
        courses: this.courses().map((c) => ({ ...c, id: crypto.randomUUID() })),
      }),
    );
    this.saveOpen.set(false);
    this.scenarioName = '';
    this.store.toast('Scenario saved');
  }
  load(s: Scenario) {
    this.courses.set(structuredClone(s.courses));
    this.store.toast(`Loaded ${s.name}`);
  }
  deleteScenario(s: Scenario) {
    this.confirm.ask(
      'Delete this scenario?',
      `${s.name} will be removed. Your academic records are unaffected.`,
      () => this.store.update((d) => (d.scenarios = d.scenarios.filter((x) => x.id !== s.id))),
    );
  }
}
