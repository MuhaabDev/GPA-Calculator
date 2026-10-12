# Architecture and product decisions

## Boundaries

The browser holds the source records. `Store` exposes signals and computed view state, calls `ApiService`, and persists through `PersistenceService`. `GpaService` is the single authority for GPA, cumulative, scenario, and target calculations. ASP.NET controllers translate typed JSON requests into service calls; they perform no persistence. No repository layer, authentication, database, or deployment infrastructure is needed.

UI component hierarchy: app shell → lazy feature page → shared panels, course table/editor, Chart.js wrapper, native dialog, and animated number. Feature pages own temporary interaction state. The global store owns saved state. The simulator and calculator keep unsaved courses separate from actual records.

## Versioned browser model

```typescript
interface AcademicData {
  version: 3;
  currentSemesterId: string | null;
  scoreBands: { minimum: number; grade: string }[];
  semesters: { id: string; order: number; name: string; status: 'completed' | 'in-progress'; courses: Course[] }[];
  scale: { label: string; points: number | null; completed: boolean }[];
  preferences: { theme: 'light' | 'dark'; precision: number; onboarded: boolean };
  target: { gpa: number; credits: number };
  scenarios: { id: string; name: string; courses: Course[] }[];
}
interface Course {
  id: string; // Attempt identity
  courseId: string; // Shared only by explicitly linked attempts
  name: string;
  code: string;
  credits: number;
  grade: string | null;
  excluded: boolean;
  assessments?: { id: string; name: string; maximumMarks: number; earnedMarks: number | null; displayOrder: number }[];
}
```

IDs are UUIDs. A course row is an attempt; shared `courseId` establishes identity without name matching. Explicit integer semester `order` defines chronology independently of array order. One attempt per identity per semester and equal credits across a chain are validated in both layers. Attempt sequence and original semester are derived by the backend from ordered surviving records. V1 migrates at the persistence boundary, preserving each row as an independent identity, with an exact pre-migration backup. Grade labels are case-sensitive references and unique ignoring case. Saved scenarios have independent attempt IDs.

## API contracts

All calculation routes are POST requests with JSON bodies. A course sent to the API needs only `credits`, `grade`, and `excluded` (default false); `id`, `courseId`, `name`, and `code` are also accepted. Linked attempts require distinct `id` values and a shared `courseId`. Without identity metadata, legacy API course rows remain independent. A scale is an array of `{label, points, completed}` objects. Null points mean non-GPA; the credit-earning flag is independent of GPA points.

`POST /api/gpa/semester`

```json
{
  "scale": [{"label":"A","points":4,"completed":true},{"label":"B","points":3,"completed":true}],
  "courses": [{"credits":4,"grade":"B","excluded":false},{"credits":2,"grade":"A","excluded":false}]
}
```

Response: `{gpa, qualityPoints, attemptedCredits, completedCredits, gpaCredits, pendingCredits}`. In the example, quality points = 20, GPA credits = 6, and GPA = 20/6.

`POST /api/gpa/cumulative`: {scale, semesters: [{id, name, order, courses}]}. Explicit orders must be unique non-negative integers; old clients omitting all orders retain array chronology. The frontend always sends explicit order. Response:

- total: current adjusted GpaResult, unique GPA and earned credits, all attempted/pending credits.
- semesters: ordered [{id, name, original, result, historical, cumulativeGpa, improvement, retakeChanges}]. original is actual attempt performance; result is adjusted origin-attributed performance; historical is cumulative at that point; cumulativeGpa is retrospectively adjusted cumulative. result.attemptedCredits/pendingCredits describe that semester’s actual attempts.
- courses: resolved identities including origin, original/effective grade, effectivesemester, gradePointChange, current cumulativeImpact, chronological attempts with effective/finalized flags and per-attempt gpaImpact.
- retakenCourses, retakeImpact, withoutRetakes: comparison with first attempts only.

`POST /api/gpa/simulate`: {scale, currentCourses, futureCourses, semesters?}. When semesters is provided it is the authoritative ordered baseline; currentCourses is retained for older clients. Response: {current, future, projected, change}; future is raw attempt performance, projected resolves linked attempts over the combined record. Future linked identities reuse original credits and count only once.

`POST /api/gpa/target`: {scale, currentCourses, targetGpa, futureCredits, semesters?}. The same authoritative ordered baseline applies. Response: {requiredGpa, achievable, maximumGpa, minimumGpa, alreadyAtTarget, suggestion}. Future credits are new unique GPA credits. A feasible suggestion contains {higherGrade, higherCredits, lowerGrade, lowerCredits, averageGpa}; an infeasible target has suggestion: null.

`GET /api/health`: `{status: "ready"}`.

Domain validation produces HTTP 400 `application/problem+json` with `status`, `title`, `detail`, and `instance`. ASP.NET model-binding validation uses standard Validation Problem Details. Unexpected server errors return a generic 500 Problem Details response without exposing internals.

## Visual system

- Surfaces: off-white canvas, white panels, barely tinted sidebar; dark theme uses deep green-charcoal surfaces.
- Emphasis: one forest-green action color and muted sage accents. Error states use a restrained warm red.
- Layout: fixed desktop sidebar, breadcrumb/status bar, 42px main gutters, 16–24px panel gaps, and focused page headers. Tablet/mobile collapse the sidebar and stack panels.
- Shape: 6px controls and 9–12px panels; strong hierarchy comes from spacing and typography rather than decorative gradients.
- Interaction: 150–200ms control transitions, animated changing GPA values, native accessible modals, inline grade dropdowns, cancellable calculation requests, and status toasts.
- Charts: Chart.js with restrained lines/bars, fixed scale bounds for GPA, responsive tooltips, and theme-aware labels. Empty states never render synthetic academic data.

## Deliberate limits

Only the explicitly documented custom latest-attempt replacement policy is supported. No different-credit retakes, transfer-credit reconciliation, or institutional graduation audits. No cross-device sync. Scratchpad calculator and unsaved simulator edits are temporary. Saved scenarios recalculate against current actual records and current grade rules. Course organization is list-based; semester arrows provide explicit accessible chronological ordering instead of drag-only interaction.


## Assessment projection extension (schema v3)

The existing GpaService remains the single retake resolver. AssessmentService validates nested attempt assessments, derives earned/lost/remaining marks using decimals, converts scores through configured minimum boundaries, and calls GpaService for projections. No stored grades are overwritten by overview calculations.

Angular Store requests `/api/gpa/overview`: `records` retains original record views, `actual` filters completed semesters, and `potential` covers exactly `currentSemesterId`. Dashboard, analytics, simulator and planner use the completed baseline. Active pending attempts become projected grade copies before retake resolution. Inactive in-progress semesters never contribute to that projection. Explicit chronological order must place the current semester after completed semesters.

Standalone PotentialSummary, AssessmentCourse, ScoreBands and FinalizeSemester components reuse existing design tokens and dialog/control patterns. Numeric GPA transitions use the existing animated-number component. Assessment forms save through Store/PersistenceService; no component accesses localStorage. Finalization sends reviewed grade choices to `/api/gpa/finalize` and atomically persists its returned grades/status while clearing currentSemesterId. The historical chart appends a distinct dashed projection dataset and leaves completed data unchanged.

Migration validates v1/v2, preserves retake identities, keeps the original origin/storage key, and backs up the previous payload under `.pre-v3` before writing. No semester is made current by migration. Empty score boundaries are valid stored configuration with unavailable assessment conversion, useful for legacy custom scales. No-assessments (`undefined`) and deliberately empty assessment arrays have different meanings.
