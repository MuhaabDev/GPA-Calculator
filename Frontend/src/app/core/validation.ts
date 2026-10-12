import { AcademicData, defaultScale, defaultScoreBands, GradeRule, ScoreBand } from './models';

export function validateScoreBands(scale: GradeRule[], bands: ScoreBand[]): void {
  if (!Array.isArray(bands) || bands.length > 30) throw new Error('Invalid score boundaries.');
  // Empty means deliberately unconfigured, not an invented conversion for a custom scale.
  if (!bands.length) return;
  if (
    bands.some(
      (b) =>
        !b ||
        !Number.isFinite(b.minimum) ||
        b.minimum < 0 ||
        b.minimum > 100 ||
        !scale.some((g) => g.label === b.grade && g.points !== null),
    )
  )
    throw new Error('Use score minimums from 0 to 100 and numeric grades from your scale.');
  const sorted = [...bands].sort((a, b) => a.minimum - b.minimum);
  if (sorted[0].minimum !== 0 || new Set(sorted.map((b) => b.minimum)).size !== sorted.length)
    throw new Error(
      'Start at 0 and use unique minimum percentages. The next minimum is the exclusive upper bound.',
    );
  const points = sorted.map((b) => scale.find((g) => g.label === b.grade)!.points!);
  if (
    points.some((p, i) => i > 0 && p < points[i - 1]) ||
    points.at(-1) !== Math.max(...scale.map((g) => g.points ?? 0))
  )
    throw new Error(
      'Higher scores cannot earn fewer GPA points. The highest band must award the maximum GPA.',
    );
}

