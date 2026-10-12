import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course } from '../core/models';
import { Store } from '../core/store.service';
import { IconComponent } from './icon.component';
@Component({
  selector: 'app-course-table',
  standalone: true,
  imports: [IconComponent, FormsModule],
  template: `<div class="table-scroll">
    <table class="course-table">
      <thead>
        <tr>
          <th>Course</th>
          <th>Credits</th>
          <th>Grade</th>
          <th class="points-cell">{{ academic() ? 'Attempt pts.' : 'Quality pts.' }}</th>
          <th><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        @for (c of courses(); track c.id) {
          <tr>
            <td>
              <button class="course-name" (click)="edit.emit(c)">{{ c.name }}</button
              ><span class="course-code"
                >{{ c.code || 'No course code' }}
                @if (c.excluded) {
                  <span class="badge">Excluded</span>
                }
                @if (academic() && isRetake(c)) {
                  <span class="badge">Retake</span>
                }
              </span>
              @if (academic() && c.assessments !== undefined) {
                <details class="attempt-history">
                  <summary>Saved assessment marks</summary>
                  @for (a of c.assessments; track a.id) {
                    <p>
                      {{ a.name }} · {{ a.earnedMarks === null ? 'Not Graded' : a.earnedMarks }} /
                      {{ a.maximumMarks }}
                    </p>
                  }
                  <p>These entries do not change a completed course’s confirmed grade.</p>
                </details>
              }
              @if (academic() && store.resolution(c.courseId); as r) {
                @if (r.attempts.length > 1) {
                  <details class="attempt-history">
                    <summary>
                      @if (isRetake(c)) {
                        Retake of {{ r.originalSemesterName }}
                      } @else {
                        Original {{ r.originalGrade ?? 'Pending' }} → Effective
                        {{ r.effectiveGrade ?? '—' }}
                      }
                      <span>· {{ r.attempts.length }} attempts</span>
                    </summary>
                    @if (!isRetake(c) && r.effectiveSemesterName !== r.originalSemesterName) {
                      <p>
                        Effective grade from {{ r.effectiveSemesterName }} ·
                        {{ store.signed(r.gradePointChange) }} grade points
                      </p>
                    }
                    @for (a of r.attempts; track a.id) {
                      <p>
                        {{ a.semesterName }} · {{ a.grade ?? 'Pending' }}
                        @if (a.effective) {
                          <span class="badge">Effective</span>
                        }
                        @if (a.excluded) {
                          <span class="badge">Excluded</span>
                        }
                        @if (!a.finalized) {
                          <span class="badge">No replacement</span>
                        }
                      </p>
                    }
                  </details>
                }
              }
            </td>
            <td>{{ c.credits }}</td>
            <td>
              <select
                class="grade-select"
                [ngModel]="c.grade ?? ''"
                [attr.aria-label]="'Grade for ' + c.name"
                (ngModelChange)="grade(c, $event)"
              >
                <option value="">Pending</option>
                @for (g of store.data().scale; track g.label) {
                  <option [value]="g.label">{{ g.label }}</option>
                }
              </select>
            </td>
            <td class="points-cell">{{ points(c) }}</td>
            <td>
              <div class="row-actions">
                <button
                  class="icon-button"
                  [attr.aria-label]="'Edit ' + c.name"
                  (click)="edit.emit(c)"
                >
                  <app-icon name="edit" /></button
                ><button
                  class="icon-button danger-hover"
                  [attr.aria-label]="'Remove ' + c.name"
                  (click)="remove.emit(c)"
                >
                  <app-icon name="trash" />
                </button>
              </div>
            </td>
          </tr>
        } @empty {
          <tr>
            <td colspan="5">
              <div class="table-empty">
                Your next course belongs here.<span
                  >Add a course to start calculating your GPA.</span
                >
              </div>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>`,
})
export class CourseTableComponent {
  courses = input<Course[]>([]);
  academic = input(false);
  edit = output<Course>();
  remove = output<Course>();
  changed = output<Course>();
  store = inject(Store);
  isRetake(c: Course) {
    return (this.store.resolution(c.courseId)?.attempts.find((a) => a.id === c.id)?.order ?? 1) > 1;
  }
  grade(c: Course, value: string) {
    this.changed.emit({ ...c, grade: value || null });
  }
  points(c: Course) {
    const p = this.store.data().scale.find((g) => g.label === c.grade)?.points;
    return p == null || c.excluded ? '—' : this.store.format(p * c.credits);
  }
}
