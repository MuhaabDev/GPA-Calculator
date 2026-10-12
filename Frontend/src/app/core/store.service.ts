import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiService, apiError } from './api.service';
import { PersistenceService } from './persistence.service';
import { AcademicData, Course, CumulativeResult, Semester, SemesterPotential } from './models';
import { validateData } from './validation';

@Injectable({ providedIn: 'root' })
export class Store {
  readonly persistence = inject(PersistenceService);
  readonly api = inject(ApiService);
  readonly data = signal(this.persistence.load());
  readonly result = signal<CumulativeResult | null>(null);
  readonly actual = signal<CumulativeResult | null>(null);
  readonly potential = signal<SemesterPotential | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly notice = signal('');
  private retry = signal(0);
  private academicInput = computed(() => this.data(), {
    equal: (a, b) =>
      JSON.stringify([a.scale, a.semesters, a.currentSemesterId, a.scoreBands]) ===
      JSON.stringify([b.scale, b.semesters, b.currentSemesterId, b.scoreBands]),
  });
  private noticeTimer?: ReturnType<typeof setTimeout>;
  readonly semesters = computed(() => [...this.data().semesters].sort((a, b) => a.order - b.order));
  readonly courses = computed(() => this.semesters().flatMap((s) => s.courses));
  readonly completedSemesters = computed(() =>
    this.semesters().filter((s) => s.status === 'completed'),
  );
  readonly current = computed(() =>
    this.semesters().find((s) => s.id === this.data().currentSemesterId),
  );
  readonly max = computed(() => Math.max(...this.data().scale.map((g) => g.points ?? 0)));
  constructor() {
    effect(() => {
      const d = this.data();
      this.persistence.save(d);
      document.documentElement.dataset['theme'] = d.preferences.theme;
    });
    effect((onCleanup) => {
      const d = this.academicInput();
      this.retry();
      this.busy.set(true);
      this.result.set(null);
      this.actual.set(null);
      this.potential.set(null);
      const timer = setTimeout(() => {
        sub = this.api.overview(d).subscribe({
          next: (r) => {
            this.result.set(r.records);
            this.actual.set(r.actual);
            this.potential.set(r.potential);
            this.error.set('');
            this.busy.set(false);
          },
          error: (e) => {
            this.error.set(apiError(e));
            this.busy.set(false);
          },
        });
      }, 150);
      let sub: { unsubscribe(): void } | undefined;
      onCleanup(() => {
        clearTimeout(timer);
        sub?.unsubscribe();
      });
    });
  }
  refresh() {
    this.retry.update((n) => n + 1);
  }
  tryUpdate(fn: (d: AcademicData) => void): boolean {
    try {
      this.update(fn);
      return true;
    } catch (e) {
      this.toast((e as Error).message);
      return false;
    }
  }
  setCurrent(id: string | null) {
    if (this.tryUpdate((d) => (d.currentSemesterId = id)))
      this.toast(id ? 'Current semester selected' : 'Current semester paused');
  }
  update(fn: (d: AcademicData) => void) {
    this.data.update((d) => {
      const next = structuredClone(d);
      fn(next);
      return validateData(next);
    });
  }
  toast(message: string) {
    clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => this.notice.set(''), 3500);
  }
  format(value: number | null | undefined) {
    return value == null ? '—' : value.toFixed(this.data().preferences.precision);
  }
  addSemester(name: string, status: Semester['status'], beforeId = '') {
    const id = crypto.randomUUID();
    this.update((d) => {
      const list = [...d.semesters].sort((a, b) => a.order - b.order);
      const at = beforeId ? list.findIndex((s) => s.id === beforeId) : list.length;
      list.splice(at < 0 ? list.length : at, 0, { id, name, status, order: 0, courses: [] });
      list.forEach((s, i) => (s.order = i));
      d.semesters = list;
    });
    this.toast('Semester created');
    return id;
  }
  saveCourse(semesterId: string, course: Course, notify = true) {
    try {
      this.update((d) => {
        const s = d.semesters.find((s) => s.id === semesterId);
        if (s) {
          const i = s.courses.findIndex((c) => c.id === course.id);
          const chain = d.semesters
            .flatMap((s) => s.courses)
            .filter((c) => c.courseId === course.courseId && c.id !== course.id);
          if (chain.some((c) => c.credits !== course.credits))
            throw new Error('Linked attempts must have identical credit hours.');
          if (i < 0) s.courses.push(course);
          else s.courses[i] = course;
          // Identity metadata stays consistent; earned grades are never propagated or overwritten.
          for (const c of chain) {
            c.name = course.name;
            c.code = course.code;
          }
        }
      });
      if (notify) this.toast('Course attempt saved');
      return true;
    } catch (e) {
      this.toast((e as Error).message);
      return false;
    }
  }
  resolution(courseId: string) {
    return this.result()?.courses.find((c) => c.courseId === courseId);
  }
  signed(value: number | null | undefined) {
    return value == null ? '—' : `${value >= 0 ? '+' : ''}${this.format(value)}`;
  }
  replace(data: AcademicData) {
    this.persistence.replace(data);
    this.data.set(data);
  }
}