// A backup is untrusted input: reject the whole document before changing any records.
export function validateData(value: unknown): AcademicData {
  const fail = (text: string): never => {
    throw new Error(text);
  };
  const obj = (v: unknown): any =>
    v && typeof v === 'object' && !Array.isArray(v) ? v : fail('Invalid backup structure.');
  const str = (v: any, max: number, empty = false) =>
    typeof v === 'string' && v.length <= max && (empty || v.trim().length > 0);
  const num = (v: any, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const d = obj(structuredClone(value));
  if (![1, 2, 3].includes(d.version))
    fail('Unsupported backup version. Expected version 1, 2 or 3.');
  const legacy = d.version === 1;
  const migrate = d.version < 3;
  if (!Array.isArray(d.scale) || d.scale.length < 1 || d.scale.length > 30)
    fail('Invalid grading scale.');
  const labels = new Set<string>();
  for (const raw of d.scale) {
    const g = obj(raw);
    if (
      !str(g.label, 12) ||
      labels.has(g.label.toLowerCase()) ||
      (g.points !== null && !num(g.points, 0, 10)) ||
      typeof g.completed !== 'boolean'
    )
      fail('Invalid or duplicate grade rule.');
    labels.add(g.label.toLowerCase());
  }
  const max = Math.max(...d.scale.map((g: any) => g.points ?? 0));
  if (max <= 0) fail('Include a grade with positive points.');
  const ids = new Set<string>();
  const checkId = (id: any) => {
    if (!str(id, 100) || ids.has(id)) fail('Missing or duplicate record ID.');
    ids.add(id);
  };
  let courseCount = 0;
  const checkCourses = (courses: any) => {
    if (!Array.isArray(courses) || courses.length > 5000) fail('Invalid course list.');
    for (const raw of courses) {
      const c = obj(raw);
      checkId(c.id);
      if (legacy) c.courseId = c.id;
      if (!str(c.courseId, 100)) fail('Missing stable course identity.');
      if (c.assessments !== undefined) {
        if (!Array.isArray(c.assessments) || c.assessments.length > 100)
          fail('Use up to 100 assessments per course.');
        const assessmentOrders = new Set<number>();
        for (const a of c.assessments) {
          obj(a);
          checkId(a.id);
          if (
            !str(a.name, 80) ||
            !num(a.maximumMarks, 0, 100) ||
            (a.earnedMarks !== null && !num(a.earnedMarks, 0, a.maximumMarks)) ||
            !Number.isInteger(a.displayOrder) ||
            !num(a.displayOrder, 0, 2147483647) ||
            assessmentOrders.has(a.displayOrder)
          )
            fail(
              'Invalid assessment. Keep earned marks within its maximum; clear or correct them before reducing its weight.',
            );
          assessmentOrders.add(a.displayOrder);
        }
      }
      courseCount++;
      if (
        !str(c.name, 120) ||
        !str(c.code, 30, true) ||
        !num(c.credits, 0.01, 100) ||
        typeof c.excluded !== 'boolean' ||
        (c.grade !== null && !d.scale.some((g: any) => g.label === c.grade))
      )
        fail('A course contains invalid fields or an unknown grade.');
    }
  };
  if (!Array.isArray(d.semesters) || d.semesters.length > 100) fail('Invalid semesters.');
  const orders = new Set<number>();
  for (const [index, raw] of d.semesters.entries()) {
    const s = obj(raw);
    if (legacy) s.order = index;
    if (
      !Number.isSafeInteger(s.order) ||
      s.order < 0 ||
      s.order > 2147483647 ||
      orders.has(s.order)
    )
      fail('Semester order must be a unique non-negative integer.');
    orders.add(s.order);
    checkId(s.id);
    if (!str(s.name, 80) || !['completed', 'in-progress'].includes(s.status))
      fail('Invalid semester.');
    checkCourses(s.courses);
    if (new Set(s.courses.map((c: any) => c.courseId)).size !== s.courses.length)
      fail('A course can have only one attempt in a semester.');
  }
  if (courseCount > 5000) fail('Backups support at most 5,000 academic courses.');
  if (!Array.isArray(d.scenarios) || d.scenarios.length > 12)
    fail('Use at most 12 saved scenarios.');
  for (const raw of d.scenarios) {
    const s = obj(raw);
    checkId(s.id);
    if (!str(s.name, 80)) fail('Invalid scenario name.');
    checkCourses(s.courses);
    if (new Set(s.courses.map((c: any) => c.courseId)).size !== s.courses.length)
      fail('A scenario can have only one attempt per course.');
  }
  const academicCredits = new Map<string, number>();
  for (const s of d.semesters)
    for (const c of s.courses) {
      if (academicCredits.has(c.courseId) && academicCredits.get(c.courseId) !== c.credits)
        fail('Linked attempts must have identical credit hours.');
      academicCredits.set(c.courseId, c.credits);
    }
  for (const s of d.scenarios)
    for (const c of s.courses) {
      if (academicCredits.has(c.courseId) && academicCredits.get(c.courseId) !== c.credits)
        fail('Simulated retakes must use the original credit hours.');
    }
  const p = obj(d.preferences),
    t = obj(d.target);
  if (
    !['light', 'dark'].includes(p.theme) ||
    !Number.isInteger(p.precision) ||
    !num(p.precision, 1, 3) ||
    typeof p.onboarded !== 'boolean'
  )
    fail('Invalid display preferences.');
  if (!num(t.gpa, 0, max) || !num(t.credits, 0.01, 1000)) fail('Invalid GPA goal.');
  if (migrate) {
    d.currentSemesterId = null;
    const standard = defaultScale();
    d.scoreBands =
      standard.every((g) =>
        d.scale.some((r: any) => r.label === g.label && r.points === g.points),
      ) && max === 4
        ? defaultScoreBands()
        : [];
  }
  if (d.currentSemesterId !== null) {
    if (!str(d.currentSemesterId, 100)) fail('Invalid current semester identifier.');
    const current = d.semesters.find((s: any) => s.id === d.currentSemesterId);
    if (!current || current.status !== 'in-progress')
      fail('The current semester must be an existing in-progress semester.');
    if (d.semesters.some((s: any) => s.status === 'completed' && s.order >= current.order))
      fail('Place the current semester after completed semesters in chronological order.');
  }
  validateScoreBands(d.scale, d.scoreBands);
  d.version = 3;
  d.semesters.sort((a: any, b: any) => a.order - b.order);
  return d as AcademicData;
}
