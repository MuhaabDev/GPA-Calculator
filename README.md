# GPA Calculator

A local academic workspace built with **Angular 22.2**, **ASP.NET Core / .NET 10**, TypeScript, SCSS, and Chart.js. No account, database, or cloud service is required. The application starts empty; no academic records are fabricated or seeded.

## Run locally

Prerequisites: **.NET 10 SDK**, **Node.js 24.15+** (within the Node 24 release line), and npm.

Open two terminals in this project directory.

Terminal 1 — calculation API:

```powershell
dotnet run --project Backend/Folio.Api.csproj
```

Terminal 2 — frontend:

```powershell
cd Frontend
npm ci
npm start
```

Open **http://127.0.0.1:4200/**. The API listens at **http://localhost:5080**. Angular proxies `/api` requests to it through `Frontend/proxy.conf.json`. Keep both terminals running; use Ctrl+C to stop them.

Use the same address every time: `localhost:4200` and `127.0.0.1:4200` have **different browser storage**. If a port is occupied, stop the other application or update the launch/proxy configuration together.

The first package restore requires internet access. Once dependencies are installed, the app uses no remote fonts, images, analytics services, or hosted APIs. The backend does not save records.

## What is included

- **Overview:** onboarding with two 4.0 presets, weighted cumulative GPA, distinct credit totals, completed-semester count, latest graded semester, trend, progress chart, recent semesters, and goal progress.
- **Semesters:** create, rename, change status, reorder chronologically, and delete semesters; add/edit/delete courses; inline grade selection; optional course codes, decimal credits, pending grades, and explicit GPA exclusion.
- **Calculator:** independent single-semester scratchpad, calculated by the API. Scratchpad courses are not saved; use Semesters for actual records.
- **Simulator:** hypothetical course lists, bulk grade changes, live cumulative projection, change from actual GPA, and up to 12 named saved scenarios with a comparison chart. Actual records are untouched.
- **Goals:** auto-saved target and future credits, required average, mathematical feasibility, an illustrative grade-credit mix, maximum graduation GPA, and highest-grade projections over 15/30/45 credits.
- **Analytics:** historical versus retrospectively adjusted GPA, original/adjusted semester values, unique-credit progression, attempt grade distribution, retake impacts, chronological attempt history, and an academic journey timeline.
- **Settings:** light/dark themes, 1–3 display decimals, editable grade labels/points/credit-earning flags, non-GPA grades, validated JSON import/export, and confirmed reset.

## Architecture

```text
Backend/
  Controllers/GpaController.cs    HTTP routes only
  DTOs/Contracts.cs              Request/response contracts
  Models/GradeRule.cs            Grade, course, and semester inputs
  Services/GpaService.cs         Decimal calculation logic
  Validation/RequestValidator.cs Domain validation
  Program.cs                    DI, CORS, Problem Details
Backend.Tests/                  xUnit calculation tests
Frontend/src/app/
  core/                         Models, API, signals store, persistence, validation
  shared/                       Course editor/table, charts, dialog, icons, animated values
  features/                     Dashboard, semesters, calculator, simulator, planner,
                                analytics, settings
Frontend/src/styles.scss        Design tokens, components, light/dark, responsive layouts
scripts/api-smoke.mjs            Live HTTP contract smoke tests
docs/architecture.md             Data contracts, design decisions, and calculation policies
```

Angular standalone components use lazy routes. A signals store coordinates saved state and API results. Reactive Forms validate the course dialog; small inline controls use Angular Forms. Only `PersistenceService` accesses localStorage. Calculation requests cancel when newer inputs arrive. Failed requests clear the affected calculation, show a connection error, and provide Retry; there is no hidden client-side GPA fallback.

## Calculation rules

GPA = total quality points / total GPA-counted credits. Each course contributes `credits × configured grade points`. Cumulative GPA **never averages semester GPAs**. C# uses `decimal`; responses are JSON numbers. Display rounding is applied in the UI, not used as a new calculation baseline.

