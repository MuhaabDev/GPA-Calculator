import { PotentialSummaryComponent } from '../../shared/potential-summary.component';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '../../core/store.service';
import { defaultScale } from '../../core/models';
import { ChartComponent } from '../../shared/chart.component';
import { IconComponent } from '../../shared/icon.component';
import { AnimatedNumberComponent } from '../../shared/animated-number.component';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ChartComponent,
    IconComponent,
    AnimatedNumberComponent,
    PotentialSummaryComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  store = inject(Store);
  preset = 'standard';
  semesterGpa(id: string) {
    return this.store.actual()?.semesters.find((s) => s.id === id)?.result.gpa;
  }
  completed = computed(
    () => this.store.data().semesters.filter((s) => s.status === 'completed').length,
  );
  graded = computed(
    () => this.store.actual()?.semesters.filter((s) => s.original.gpa !== null) ?? [],
  );
  latest = computed(() => this.graded().at(-1));
  history = computed(() => this.store.actual()?.semesters ?? []);
  trend = computed(() => {
    const s = this.history(),
      latest = s.at(-1)?.historical.gpa,
      previous = s.at(-2)?.historical.gpa;
    return latest != null && previous != null ? latest - previous : null;
  });
  chartLabels = computed(() => [
    ...this.history().map((s) => s.name),
    ...(this.store.current() ? [this.store.current()!.name + ' · best case'] : []),
  ]);
  chartData = computed(() => [
    {
      label: 'Retrospectively adjusted',
      data: [
        ...this.history().map((s) => s.cumulativeGpa),
        ...(this.store.current() ? [null] : []),
      ],
      borderColor: '#91aa78',
      backgroundColor: '#91aa78',
      borderDash: [4, 4],
    },
    {
      label: 'Historical cumulative',
      data: [
        ...this.history().map((s) => s.historical.gpa),
        ...(this.store.current() ? [null] : []),
      ],
      borderColor: '#2e6952',
      backgroundColor: '#2e6952',
    },
    ...(this.store.current()
      ? [
          {
            label: 'Best case · current semester',
            data: [
              ...this.history().map((s, i) =>
                i === this.history().length - 1 ? s.historical.gpa : null,
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
  goalProgress = computed(() =>
    Math.min(
      100,
      Math.max(
        0,
        ((this.store.actual()?.total.gpa ?? 0) / Math.max(0.01, this.store.data().target.gpa)) *
          100,
      ),
    ),
  );
  start() {
    this.store.update((d) => {
      d.preferences.onboarded = true;
      if (this.preset === 'simple') {
        d.scoreBands = [
          { minimum: 90, grade: 'A' },
          { minimum: 80, grade: 'B' },
          { minimum: 70, grade: 'C' },
          { minimum: 60, grade: 'D' },
          { minimum: 0, grade: 'F' },
        ];
        d.scale = defaultScale().filter((g) =>
          ['A', 'B', 'C', 'D', 'F', 'P', 'I', 'W'].includes(g.label),
        );
      }
    });
  }
}
