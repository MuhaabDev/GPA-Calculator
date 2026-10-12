import { PotentialSummaryComponent } from '../../shared/potential-summary.component';
import { AssessmentCourseComponent } from '../../shared/assessment-course.component';
import { FinalizeSemesterComponent } from '../../shared/finalize-semester.component';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '../../core/store.service';
import { Course, Semester } from '../../core/models';
import { CourseEditorComponent } from '../../shared/course-editor.component';
import { CourseTableComponent } from '../../shared/course-table.component';
import { DialogComponent } from '../../shared/dialog.component';
import { IconComponent } from '../../shared/icon.component';
import { ConfirmService } from '../../shared/confirm.service';
@Component({
  selector: 'app-semesters',
  standalone: true,
  imports: [
    FormsModule,
    CourseEditorComponent,
    CourseTableComponent,
    DialogComponent,
    IconComponent,
    PotentialSummaryComponent,
    AssessmentCourseComponent,
    FinalizeSemesterComponent,
  ],
  template: ` <section class="page-heading">
      <div>
        <div class="eyebrow">YOUR ACADEMIC RECORD</div>
        <h1>One semester at a time<span class="heading-dot">.</span></h1>
        <p>All your courses. Every credit. A little more organized.</p>
      </div>
      <button class="button primary" (click)="openSemester()">
        <app-icon name="plus" /> Add semester
      </button>
    </section>
    @if (store.data().semesters.length) {
      <div class="semester-layout">
        <aside class="semester-list">
          <div class="section-label">
            YOUR SEMESTERS <span>{{ store.data().semesters.length }}</span>
          </div>
          @for (s of store.semesters(); track s.id; let i = $index) {
            <div class="semester-selector" [class.selected]="selected()?.id === s.id">
              <button (click)="selectedId.set(s.id)">
                <app-icon name="semesters" /><span
                  >{{ s.name
                  }}<small
                    >{{ s.courses.length }} courses ·
                    {{ s.status === 'completed' ? 'Completed' : 'In progress' }}</small
                  ></span
                >
              </button>
              <div class="order-controls">
                <button
                  class="icon-button"
                  [disabled]="i === 0"
                  [attr.aria-label]="'Move ' + s.name + ' earlier'"
                  (click)="move(i, -1)"
                >
                  <app-icon name="up" /></button
                ><button
                  class="icon-button"
                  [disabled]="i === store.data().semesters.length - 1"
                  [attr.aria-label]="'Move ' + s.name + ' later'"
                  (click)="move(i, 1)"
                >
                  <app-icon name="down" />
                </button>
              </div>
            </div>
          }
          <p class="form-hint">
            Earliest → latest. Use the arrows to set the order used in your charts.
          </p>
        </aside>
        @if (selected(); as s) {
          <div class="semester-detail">
            <section class="panel semester-banner">
              <div>
                @if (store.data().currentSemesterId === s.id) {
                  <span class="pill">CURRENT SEMESTER</span>
                }
                <span class="pill">{{
                  s.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'
                }}</span>
                <h2>{{ s.name }}</h2>
                <p>{{ s.courses.length }} courses in this chapter</p>
              </div>
              <div class="semester-banner-right">
                <strong>{{ store.format(result()?.gpa) }}</strong
                ><span>ADJUSTED GPA</span>
                <small
                  >Original {{ store.format(semesterResult()?.original?.gpa) }} · Change
                  {{ store.signed(semesterResult()?.improvement) }}</small
                >
                <div class="row-actions">
                  <button class="icon-button" aria-label="Edit semester" (click)="openSemester(s)">
                    <app-icon name="edit" /></button
                  ><button
                    class="icon-button danger-hover"
                    aria-label="Delete semester"
                    (click)="deleteSemester(s)"
                  >
                    <app-icon name="trash" />
                  </button>
                </div>
              </div>
            </section>
            <div class="current-semester-actions">
              @if (store.data().currentSemesterId === s.id) {
                <button
                  class="button primary small"
                  (click)="finalizing.set(true)"
                  [disabled]="!store.potential() || store.busy()"
                >
                  Finalize semester</button
                ><button class="text-button" (click)="store.setCurrent(null)">
                  Pause current tracking
                </button>
              } @else if (s.status === 'in-progress') {
                <button class="button secondary small" (click)="makeCurrent(s)">
                  Make this my current semester
                </button>
              }
            </div>
            @if (store.data().currentSemesterId === s.id) {
              <app-potential-summary />
              @for (c of s.courses; track c.id) {
                <app-assessment-course
                  [course]="c"
                  [semesterId]="s.id"
                  [potential]="coursePotential(c.id)"
                />
              }
            }
            @if (semesterResult() && result()?.gpa === null) {
              <p class="inline-note">
                No new GPA-counted courses in this semester’s adjusted view. Retakes contribute to
                their original semester.
              </p>
            }
            <section class="panel course-panel">
              <div class="panel-heading">
                <div>
                  <h2>Coursework</h2>
                  <p>Recorded grades only. Assessment potential stays separate until confirmed.</p>
                </div>
                <button
                  class="button secondary small"
                  (click)="editingCourse.set(null); courseOpen.set(true)"
                >
                  <app-icon name="plus" /> Add course
                </button>
              </div>
              <app-course-table
                [courses]="s.courses"
                [academic]="true"
                (edit)="editingCourse.set($event); courseOpen.set(true)"
                (remove)="removeCourse($event)"
                (changed)="store.saveCourse(s.id, $event)"
              />
              <div class="credit-summary">
                <span
                  >Attempted
                  <strong>{{ semesterResult()?.original?.attemptedCredits ?? '—' }}</strong></span
                ><span
                  >Unique earned, attributed here
                  <strong>{{ result()?.completedCredits ?? '—' }}</strong></span
                ><span
                  >GPA-counted <strong>{{ result()?.gpaCredits ?? '—' }}</strong></span
                ><span
                  >Pending <strong>{{ result()?.pendingCredits ?? '—' }}</strong></span
                >
              </div>
            </section>
            <div class="inline-note">
              <app-icon name="info" />
              <p>
                Custom replacement policy: original GPA describes the attempts taken here. Adjusted
                GPA attributes each course’s latest finalized grade to its earliest remaining
                semester. Retakes never duplicate unique credits. This is not a universal university
                policy.
              </p>
            </div>
          </div>
        }
      </div>
    } @else {
      <section class="empty-state panel">
        <div class="empty-symbol"><app-icon name="semesters" /></div>
        <div class="eyebrow">A CLEAN SLATE</div>
        <h2>Your first chapter is waiting.</h2>
        <p>
          Create a semester, then add your courses.<br />You can enter grades now or come back as
          they arrive.
        </p>
        <button class="button primary" (click)="openSemester()">
          Create first semester <app-icon name="arrow" />
        </button>
      </section>
    }
    @if (semesterOpen()) {
      <app-dialog
        [title]="editingSemester ? 'Edit semester' : 'Start a new chapter.'"
        eyebrow="SEMESTER DETAILS"
        (closed)="semesterOpen.set(false)"
        ><form (ngSubmit)="saveSemester()">
          <label
            >Semester name<input
              name="name"
              [(ngModel)]="semesterName"
              placeholder="e.g. Fall 2026"
              required
              maxlength="80"
              autofocus /></label
          ><label
            >Status<select name="status" [(ngModel)]="semesterStatus">
              <option value="in-progress">In progress</option>
              <option
                value="completed"
                [disabled]="editingSemester?.id === store.data().currentSemesterId"
              >
                Completed
              </option>
            </select></label
          >
          @if (!editingSemester) {
            <label
              >Chronological position<select name="before" [(ngModel)]="beforeId">
                <option value="">After the latest semester</option>
                @for (s of store.semesters(); track s.id) {
                  <option [value]="s.id">Before {{ s.name }}</option>
                }
              </select></label
            >
          }
          <p class="form-hint">
            Graded courses count toward GPA in either status. Status only marks your semester’s
            progress.
          </p>
          <div class="dialog-actions">
            <button type="button" class="button secondary" (click)="semesterOpen.set(false)">
              Cancel</button
            ><button class="button primary" [disabled]="!semesterName.trim()">Save semester</button>
          </div>
        </form></app-dialog
      >
    }
    @if (finalizing() && selected(); as semester) {
      <app-finalize-semester [semester]="semester" (closed)="finalizing.set(false)" />
    }
    @if (courseOpen()) {
      <app-course-editor
        [course]="editingCourse()"
        [context]="selected()?.id ?? null"
        (closed)="courseOpen.set(false)"
        (saved)="saveCourse($event)"
      />
    }`,
})
export class SemestersComponent {
  ngOnInit() {
    const action = this.route.snapshot.queryParamMap.get('create');
    if (action === 'semester') this.openSemester();
    if (action === 'course' && this.selected()) this.courseOpen.set(true);
  }
  store = inject(Store);
  confirm = inject(ConfirmService);
  route = inject(ActivatedRoute);
  selectedId = signal(this.route.snapshot.queryParamMap.get('semester'));
  selected = computed(
    () =>
      this.store.semesters().find((s) => s.id === this.selectedId()) ??
      this.store.semesters().at(-1),
  );
  result = computed(
    () => this.store.result()?.semesters.find((s) => s.id === this.selected()?.id)?.result,
  );
  semesterResult = computed(() =>
    this.store.result()?.semesters.find((s) => s.id === this.selected()?.id),
  );
  finalizing = signal(false);
  coursePotential(id: string) {
    return this.store.potential()?.courses.find((c) => c.attemptId === id);
  }
  makeCurrent(s: Semester) {
    this.confirm.ask(
      'Track this semester?',
      'Only ' +
        s.name +
        ' will receive best-case assessment projections. Any previous current semester keeps its marks but becomes inactive. Place it after completed semesters in chronological order.',
      () => this.store.setCurrent(s.id),
      'Make current',
    );
  }
  beforeId = '';
  semesterOpen = signal(false);
  courseOpen = signal(false);
  editingCourse = signal<Course | null>(null);
  editingSemester: Semester | null = null;
  semesterName = '';
  semesterStatus: Semester['status'] = 'in-progress';
  openSemester(s?: Semester) {
    this.editingSemester = s ?? null;
    this.beforeId = '';
    this.semesterName = s?.name ?? '';
    this.semesterStatus = s?.status ?? 'in-progress';
    this.semesterOpen.set(true);
  }
  saveSemester() {
    if (!this.semesterName.trim()) return;
    if (this.editingSemester) {
      const id = this.editingSemester.id;
      if (
        !this.store.tryUpdate((d) => {
          const s = d.semesters.find((s) => s.id === id)!;
          s.name = this.semesterName.trim();
          s.status = this.semesterStatus;
        })
      )
        return;
      this.store.toast('Semester updated');
    } else {
      try {
        this.selectedId.set(
          this.store.addSemester(this.semesterName.trim(), this.semesterStatus, this.beforeId),
        );
      } catch (error) {
        this.store.toast(error instanceof Error ? error.message : 'Unable to save semester');
        return;
      }
    }
    this.semesterOpen.set(false);
  }
  saveCourse(c: Course) {
    if (this.store.saveCourse(this.selected()!.id, c)) this.courseOpen.set(false);
  }
  removeCourse(c: Course) {
    this.confirm.ask(
      'Remove this course?',
      `${c.name} will be removed from ${this.selected()!.name}. Remaining attempts are preserved and the previous eligible grade becomes effective. If this is the original, the earliest remaining attempt becomes the anchor.`,
      () => {
        this.store.update((d) => {
          const s = d.semesters.find((s) => s.id === this.selected()!.id)!;
          s.courses = s.courses.filter((x) => x.id !== c.id);
        });
        this.store.toast('Course removed');
      },
    );
  }
  deleteSemester(s: Semester) {
    this.confirm.ask(
      'Delete this semester?',
      `${s.name} and its ${s.courses.length} attempts will be removed. Other attempts remain; replacement grades and history recalculate from the surviving records.`,
      () => {
        this.store.update((d) => {
          d.semesters = d.semesters.filter((x) => x.id !== s.id);
          if (d.currentSemesterId === s.id) d.currentSemesterId = null;
        });
        this.store.toast('Semester deleted');
      },
    );
  }
  move(i: number, direction: number) {
    this.store.tryUpdate((d) => {
      const ordered = [...d.semesters].sort((a, b) => a.order - b.order);
      [ordered[i].order, ordered[i + direction].order] = [
        ordered[i + direction].order,
        ordered[i].order,
      ];
    });
  }
}