- Default grades: A+/A 4.0; A− 3.7; B+ 3.3; B 3.0; B− 2.7; C+ 2.3; C 2.0; C− 1.7; D+ 1.3; D 1.0; F 0.
- A blank course grade is pending and contributes no quality points or GPA credits.
- Default **P** earns completed credits without affecting GPA. **I/W** do not earn credits and do not affect GPA; they are grouped with pending/non-completed credits. **F** counts in GPA but earns no completed credits.
- **Attempted:** all entered course credits, including excluded, failed, withdrawn, and pending courses. This is a product definition; institutional “attempted hours” policies differ.
- **Unique earned (cumulative):** count a linked course once if any attempt has `completed: true` (“Earns credits”). A later failure does not erase credits already earned. GPA exclusion does not remove earned credits. Original semester / scratchpad performance counts earned credits per attempt.
- **GPA-counted:** each unique course whose latest finalized, non-excluded attempt has numeric points. A numeric zero grade still counts in the denominator.
- Empty or wholly non-GPA course lists return `gpa: null`, displayed as an em dash, never an invented zero.
- Linked retakes use the selected custom replacement policy described below. Different courses with the same name remain independent. This policy does not claim to reproduce an official university transcript.
- Semester status is organizational: both completed and in-progress semesters contribute their entered grades.
- Course credits: 0.01–100 in the UI; decimal credits supported. Future target credits: greater than zero, up to 1,000. Grade points: 0–10. The maximum scale value comes from the highest configured numeric grade.
- Required future GPA = `(target × (current GPA credits + future GPA credits) − current quality points) / future GPA credits`.
- A target above the achievable ceiling is explicitly marked impossible for the chosen credit amount. A negative required average is explained as already guaranteed under the assumptions and displayed at the minimum configured grade.
- Grade mixes allocate future **credits**, not whole courses. Higher-grade allocation rounds upward to quarter credits; the remaining allocation can be fractional. Actual course sizes may require a different combination.

## Retakes and GPA history

In **Semesters → Add course → Retake Existing Course**, search a prior finalized course, select it, and enter the new grade. Its identity and credit hours are populated automatically. You can add multiple later attempts. Expand a course’s history to inspect every earned grade; inline grade edits affect only that attempt.

- The latest finalized, non-excluded attempt wins, even if lower. Numeric F is finalized; blank/I/W do not replace a grade. A completed non-GPA grade such as P does replace an older numeric grade and removes that course’s GPA contribution while retaining earned credits.
- All linked attempts must have identical credit hours (zero credits are rejected); at most one attempt per course per semester. Name/code edits update identity metadata; original grades are never propagated.
- **Original semester GPA** describes actual attempts taken there. **Adjusted semester GPA** attributes today’s effective grade to the earliest surviving attempt’s semester. Retake-only semesters have no adjusted GPA, displayed as — with an explanation.
- **Historical cumulative GPA** resolves only attempts available through each semester. **Retrospective cumulative GPA** includes courses first taken through that semester using today’s replacement grades. The retrospective line is explicitly labeled, not presented as past performance.
- Removing a retake restores the previous eligible grade. Removing the original reanchors the course to its earliest remaining attempt. Inserting a semester before another or reordering with arrows changes chronology explicitly.
- Total retake impact compares today’s complete record against first attempts only. Per-course impact restores only that course’s first attempt while holding all other records constant. Attempt-history impacts compare with/without that attempt at the end of its semester; they include other courses from that semester. Undefined GPA comparisons display —. Negative changes remain negative.
- Historical values are reconstructed from saved records, not immutable audit snapshots: editing a past grade, grade rules, or semester order recalculates history. Adding later retakes leaves earlier historical points unchanged.
- Simulator and planner start from completed semesters’ adjusted quality points and unique GPA credits. Future planner credits and the simulator’s course editor represent new courses; they do not assume future replacements. The simulation API additionally accepts explicitly linked future attempts.

## Backups and recovery

Storage key stays **`folio.academic.v1`** to preserve existing records. The document is now **version 3**: stable course/attempt identities and chronological semester order remain; `currentSemesterId`, `scoreBands`, and optional nested attempt `assessments` extend them. Versions 1 and 2 migrate after validation, preserving grades, retake links, settings, goals and scenarios. Old records do not automatically select a current semester. The standard scale receives an explicitly editable example score mapping; custom scales stay unconfigured until you provide boundaries. Names never imply retake links.

Before an automatic migration writes the primary key, the exact previous payload is backed up to `folio.academic.v1.pre-v3`. Existing `.pre-v2` backups remain untouched. If validation or backup writing fails, the original remains intact and autosave is blocked. Version 1, 2 and 3 JSON imports are supported. Internal project names and build paths remain unchanged for compatibility.

**localStorage is browser- and origin-specific, not a database or permanent backup.** Export JSON regularly in Settings. Imports validate the version, types, ranges, duplicate IDs, grading references, preferences, targets, and record limits before a confirmation can replace your data. Backups larger than 5 MB are rejected.

