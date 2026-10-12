import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store.service';
import { AnimatedNumberComponent } from './animated-number.component';
@Component({
  selector: 'app-potential-summary',
  standalone: true,
  imports: [RouterLink, AnimatedNumberComponent],
  template: `
    @if (store.current(); as current) {
      <section class="panel potential-panel">
        <div class="panel-heading">
          <div>
            <div class="eyebrow">CURRENT SEMESTER POTENTIAL · {{ current.name }}</div>
            <h2>Highest GPA You Can Still Achieve</h2>
            <p>
              Full marks assumed only for assessments not graded yet. A best case, never a
              guarantee.
            </p>
          </div>
          <span class="pill">IN PROGRESS</span>
        </div>
        <div class="potential-values">
          <div>
            <span class="metric-label">Maximum achievable semester GPA</span
            ><strong>
              <app-number
                [value]="store.potential()?.semester?.gpa"
                [precision]="store.data().preferences.precision"
            /></strong>
          </div>
          <div>
            <span class="metric-label">Projected Cumulative GPA — Best Case</span
            ><strong>
              <app-number
                [value]="store.potential()?.cumulative?.gpa"
                [precision]="store.data().preferences.precision"
            /></strong>
          </div>
        </div>
        @if (store.potential(); as p) {
          @if (!p.valid) {
            <div class="alert error" role="status">
              {{ p.issue }} <a routerLink="/settings">Review score boundaries</a>
            </div>
          }
          <div class="credit-summary">
            <span
              >Marks lost <strong>{{ p.marksLost }}</strong></span
            ><span
              >Still available <strong>{{ p.remaining }}</strong></span
            ><span
              >Courses in progress <strong>{{ p.inProgressCourses }}</strong></span
            >
          </div>
          @if (!p.courses.length) {
            <p class="form-hint">
              Add your first course to see its potential. An empty semester has no GPA.
            </p>
          }
          @if (showCourses()) {
            <div class="potential-course-list">
              @for (c of current.courses; track c.id; let i = $index) {
                @let r = p.courses[i];
                <a
                  routerLink="/semesters"
                  [queryParams]="{ semester: current.id }"
                  class="potential-course-row"
                  ><span
                    ><strong>{{ c.name }}</strong
                    ><small
                      >{{ c.credits }} credits · {{ r.lost }} marks lost ·
                      {{ r.remaining }} available
                      @if (c.excluded) {
                        · GPA excluded
                      }
                    </small></span
                  ><span
                    >{{ r.source === 'recorded' ? 'Recorded: ' : 'Best case: '
                    }}{{ r.grade ?? 'Unavailable'
                    }}<small
                      >{{ r.maximumScore === null ? '—' : r.maximumScore + '/100' }} ·
                      {{ store.format(r.points) }} GPA</small
                    ></span
                  ></a
                >
              }
            </div>
          }
          <p class="form-hint">
            Uses completed semesters plus this current semester only. Linked retakes replace earlier
            contributions; they do not duplicate credits.
          </p>
        } @else {
          <p class="form-hint">{{ store.error() || 'Calculating from your saved assessments…' }}</p>
        }
        @if (showCourses()) {
          <a routerLink="/semesters" [queryParams]="{ semester: current.id }" class="text-link"
            >Track current semester →</a
          >
        }
      </section>
    } @else if (showCourses()) {
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>Make room for this semester.</h2>
            <p>Select one in-progress semester to track marks and see your best achievable GPA.</p>
          </div>
          <a routerLink="/semesters" class="button secondary small">Choose current semester</a>
        </div>
      </section>
    }
  `,
})
export class PotentialSummaryComponent {
  store = inject(Store);
  showCourses = input(false);
}
