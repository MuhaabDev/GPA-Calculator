import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Course,
  GradeRule,
  Semester,
  GpaResult,
  CumulativeResult,
  SimulationResult,
  TargetResult,
  AcademicData,
  OverviewResult,
} from './models';
import { timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  overview(data: AcademicData) {
    return this.http
      .post<OverviewResult>('/api/gpa/overview', {
        scale: data.scale,
        semesters: data.semesters,
        currentSemesterId: data.currentSemesterId,
        scoreBands: data.scoreBands,
      })
      .pipe(timeout(8000));
  }
  finalize(data: AcademicData, grades: { attemptId: string; grade: string }[]) {
    return this.http
      .post<Semester>('/api/gpa/finalize', {
        scale: data.scale,
        semesters: data.semesters,
        currentSemesterId: data.currentSemesterId,
        scoreBands: data.scoreBands,
        grades,
        confirmed: true,
      })
      .pipe(timeout(8000));
  }
  semester(scale: GradeRule[], courses: Course[]) {
    return this.http.post<GpaResult>('/api/gpa/semester', { scale, courses }).pipe(timeout(8000));
  }
  cumulative(scale: GradeRule[], semesters: Semester[]) {
    return this.http
      .post<CumulativeResult>('/api/gpa/cumulative', { scale, semesters })
      .pipe(timeout(8000));
  }
  simulate(
    scale: GradeRule[],
    currentCourses: Course[],
    futureCourses: Course[],
    semesters?: Semester[],
  ) {
    return this.http
      .post<SimulationResult>('/api/gpa/simulate', {
        scale,
        currentCourses,
        futureCourses,
        semesters,
      })
      .pipe(timeout(8000));
  }
  target(
    scale: GradeRule[],
    currentCourses: Course[],
    targetGpa: number,
    futureCredits: number,
    semesters?: Semester[],
  ) {
    return this.http
      .post<TargetResult>('/api/gpa/target', {
        scale,
        currentCourses,
        targetGpa,
        futureCredits,
        semesters,
      })
      .pipe(timeout(8000));
  }
}
export function apiError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 400)
    return error.error?.detail ?? 'Check the entered values and try again.';
  return 'Calculation server is unavailable. Start the ASP.NET API on port 5080, then retry. Your academic records are still saved in this browser.';
}