If saved data is corrupted or has an unknown version, GPA Calculator preserves its original value and blocks automatic overwrite. The recovery banner lets you download the raw stored content. Import a valid backup or explicitly reset after recovering it. If browser storage fills or is unavailable, a visible warning tells you to export current in-memory work.

## Build and tests

```powershell
dotnet build Backend/Folio.Api.csproj
dotnet test Backend.Tests/Folio.Api.Tests.csproj
cd Frontend
npm test
npm run build
```

With the API running, from the project root:

```powershell
node scripts/api-smoke.mjs
node scripts/assessment-smoke.mjs
```

The backend tests cover unequal credit weights, precision, empty and first semesters, excluded and repeated attempts, F/P/I/missing grades, invalid values, simulation, zero future credits, impossible/already-achieved targets, custom scales, and feasible grade mixes. Frontend tests cover backup validation and non-mutating round trips. The live smoke scripts check the original calculation endpoints plus overview/finalization and structured 400 responses.

The Angular production build is emitted to `Frontend/dist/folio/browser`. `npm start` is the intended local workflow; serving the production bundle separately requires configuring a same-origin `/api` proxy and SPA route fallback.

## Design and accessibility

GPA Calculator uses a warm neutral/forest palette, restrained borders, compact typography, reusable control styles, and a mobile navigation drawer. Charts contain only entered data; the onboarding illustration is decorative. Dialogs use native modal focus behavior and Escape handling. Controls have labels, focus rings, keyboard support, and confirmation for destructive record operations. Motion respects reduced-motion preferences. Chart tooltips are interactive; numeric summaries remain available outside the charts.

This is a mathematical planning tool, not an institutional transcript or a graduation audit. Customize rules to match your university.


## Current semester assessment tracking

1. In **Semesters**, select an in-progress semester and choose **Make this my current semester**. Only one is active; place it chronologically after completed semesters. Pausing or switching keeps its marks, and inactive in-progress semesters are excluded from completed performance and the active projection.
2. In **Settings → Marks → grades**, review the editable example boundaries or configure your university’s rules. Minimums are inclusive; the next minimum is the exclusive upper bound, so coverage is continuous from 0 through 100. Higher scores cannot yield fewer points; the top band must award the configured maximum. For a new grade scale, clear incompatible score boundaries before saving it, then configure new boundaries.
3. Pending current courses start with 100 marks available. Expand **Assessment breakdown** to configure each course independently. The initial editable “Course total” row is a starting point, not a prescribed assessment policy. Add, rename, reorder or delete sections. Enter earned **or** lost marks; both edit one earned-mark value. Blank means not graded; zero means graded. Changes save automatically. Invalid earned marks are rejected, not scaled. Draft totals other than 100 save, but projections are unavailable until corrected.
4. **Highest GPA You Can Still Achieve** shows earned + remaining marks and credit-weighted potential. A current retake replaces its earlier contribution in the projected cumulative GPA without duplicating credits. Explicit final numeric or completed non-GPA grades remain fixed; incomplete grades stay eligible for assessment potential. Dashboard, historical analytics, simulator and target planner use completed records for actual performance. Analytics adds a separate dashed best-case extension.
5. **Finalize semester** proposes a grade only for a fully graded, valid breakdown. Missing marks require an explicitly selected official grade; no best-case grade is copied automatically. Review every grade and check the confirmation before saving. The semester becomes Completed, current tracking ends, and assessment entries remain available as read-only history. Recorded final grades remain editable using existing course controls.

The backend is authoritative: `POST /api/gpa/overview` takes `scale`, `semesters`, `currentSemesterId`, and `scoreBands`, returning all recorded metrics, completed-only actual metrics, and a separate potential object. `POST /api/gpa/finalize` additionally takes one `{ attemptId, grade }` choice per course and `confirmed: true`; it validates and returns the completed semester for Angular to persist. Neither endpoint stores data. Maximum achievable marks and GPAs are derived, never competing stored grades.

Assessment rows live under their owning attempt: `{ id, name, maximumMarks, earnedMarks: number | null, displayOrder }`. Omitting `assessments` means an unconfigured course with 100 marks available while current; an explicitly empty array is an invalid draft, not a reset to 100. Course credit hours remain strictly positive under the existing validation policy. Assessment weights may be zero and decimal. The calculation tests cover score thresholds, zero vs. null, invalid/draft totals, changing weights, exclusions, completed baselines, retakes, switching current semesters, and confirmed finalization.
