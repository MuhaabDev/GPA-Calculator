# Verification record

Verified locally on October 12, 2026, with .NET 10.0.401 and Node 24.15.0.

## Course retakes, GPA history, and rebranding

- ASP.NET project builds and **58 xUnit tests pass**.
- Angular production build succeeds; initial transfer estimate remains about 88 kB, with lazy feature pages and charts.
- **41 Vitest tests pass**, including v1 migration, v2 linked-attempt round trips, chronology/credit validation, corrupt-storage preservation, and migration-backup write failure.
- **15 live HTTP checks pass**, covering all four calculation endpoints, linked retakes, explicit semester order, adjusted simulator/target baselines, and Problem Details validation.
- Frontend source is formatted with Prettier.

Browser verification used explicitly labeled QA records on **http://127.0.0.1:4201**. The normal application origin and its existing student records were not used for these tests. Fixtures are test inputs only; no academic data is seeded into the application.

Verified through the real UI:

- Importing a v1 backup preserves original course names, codes, grades, credits, semesters, scale, and preferences.
- Searching CS201 in Retake Existing Course selects Data Structures and populates the linked identity and fixed credit hours.
- Three 3-credit courses graded A/B/D retain an original semester GPA of 2.67; a later A retake changes its adjusted GPA to 3.67, with +1.00 shown. Original D remains visible.
- The retake-only semester displays no adjusted GPA instead of 0.00. Its actual attempt performance remains available.
- Historical cumulative points remain 2.67 then 3.67; the retrospective line shows 3.67 through both semesters.
- Analytics toggles, explicit numeric history, attempt details, unique-earned-credit chart, retake comparisons, and generated timeline all use real imported/entered records.
- An incomplete third attempt leaves A effective, including after reload.
- Changing the third attempt to C lowers the adjusted GPA to 3.00. Historical progression remains 2.67 → 3.67 → 3.00; the third attempt shows -0.67 impact.
- Deleting that latest attempt restores the prior effective A and adjusted 3.67.
- Planner shows 3.67 current GPA and 9 unique GPA credits; a 3.50 goal over 15 new credits requires a 3.40 future average. Simulator starts at the same 3.67 and 9 credits.
- JSON export produces a version-2 backup with explicit order 0/1/2 and distinct attempt IDs sharing the original identity. Exported grades D/A/C were inspected.
- Light/dark appearance and narrow-screen analytics were checked. The page has no horizontal overflow; the detailed history table scrolls within its own container.
- Visible product branding and route titles use GPA Calculator. No unexpected browser console errors occurred during successful flows.

Backend tests also cover zero/decimal/different credits, multiple retakes in one semester, lower-grade replacement of A, F/P/incomplete/excluded semantics, deletion of retake semesters, deletion of the original, editing the original after replacement, out-of-order input, explicit reordering, duplicate attempt IDs, independent same-name courses, and empty/non-GPA results.

The screenshot `screenshots/gpa-calculator-retakes.jpg` shows the original semester and expanded replacement history using labeled test records.

## Existing core regression coverage

The retained calculation tests and API checks cover unequal credit weights, precision, first/empty semesters, custom scales, missing/invalid grades, target feasibility and ceilings, zero future credits, and grade-credit mixes. Existing browser verification previously covered onboarding, scratchpad calculations, scenario saving/comparison, theme preferences, scale edits, JSON restore, and API-disconnection recovery.

History is reconstructed from saved attempts and current grading rules, not an immutable audit log. This record is not a claim of exhaustive browser/device compatibility testing.


## Current-semester assessments — 12 October 2026

- Backend: 103 passing xUnit tests, including 45 assessment/score conversion/current-semester cases. Zero-credit courses remain rejected by the original validation rule; zero-weight assessments are supported.
- Frontend: 56 passing Vitest tests for persistence, v1/v2 migration, backups, score boundaries, null/zero/decimal marks, invalid weights, active identifiers, and round trips. Angular production compilation and formatting checks passed.
- Live API: 15 existing plus 8 assessment smoke checks against an isolated API. Actual versus potential, retake credit deduplication, invalid draft totals, invalid marks, confirmation requirements and finalized historical GPA were asserted.
- Browser QA used isolated port 4202 and test records; the normal application origin and its saved data were not modified. Imported a v2 record with an older D and pending linked retake; explicitly selected the current semester. Initial ceiling was 4.00. Configured separate 40/60 sections and entered 33/40: earned 33, lost 7, available 60, ceiling 93/A−/3.70. The second pending course stayed at 100/A+/4.00, yielding a 3.85 semester and retake-aware cumulative ceiling. Completed actual GPA stayed 1.00 over 3 unique GPA credits.
- Verified changing 33 to 34 crosses the example threshold to 94/A/4.00; entering zero produces 60/C−/1.70, not an ungraded assumption. Editing lost marks updates the same earned entry. Reducing a weight below earned marks produces an unsaved validation error and supports restoring saved entries. An incomplete 40-mark draft has no projection. Reload preserves marks and current selection.
- Analytics exposes unchanged historical 1.00 and distinct projected 3.85 values, with 7 lost/160 remaining across both courses. Grade distribution excludes unfinished semesters.
- Finalization leaves missing-mark course choices empty and its action disabled. Fully assessing the remaining 60 marks proposes A− for that course while the other remains empty. Returning its remaining marks to ungraded and explicitly confirming official B/A grades completes the semester, ends potential tracking, and yields 3.50 cumulative over 6 unique credits (9 attempted). Historical progression remains 1.00 → 3.50; retrospective history becomes 3.00 → 3.50. Saved assessment entries remain attached to the finalized attempt.
- Light/dark desktop and 390px viewport layouts checked; narrow page scroll width equaled client width (375 CSS px), without horizontal page overflow. No browser console errors occurred in successful application flows. Screenshot `screenshots/gpa-calculator-assessments.png` records the current-semester design using test data.

These are recorded verification results, not a claim of exhaustive device coverage. Custom score boundaries must be reviewed by the student before relying on projections.
