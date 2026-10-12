import { Component, effect, inject, signal } from '@angular/core';
import { Course, GpaResult } from '../../core/models';
import { Store } from '../../core/store.service';
import { apiError } from '../../core/api.service';
import { CourseEditorComponent } from '../../shared/course-editor.component';
import { CourseTableComponent } from '../../shared/course-table.component';
import { IconComponent } from '../../shared/icon.component';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CourseEditorComponent, CourseTableComponent, IconComponent, RouterLink],
  template: `<section class="page-heading">
      <div>
        <div class="eyebrow">THE MATH, MADE SIMPLE</div>
        <h1>GPA calculator<span class="heading-dot">.</span></h1>
        <p>A quick scratchpad for a single semester. No changes to your records.</p>
      </div>
      <button class="button primary" (click)="editor.set(true); editing.set(null)">
        <app-icon name="plus" /> Add course
      </button>
    </section>
    @if (error()) {
      <div class="alert error" role="alert">
        {{ error() }} <button class="text-button" (click)="retry.update(increment)">Retry</button>
      </div>
    }
    <div class="workspace-grid">
      <section class="panel course-panel">
        <div class="panel-heading">
          <div>
            <h2>Your calculation</h2>
            <p>Scratchpad · clears when you leave this page</p>
          </div>
          <span class="badge">{{ store.max() }} scale</span>
        </div>
        <app-course-table
          [courses]="courses()"
          (edit)="editing.set($event); editor.set(true)"
          (remove)="remove($event)"
          (changed)="save($event)"
        />
      </section>
      <aside>
        <section class="result-card">
          <div class="eyebrow">SEMESTER GPA</div>
          <div class="display-number">{{ store.format(result()?.gpa) }}</div>
          <p>out of {{ store.max().toFixed(1) }}</p>
          <div class="stat-lines">
            <div>
              Quality points<strong>{{ store.format(result()?.qualityPoints) }}</strong>
            </div>
            <div>
              GPA-counted credits<strong>{{ result()?.gpaCredits ?? '—' }}</strong>
            </div>
            <div>
              Attempted credits<strong>{{ result()?.attemptedCredits ?? '—' }}</strong>
            </div>
            <div>
              Completed credits<strong>{{ result()?.completedCredits ?? '—' }}</strong>
            </div>
            <div>
              Pending credits<strong>{{ result()?.pendingCredits ?? '—' }}</strong>
            </div>
          </div>
        </section>
        <div class="aside-note">
          <h3>How the math works</h3>
          <p>
            Multiply each counted course’s credits by its grade points. Add those quality points,
            then divide by GPA-counted credits.
          </p>
          <a routerLink="/semesters" class="text-link"
            >Keep a permanent record <app-icon name="arrow"
          /></a>
        </div>
      </aside>
    </div>
    @if (editor()) {
      <app-course-editor
        [course]="editing()"
        (closed)="editor.set(false)"
        (saved)="save($event); editor.set(false)"
      />
    }`,
})
export class CalculatorComponent {
  store = inject(Store);
  courses = signal<Course[]>([]);
  result = signal<GpaResult | null>(null);
  error = signal('');
  editor = signal(false);
  editing = signal<Course | null>(null);
  retry = signal(0);
  increment = (n: number) => n + 1;
  constructor() {
    effect((onCleanup) => {
      const c = this.courses(),
        scale = this.store.data().scale;
      this.retry();
      this.result.set(null);
      const sub = this.store.api.semester(scale, c).subscribe({
        next: (r) => {
          this.result.set(r);
          this.error.set('');
        },
        error: (e) => this.error.set(apiError(e)),
      });
      onCleanup(() => sub.unsubscribe());
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
}
