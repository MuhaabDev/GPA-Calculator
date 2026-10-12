import { Component, input, output, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Course, newCourse } from '../core/models';
import { Store } from '../core/store.service';
import { DialogComponent } from './dialog.component';
@Component({
  selector: 'app-course-editor',
  standalone: true,
  imports: [ReactiveFormsModule, DialogComponent],
  template: `<app-dialog
    [title]="course() ? 'Edit course' : 'A new chapter starts here.'"
    eyebrow="COURSE DETAILS"
    (closed)="closed.emit()"
    ><form [formGroup]="form" (ngSubmit)="save()">
      @if (context() && !course()) {
        <div class="segmented retake-tabs">
          <button
            type="button"
            [class.active]="mode() === 'new'"
            [attr.aria-pressed]="mode() === 'new'"
            (click)="chooseMode('new')"
          >
            Add New Course
          </button>
          <button
            type="button"
            [class.active]="mode() === 'retake'"
            [attr.aria-pressed]="mode() === 'retake'"
            (click)="chooseMode('retake')"
          >
            Retake Existing Course
          </button>
        </div>
        @if (mode() === 'retake') {
          <label
            >Find a previous course<input
              type="search"
              placeholder="Search by course name or code"
              [value]="search()"
              (input)="search.set($any($event.target).value)"
          /></label>
          <div class="retake-picker" role="group" aria-label="Existing courses">
            @for (item of candidates(); track item.course.courseId) {
              <button
                type="button"
                [class.selected]="base()?.courseId === item.course.courseId"
                [attr.aria-pressed]="base()?.courseId === item.course.courseId"
                (click)="selectBase(item.course)"
              >
                <strong>{{ item.course.name }}</strong
                ><span
                  >{{ item.course.code || 'No code' }} · {{ item.course.credits }} credits ·
                  {{ item.semester }}</span
                >
              </button>
            } @empty {
              <p class="form-hint">
                No matching finalized course in an earlier semester. Check semester order or add a
                new course.
              </p>
            }
          </div>
        }
      }
      @if (locked()) {
        <p class="form-hint">
          Linked course identity · credit hours are fixed across attempts. Original grades remain
          stored.
        </p>
      }
      <label
        >Course name<input
          formControlName="name"
          placeholder="e.g. Introduction to Economics"
          maxlength="120"
          [readOnly]="mode() === 'retake'"
          autofocus
      /></label>
      <div class="form-grid">
        <label
          >Course code <span class="muted">optional</span
          ><input
            formControlName="code"
            placeholder="ECON 101"
            maxlength="30"
            [readOnly]="mode() === 'retake'" /></label
        ><label
          >Credit hours<input
            type="number"
            formControlName="credits"
            min="0.01"
            max="100"
            step="0.25"
            [readOnly]="locked()"
        /></label>
      </div>
      <label
        >Grade<select formControlName="grade">
          <option value="">Not graded yet</option>
          @for (g of store.data().scale; track g.label) {
            <option [value]="g.label">
              {{ g.label }} · {{ g.points === null ? 'Non-GPA' : g.points + ' points' }}
            </option>
          }
        </select></label
      ><label class="check-label"
        ><input type="checkbox" formControlName="excluded" /> Exclude this course from GPA</label
      >
      <p class="form-hint">
        {{
          context()
            ? 'Custom policy: the latest finalized, non-excluded grade replaces earlier attempts—even if lower. Pending or incomplete retakes do not replace a grade.'
            : 'Credit-weighted calculation. An ungraded course stays pending until you choose a grade.'
        }}
      </p>
      @if (invalid) {
        <p class="field-error" role="alert">
          Select a course for a retake, or enter a course name and credits between 0.01 and 100.
        </p>
      }
      <div class="dialog-actions">
        <button type="button" class="button secondary" (click)="closed.emit()">Cancel</button
        ><button class="button primary" type="submit">Save course</button>
      </div>
    </form></app-dialog
  >`,
})
export class CourseEditorComponent {
  course = input<Course | null>(null);
  context = input<string | null>(null);
  usedCourseIds = input<string[]>([]);
  mode = signal<'new' | 'retake'>('new');
  search = signal('');
  base = signal<Course | null>(null);
  locked = computed(
    () =>
      this.mode() === 'retake' ||
      (!!this.course() &&
        this.store.courses().filter((c) => c.courseId === this.course()!.courseId).length > 1),
  );
  candidates = computed(() => {
    const target = this.store.semesters().find((s) => s.id === this.context());
    const used = new Set(target?.courses.map((c) => c.courseId) ?? this.usedCourseIds());
    const found = new Map<string, { course: Course; semester: string }>();
    for (const s of this.store.semesters()) {
      if (target && s.order >= target.order) continue;
      for (const c of s.courses) {
        const g = this.store.data().scale.find((g) => g.label === c.grade);
        if (
          !used.has(c.courseId) &&
          g &&
          (g.points !== null || g.completed) &&
          !found.has(c.courseId)
        )
          found.set(c.courseId, { course: c, semester: s.name });
      }
    }
    const query = this.search().toLowerCase();
    return [...found.values()].filter((x) =>
      `${x.course.name} ${x.course.code}`.toLowerCase().includes(query),
    );
  });
  saved = output<Course>();
  closed = output<void>();
  store = inject(Store);
  private fb = inject(FormBuilder);
  invalid = false;
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: [''],
    credits: [3, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    grade: [''],
    excluded: [false],
  });
  ngOnInit() {
    const c = this.course();
    if (c) this.form.patchValue({ ...c, grade: c.grade ?? '' });
  }
  chooseMode(mode: 'new' | 'retake') {
    this.mode.set(mode);
    this.base.set(null);
    this.invalid = false;
    this.form.reset({ name: '', code: '', credits: 3, grade: '', excluded: false });
  }
  selectBase(c: Course) {
    this.base.set(c);
    this.form.patchValue({ name: c.name, code: c.code, credits: c.credits });
  }
  save() {
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.name.trim() || (this.mode() === 'retake' && !this.base())) {
      this.invalid = true;
      return;
    }
    const identity = this.course() ?? newCourse();
    this.saved.emit({
      ...identity,
      courseId: this.base()?.courseId ?? identity.courseId,
      ...v,
      name: v.name.trim(),
      code: v.code.trim(),
      grade: v.grade || null,
    });
  }
}
