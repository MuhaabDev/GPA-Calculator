import { describe, expect, it } from 'vitest';
import { freshData } from './models';
import { validateData, validateScoreBands } from './validation';

function fixture() {
  const d = freshData();
  d.semesters = [
    {
      id: 's1',
      order: 0,
      name: 'Fall',
      status: 'completed',
      courses: [
        {
          id: 'c1',
          courseId: 'identity1',
          name: 'Mathematics',
          code: 'MAT101',
          credits: 2.5,
          grade: 'A',
          excluded: false,
        },
      ],
    },
  ];
  return d;
}
describe('assessment schema and migration', () => {
  function active() {
    const d = fixture();
    d.semesters[0].status = 'in-progress';
    d.currentSemesterId = 's1';
    d.semesters[0].courses[0].grade = null;
    d.semesters[0].courses[0].assessments = [
      { id: 'a1', name: 'Project', maximumMarks: 100, earnedMarks: null, displayOrder: 0 },
    ];
    return d;
  }
  it('migrates v2 without choosing an active semester or altering grades', () => {
    const old: any = fixture();
    old.version = 2;
    delete old.currentSemesterId;
    delete old.scoreBands;
    const result = validateData(old);
    expect(result.version).toBe(3);
    expect(result.currentSemesterId).toBeNull();
    expect(result.semesters).toEqual(old.semesters);
    expect(result.scoreBands.length).toBeGreaterThan(0);
    expect(old.version).toBe(2);
  });
  it('does not invent score conversions for a legacy custom scale', () => {
    const old: any = fixture();
    old.version = 2;
    old.scale[0].points = 5;
    expect(validateData(old).scoreBands).toEqual([]);
  });
  it.each([null, 0, 93.5])('round trips earned marks %s distinctly', (earned) => {
    const d = active();
    d.semesters[0].courses[0].assessments![0].earnedMarks = earned;
    expect(validateData(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
  it.each([0, 90, 100])('saves editable assessment weight %s', (maximum) => {
    const d = active();
    d.semesters[0].courses[0].assessments![0].maximumMarks = maximum;
    expect(() => validateData(d)).not.toThrow();
  });
  it.each([-1, 101])('rejects invalid earned marks %s', (earned) => {
    const d = active();
    d.semesters[0].courses[0].assessments![0].earnedMarks = earned;
    expect(() => validateData(d)).toThrow();
  });
  it('rejects reduced weights below already earned marks', () => {
    const d = active();
    Object.assign(d.semesters[0].courses[0].assessments![0], { maximumMarks: 5, earnedMarks: 8 });
    expect(() => validateData(d)).toThrow();
  });
  it('requires an existing in-progress active semester', () => {
    const d = active();
    d.semesters[0].status = 'completed';
    expect(() => validateData(d)).toThrow();
    d.currentSemesterId = 'missing';
    expect(() => validateData(d)).toThrow();
  });
  it('retains an explicitly empty breakdown rather than restoring a 100 mark assumption', () => {
    const d = active();
    d.semesters[0].courses[0].assessments = [];
    expect(validateData(d).semesters[0].courses[0].assessments).toEqual([]);
  });
  it('rejects missing coverage and duplicate boundaries', () => {
    const d = active();
    expect(() => validateScoreBands(d.scale, [{ minimum: 50, grade: 'A' }])).toThrow();
    expect(() =>
      validateScoreBands(d.scale, [
        { minimum: 0, grade: 'F' },
        { minimum: 0, grade: 'A' },
      ]),
    ).toThrow();
  });
});
describe('versioned academic backups', () => {
  it('round trips records, decimal credits, preferences and settings without aliasing', () => {
    const d = fixture();
    const r = validateData(JSON.parse(JSON.stringify(d)));
    expect(r).toEqual(d);
    r.semesters[0].name = 'Changed';
    expect(d.semesters[0].name).toBe('Fall');
  });
  it('rejects unsupported versions', () =>
    expect(() => validateData({ ...fixture(), version: 99 })).toThrow('version'));
  it.each([0, -1, 101, NaN, Infinity, '3', null])('rejects invalid credit value %s', (v) => {
    const d = fixture();
    (d.semesters[0].courses[0] as any).credits = v;
    expect(() => validateData(d)).toThrow();
  });
  it('rejects unknown grades', () => {
    const d = fixture();
    d.semesters[0].courses[0].grade = 'Z';
    expect(() => validateData(d)).toThrow('unknown grade');
  });
  it('accepts incomplete and excluded courses', () => {
    const d = fixture();
    d.semesters[0].courses[0].grade = null;
    d.semesters[0].courses[0].excluded = true;
    expect(validateData(d)).toEqual(d);
  });
  it('rejects duplicate IDs', () => {
    const d = fixture();
    d.semesters.push({ ...structuredClone(d.semesters[0]), order: 1 });
    expect(() => validateData(d)).toThrow('duplicate');
  });
  it('rejects duplicate case-insensitive grade labels', () => {
    const d = fixture();
    d.scale.push({ label: 'a', points: 3, completed: true });
    expect(() => validateData(d)).toThrow('duplicate');
  });
  it('rejects malformed preferences', () => {
    const d = fixture();
    d.preferences.precision = 5;
    expect(() => validateData(d)).toThrow('preferences');
  });
  it('rejects a zero-credit target', () => {
    const d = fixture();
    d.target.credits = 0;
    expect(() => validateData(d)).toThrow('goal');
  });
  it('rejects a scale without positive GPA points', () => {
    const d = freshData();
    d.scale = [{ label: 'P', points: null, completed: true }];
    expect(() => validateData(d)).toThrow('positive');
  });
  it('checks saved scenario courses too', () => {
    const d = fixture();
    d.scenarios = [
      {
        id: 'future',
        name: 'Plan',
        courses: [{ ...d.semesters[0].courses[0], id: 'future-course', grade: 'X' }],
      },
    ];
    expect(() => validateData(d)).toThrow('unknown grade');
  });
  it('rejects oversized semester lists', () => {
    const d = freshData();
    d.semesters = Array.from({ length: 101 }, (_, i) => ({
      id: String(i),
      order: i,
      name: 'Semester',
      status: 'completed',
      courses: [],
    }));
    expect(() => validateData(d)).toThrow('semesters');
  });
  it.each([null, [], {}, 42, 'broken'])('rejects malformed roots %s', (v) =>
    expect(() => validateData(v)).toThrow(),
  );
});

describe('course identities and v1 migration', () => {
  it('migrates every old row independently, retaining identical names, order, grades and preferences', () => {
    const legacy: any = fixture();
    legacy.version = 1;
    delete legacy.semesters[0].order;
    delete legacy.semesters[0].courses[0].courseId;
    legacy.semesters.push({
      ...structuredClone(legacy.semesters[0]),
      id: 's2',
      courses: [{ ...legacy.semesters[0].courses[0], id: 'c2', grade: 'D' }],
    });
    legacy.scenarios = [
      {
        id: 'scenario',
        name: 'My plan',
        courses: [{ ...legacy.semesters[0].courses[0], id: 'future' }],
      },
    ];
    legacy.preferences.theme = 'dark';
    const before = structuredClone(legacy);
    const migrated = validateData(legacy);
    expect(legacy).toEqual(before);
    expect(migrated.version).toBe(3);
    expect(migrated.semesters.map((s) => s.order)).toEqual([0, 1]);
    expect(migrated.semesters.map((s) => s.courses[0].courseId)).toEqual(['c1', 'c2']);
    expect(migrated.semesters[1].courses[0].grade).toBe('D');
    expect(migrated.scenarios[0].courses[0].courseId).toBe('future');
    expect(migrated.preferences).toEqual(legacy.preferences);
    expect(validateData(migrated)).toEqual(migrated);
  });
  it('preserves linked attempts across serialization and sorts by explicit order', () => {
    const d = fixture();
    d.semesters.unshift({
      ...structuredClone(d.semesters[0]),
      id: 's2',
      order: 4,
      courses: [{ ...d.semesters[0].courses[0], id: 'c2', grade: 'D' }],
    });
    const r = validateData(JSON.parse(JSON.stringify(d)));
    expect(r.semesters.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(r.semesters[0].courses[0].courseId).toBe(r.semesters[1].courses[0].courseId);
    expect(r.semesters[0].courses[0].grade).toBe('A');
  });
  it('rejects linked attempts with different credit hours', () => {
    const d = fixture();
    d.semesters.push({
      ...structuredClone(d.semesters[0]),
      id: 's2',
      order: 1,
      courses: [{ ...d.semesters[0].courses[0], id: 'c2', credits: 3 }],
    });
    expect(() => validateData(d)).toThrow('identical credit');
  });
  it('rejects two attempts of one course in a semester', () => {
    const d = fixture();
    d.semesters[0].courses.push({ ...d.semesters[0].courses[0], id: 'c2' });
    expect(() => validateData(d)).toThrow('one attempt');
  });
  it.each([-1, 0.5, 2147483648, undefined])('rejects invalid chronological order %s', (order) => {
    const d: any = fixture();
    d.semesters[0].order = order;
    expect(() => validateData(d)).toThrow('order');
  });
  it('rejects missing identity in v2 instead of silently relinking', () => {
    const d: any = fixture();
    delete d.semesters[0].courses[0].courseId;
    expect(() => validateData(d)).toThrow('identity');
  });
});
