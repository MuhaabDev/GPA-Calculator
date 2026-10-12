export interface GradeRule {
  label: string;
  points: number | null;
  completed: boolean;
}
export interface Assessment {
  id: string;
  name: string;
  maximumMarks: number;
  earnedMarks: number | null;
  displayOrder: number;
}
export interface ScoreBand {
  minimum: number;
  grade: string;
}
export interface CoursePotential {
  attemptId: string;
  valid: boolean;
  issue: string | null;
  hasBreakdown: boolean;
  allGraded: boolean;
  totalMarks: number;
  earned: number;
  lost: number;
  remaining: number;
  maximumScore: number | null;
  grade: string | null;
  points: number | null;
  source: 'recorded' | 'assessments';
}
export interface SemesterPotential {
  semesterId: string;
  name: string;
  valid: boolean;
  issue: string | null;
  courses: CoursePotential[];
  semester: GpaResult | null;
  cumulative: GpaResult | null;
  marksLost: number;
  remaining: number;
  inProgressCourses: number;
}
export interface OverviewResult {
  records: CumulativeResult;
  actual: CumulativeResult;
  potential: SemesterPotential | null;
}
export interface Course {
  id: string;
  courseId: string;
  name: string;
  code: string;
  credits: number;
  grade: string | null;
  excluded: boolean;
  assessments?: Assessment[];
}
export interface Semester {
  id: string;
  order: number;
  name: string;
  status: 'completed' | 'in-progress';
  courses: Course[];
}
export interface Scenario {
  id: string;
  name: string;
  courses: Course[];
}
export interface AcademicData {
  version: 3;
  currentSemesterId: string | null;
  scoreBands: ScoreBand[];
  semesters: Semester[];
  scale: GradeRule[];
  preferences: { theme: 'light' | 'dark'; precision: number; onboarded: boolean };
  target: { gpa: number; credits: number };
  scenarios: Scenario[];
}
export interface GpaResult {
  gpa: number | null;
  qualityPoints: number;
  attemptedCredits: number;
  completedCredits: number;
  gpaCredits: number;
  pendingCredits: number;
}
export interface CumulativeResult {
  total: GpaResult;
  semesters: SemesterResult[];
  courses: CourseResolution[];
  retakenCourses: number;
  retakeImpact: number | null;
  withoutRetakes: GpaResult;
}
export interface SemesterResult {
  id: string;
  name: string;
  result: GpaResult;
  cumulativeGpa: number | null;
  original: GpaResult;
  historical: GpaResult;
  improvement: number | null;
  retakeChanges: string[];
}
export interface AttemptResult {
  id: string;
  semesterId: string;
  semesterName: string;
  order: number;
  grade: string | null;
  points: number | null;
  excluded: boolean;
  finalized: boolean;
  effective: boolean;
  gpaImpact: number | null;
}
export interface CourseResolution {
  courseId: string;
  name: string;
  code: string;
  credits: number;
  originalSemesterId: string;
  originalSemesterName: string;
  originalGrade: string | null;
  effectiveGrade: string | null;
  effectiveSemesterName: string | null;
  gradePointChange: number | null;
  cumulativeImpact: number | null;
  attempts: AttemptResult[];
}
export interface SimulationResult {
  current: GpaResult;
  future: GpaResult;
  projected: GpaResult;
  change: number | null;
}
export interface TargetResult {
  requiredGpa: number;
  achievable: boolean;
  maximumGpa: number;
  minimumGpa: number;
  alreadyAtTarget: boolean;
  suggestion: {
    higherGrade: string;
    higherCredits: number;
    lowerGrade: string;
    lowerCredits: number;
    averageGpa: number;
  } | null;
}
export const defaultScale = (): GradeRule[] => [
  ...[
    ['A+', 4],
    ['A', 4],
    ['A-', 3.7],
    ['B+', 3.3],
    ['B', 3],
    ['B-', 2.7],
    ['C+', 2.3],
    ['C', 2],
    ['C-', 1.7],
    ['D+', 1.3],
    ['D', 1],
    ['F', 0],
  ].map(([label, points]) => ({
    label: String(label),
    points: Number(points),
    completed: label !== 'F',
  })),
  { label: 'P', points: null, completed: true },
  { label: 'I', points: null, completed: false },
  { label: 'W', points: null, completed: false },
];
export const freshData = (): AcademicData => ({
  version: 3,
  currentSemesterId: null,
  scoreBands: defaultScoreBands(),
  semesters: [],
  scale: defaultScale(),
  preferences: { theme: 'light', precision: 2, onboarded: false },
  target: { gpa: 3.5, credits: 15 },
  scenarios: [],
});
export const newCourse = (): Course => ({
  id: crypto.randomUUID(),
  courseId: crypto.randomUUID(),
  name: '',
  code: '',
  credits: 3,
  grade: null,
  excluded: false,
});

// An editable example preset, not a university rule. Lower bounds are inclusive.
export const defaultScoreBands = (): ScoreBand[] => [
  { minimum: 97, grade: 'A+' },
  { minimum: 94, grade: 'A' },
  { minimum: 90, grade: 'A-' },
  { minimum: 85, grade: 'B+' },
  { minimum: 80, grade: 'B' },
  { minimum: 75, grade: 'B-' },
  { minimum: 70, grade: 'C+' },
  { minimum: 65, grade: 'C' },
  { minimum: 60, grade: 'C-' },
  { minimum: 55, grade: 'D+' },
  { minimum: 50, grade: 'D' },
  { minimum: 0, grade: 'F' },
];
