import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Store } from '../../core/store.service';
import { TargetResult } from '../../core/models';
import { apiError } from '../../core/api.service';
import { IconComponent } from '../../shared/icon.component';
import { AnimatedNumberComponent } from '../../shared/animated-number.component';
@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [FormsModule, IconComponent, AnimatedNumberComponent],
  template: ` <section class="page-heading">
      <div>
        <div class="eyebrow">YOUR NEXT CHAPTER, WITH INTENTION</div>
        <h1>Make room for your goals<span class="heading-dot">.</span></h1>
        <p>Know what it takes. Find a path that adds up.</p>
      </div>
      <span class="pill"><span class="local-dot"></span> GOAL SAVED AUTOMATICALLY</span>
    </section>
    @if (error()) {
      <div class="alert error" role="alert">
        {{ error() }}<button class="text-button" (click)="retry.update(increment)">Retry</button>
      </div>
    }
    <div class="planner-grid">
      <section class="panel goal-inputs">
        <div class="panel-heading">
          <div>
            <h2>Where would you like to go?</h2>
            <p>Completed semesters only · adjusted quality points and unique GPA credits</p>
          </div>
          <app-icon name="goals" />
        </div>
        <div class="current-baseline">
          <div>
            <span>Current GPA</span><strong>{{ store.format(store.actual()?.total?.gpa) }}</strong>
          </div>
          <div>
            <span>GPA-counted credits</span
            ><strong>{{ store.actual()?.total?.gpaCredits ?? '—' }}</strong>
          </div>
        </div>
        <label
          >Target cumulative GPA
          <div class="number-with-unit">
            <input
              type="number"
              [ngModel]="store.data().target.gpa"
              (ngModelChange)="setTarget('gpa', $event)"
              min="0"
              [max]="store.max()"
              step="0.01"
            /><span>/ {{ store.max().toFixed(1) }}</span>
          </div></label
        ><input
          class="range-input"
          type="range"
          aria-label="Target cumulative GPA"
          min="0"
          [max]="store.max()"
          step="0.05"
          [ngModel]="store.data().target.gpa"
          (ngModelChange)="setTarget('gpa', $event)"
        /><label
          >Future GPA-counted credits<input
            type="number"
            [ngModel]="store.data().target.credits"
            (ngModelChange)="setTarget('credits', $event)"
            min="0.01"
            max="1000"
            step="0.25"
        /></label>
        <div class="segmented">
          @for (n of [15, 30, 45, 60]; track n) {
            <button
              [class.active]="store.data().target.credits === n"
              (click)="setTarget('credits', n)"
            >
              {{ n }} credits
            </button>
          }
        </div>
        @if (inputError()) {
          <p class="field-error" role="alert">{{ inputError() }}</p>
        }
        <p class="form-hint">
          Use next semester’s credits for a semester goal, or all remaining GPA credits for a
          graduation goal.
        </p>
      </section>
      <section class="goal-result" [class.unreachable]="result() && !result()!.achievable">
        <div class="eyebrow">THE PATH TO {{ store.format(store.data().target.gpa) }}</div>
        <h2>
          {{
            result()
              ? result()!.achievable
                ? 'Within mathematical reach.'
                : 'Outside this credit window.'
              : 'Let’s calculate your path.'
          }}
        </h2>
        <div class="display-number">
          <app-number
            [value]="result() ? requiredDisplay() : null"
            [precision]="store.data().preferences.precision"
          />
        </div>
        <span class="result-unit">required future average GPA</span>
        <div class="goal-meter"><div [style.width.%]="difficulty()"></div></div>
        <div class="progress-caption">
          <span>0.0</span><span>{{ store.max().toFixed(1) }} maximum</span>
        </div>
        @if (result(); as r) {
          <p class="goal-explanation">
            @if (!r.achievable) {
              You would need an average above your {{ store.max().toFixed(1) }} scale. With the
              highest grade in every future credit, you can reach
              <strong>{{ store.format(r.maximumGpa) }}</strong
              >.
              @if (store.data().target.gpa === store.max()) {
                With earlier grades below the maximum, no finite number of new credits can restore a
                perfect cumulative GPA without grade replacement. Choose a target below the scale
                maximum.
              } @else {
                Try adding more future credits or adjusting the target.
              }
            } @else if (r.requiredGpa <= minimumGrade()) {
              Your target is met even at the lowest configured future GPA under these assumptions.
              Keep in mind that GPA and graduation credit requirements are separate.
            } @else {
              You need at least <strong>{{ store.format(r.requiredGpa) }}</strong> across your next
              <strong>{{ store.data().target.credits }} GPA credits</strong>. This measures the
              grades required, not how likely you are to earn them.
            }
          </p>
          @if (r.alreadyAtTarget) {
            <p class="goal-already">
              <app-icon name="check" /> You are currently at or above your target. The calculation
              shows what maintains it.
            </p>
          }
        }
      </section>
    </div>
    @if (result(); as r) {
      <div class="two-columns">
        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>One way the grades could add up</h2>
              <p>An illustrative credit mix</p>
            </div>
            <app-icon name="calculator" />
          </div>
          @if (r.suggestion; as s) {
            <div class="grade-mix">
              <div>
                <strong>{{ s.higherGrade }}</strong
                ><span>{{ s.higherCredits }} credits</span>
              </div>
              @if (s.lowerCredits > 0) {
                <span class="mix-plus">+</span>
                <div>
                  <strong>{{ s.lowerGrade }}</strong
                  ><span>{{ s.lowerCredits }} credits</span>
                </div>
              }
              <span class="mix-equals">→</span>
              <div class="mix-average">
                <strong>{{ store.format(s.averageGpa) }}</strong
                ><span>future average</span>
              </div>
            </div>
            <p class="form-hint">
              Rounded up to quarter-credit allocations to meet the goal. Your actual course sizes
              may need a different mix. This is not a course-level guarantee.
            </p>
          } @else {
            <div class="mini-empty">
              <h3>More credits can create more options.</h3>
              <p>Adjust your goal or future credits to find a feasible grade mix.</p>
            </div>
          }
        </section>
        <section class="panel">
          <div class="panel-heading">
            <div>
              <h2>Your graduation ceiling</h2>
              <p>If these are your remaining credits</p>
            </div>
            <app-icon name="trend" />
          </div>
          <div class="ceiling-value">
            {{ store.format(r.maximumGpa) }}<span>maximum cumulative GPA</span>
          </div>
          <p class="form-hint">
            Assumes the highest configured grade in all {{ store.data().target.credits }} remaining
            new GPA credits, starting from your current adjusted record. Future retakes are not
            assumed.
          </p>
        </section>
      </div>
    }
    <section class="panel improvement-panel">
      <div class="panel-heading">
        <div>
          <h2>What a strong stretch could change</h2>
          <p>Your highest configured grade in every future course · mathematical projections</p>
        </div>
      </div>
      <div class="insight-grid">
        @for (i of insights(); track i.credits) {
          <div>
            <span>NEXT {{ i.credits }} GPA CREDITS</span><strong>{{ store.format(i.gpa) }}</strong
            ><small>maximum cumulative GPA</small>
          </div>
        } @empty {
          <p class="muted">Projections appear when the calculation server is connected.</p>
        }
      </div>
    </section>`,
})
export class PlannerComponent {
  store = inject(Store);
  result = signal<TargetResult | null>(null);
  error = signal('');
  inputError = signal('');
  insights = signal<{ credits: number; gpa: number }[]>([]);
  retry = signal(0);
  increment = (n: number) => n + 1;
  minimumGrade = computed(() =>
    Math.min(
      ...this.store
        .data()
        .scale.filter((g) => g.points !== null)
        .map((g) => g.points!),
    ),
  );
  requiredDisplay = computed(() => Math.max(this.minimumGrade(), this.result()?.requiredGpa ?? 0));
  difficulty = computed(() =>
    Math.min(100, Math.max(0, (this.requiredDisplay() / this.store.max()) * 100)),
  );
  constructor() {
    effect((onCleanup) => {
      const d = this.store.data(),
        semesters = this.store.completedSemesters(),
        courses = semesters.flatMap((s) => s.courses);
      this.retry();
      this.result.set(null);
      this.insights.set([]);
      if (this.inputError()) return;
      let sub: { unsubscribe(): void } | undefined;
      const timer = setTimeout(() => {
        sub = forkJoin([
          this.store.api.target(d.scale, courses, d.target.gpa, d.target.credits, semesters),
          ...[15, 30, 45].map((n) =>
            this.store.api.target(d.scale, courses, d.target.gpa, n, semesters),
          ),
        ]).subscribe({
          next: (rs) => {
            this.result.set(rs[0]);
            this.insights.set(
              [15, 30, 45].map((n, i) => ({ credits: n, gpa: rs[i + 1].maximumGpa })),
            );
            this.error.set('');
          },
          error: (e) => this.error.set(apiError(e)),
        });
      }, 200);
      onCleanup(() => {
        clearTimeout(timer);
        sub?.unsubscribe();
      });
    });
  }
  setTarget(key: 'gpa' | 'credits', value: number) {
    if (
      value === null ||
      !Number.isFinite(value) ||
      (key === 'gpa' ? value < 0 || value > this.store.max() : value <= 0 || value > 1000)
    ) {
      this.inputError.set(
        'Use a target within your grading scale and future credits greater than 0 (up to 1,000).',
      );
      return;
    }
    this.inputError.set('');
    this.store.update((d) => (d.target[key] = value));
  }
}
