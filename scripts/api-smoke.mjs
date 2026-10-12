import assert from 'node:assert/strict';

const base = process.env.FOLIO_API_URL ?? 'http://localhost:5080';
const scale = [{ label: 'A', points: 4, completed: true }, { label: 'B', points: 3, completed: true }, { label: 'F', points: 0, completed: false }, { label: 'P', points: null, completed: true }];
let checks = 0;
async function post(endpoint, body, expectedStatus = 200) {
  const response = await fetch(`${base}/api/gpa/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(response.status, expectedStatus, `${endpoint}: ${await response.clone().text()}`);
  const json = await response.json();
  if (expectedStatus === 400) { assert.match(response.headers.get('content-type'), /problem\+json/); assert.equal(json.status, 400); }
  checks++;
  return json;
}
assert.equal((await fetch(`${base}/api/health`)).status, 200);
const courses = [{ credits: 4, grade: 'B' }, { credits: 2, grade: 'A' }];
const semester = await post('semester', { scale, courses });
assert.ok(Math.abs(semester.gpa - 20 / 6) < 1e-12);
assert.equal(semester.qualityPoints, 20);
const cumulative = await post('cumulative', { scale, semesters: [{ id: 'a', name: 'One', courses }, { id: 'b', name: 'Two', courses: [{ credits: 9, grade: 'A' }] }] });
assert.ok(Math.abs(cumulative.total.gpa - 56 / 15) < 1e-12);
const simulation = await post('simulate', { scale, currentCourses: courses, futureCourses: [{ credits: 3, grade: 'A' }] });
assert.ok(Math.abs(simulation.projected.gpa - 32 / 9) < 1e-12);
const target = await post('target', { scale, currentCourses: courses, targetGpa: 3.5, futureCredits: 15 });
assert.ok(Math.abs(target.requiredGpa - 53.5 / 15) < 1e-12);
assert.equal(target.achievable, true);
await post('semester', { scale, courses: [{ credits: 0, grade: 'A' }] }, 400);
await post('semester', { scale, courses: [{ credits: 3, grade: 'Z' }] }, 400);
await post('semester', { scale, courses: null }, 400);
await post('semester', { scale: null, courses: [] }, 400);
await post('target', { scale, currentCourses: [], targetGpa: 3.5, futureCredits: 0 }, 400);
await post('cumulative', { scale, semesters: [{ id: 'a', name: 'One', courses: [] }, { id: 'a', name: 'Two', courses: [] }] }, 400);

const linkedSemesters = [{ id: 'late', name: 'Later', order: 2, courses: [{ id: 'retake', courseId: 'CS201', name: 'Data Structures', code: 'CS201', credits: 3, grade: 'A' }] }, { id: 'early', name: 'Earlier', order: 0, courses: [{ id: 'original', courseId: 'CS201', name: 'Data Structures', code: 'CS201', credits: 3, grade: 'F' }] }];
const history = await post('cumulative', { scale, semesters: linkedSemesters });
assert.equal(history.total.gpa, 4); assert.equal(history.total.gpaCredits, 3); assert.equal(history.total.attemptedCredits, 6); assert.equal(history.semesters[0].historical.gpa, 0); assert.equal(history.semesters[0].cumulativeGpa, 4); assert.equal(history.semesters[1].result.gpa, null); assert.equal(history.courses[0].attempts.length, 2);
const linkedProjection = await post('simulate', { scale, currentCourses: [], semesters: linkedSemesters, futureCourses: [{ id: 'third', courseId: 'CS201', credits: 3, grade: 'B' }] });
assert.equal(linkedProjection.current.gpa, 4); assert.equal(linkedProjection.projected.gpa, 3); assert.equal(linkedProjection.projected.gpaCredits, 3);
const linkedTarget = await post('target', { scale, currentCourses: [], semesters: linkedSemesters, targetGpa: 3.5, futureCredits: 3 }); assert.equal(linkedTarget.requiredGpa, 3);
const badCredits=structuredClone(linkedSemesters); badCredits[0].courses[0].credits=4; await post('cumulative', { scale, semesters:badCredits },400);
const badOrder=structuredClone(linkedSemesters); badOrder[0].order=0; await post('cumulative', { scale, semesters:badOrder },400);

console.log(`Passed ${checks} live HTTP checks: all calculation routes and Problem Details validation.`);
