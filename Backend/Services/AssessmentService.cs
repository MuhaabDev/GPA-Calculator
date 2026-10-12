using Folio.Api.DTOs;
using Folio.Api.Models;
using Folio.Api.Validation;
namespace Folio.Api.Services;

// Assessment arithmetic never changes a stored grade. Only the explicit finalization response
// contains final grades; Angular persists that response after the student's review.
public sealed class AssessmentService(GpaService gpa)
{
    public void ValidateBands(List<GradeRule> scale, List<ScoreBand>? bands)
    {
        RequestValidator.Scale(scale);
        if (bands is null || bands.Count is < 1 or > 30 || bands.Any(b => b is null || b.Minimum < 0 || b.Minimum > 100 || !scale.Any(g => g.Label == b.Grade && g.Points.HasValue)))
            throw new InputException("Configure score boundaries from 0 to 100 using numeric GPA grades.");
        var ordered = bands.OrderBy(b => b.Minimum).ToList();
        if (ordered[0].Minimum != 0 || ordered.Select(b => b.Minimum).Distinct().Count() != ordered.Count)
            throw new InputException("Score boundaries must start at 0 and have unique minimum percentages. Upper bounds are the next minimum (exclusive), with 100 included in the last band.");
        var points = ordered.Select(b => scale.Single(g => g.Label == b.Grade).Points!.Value).ToList();
        if (points.Zip(points.Skip(1)).Any(p => p.First > p.Second) || points[^1] != scale.Max(g => g.Points ?? 0))
            throw new InputException("Higher scores cannot earn fewer GPA points, and the highest band must award the maximum configured GPA.");
    }

    public GradeRule ConvertScore(List<GradeRule> scale, List<ScoreBand> bands, decimal score)
    {
        ValidateBands(scale, bands);
        if (score < 0 || score > 100) throw new InputException("A score must be between 0 and 100.");
        var selected = bands.Where(b => b.Minimum <= score).MaxBy(b => b.Minimum)!;
        return scale.Single(g => g.Label == selected.Grade);
    }

    private static void ValidateAssessments(CourseInput course)
    {
        if (course.Assessments is not { } rows) return;
        if (rows.Count > 100 || rows.Any(a => a is null || string.IsNullOrWhiteSpace(a.Id) || a.Id.Length > 100 || string.IsNullOrWhiteSpace(a.Name) || a.Name.Length > 80 || a.MaximumMarks < 0 || a.MaximumMarks > 100 || a.EarnedMarks < 0 || a.EarnedMarks > a.MaximumMarks || a.DisplayOrder < 0)
            || rows.Select(a => a.Id).Distinct().Count() != rows.Count || rows.Select(a => a.DisplayOrder).Distinct().Count() != rows.Count)
            throw new InputException("Assessments need unique IDs/order, names, maximum marks from 0 to 100, and earned marks between 0 and their maximum. Clear or correct earned marks before reducing a weight.");
    }

    public CoursePotential Course(List<GradeRule> scale, List<ScoreBand> bands, CourseInput course)
    {
        RequestValidator.Scale(scale);
        RequestValidator.Courses([course], scale);
        ValidateAssessments(course);
        var rows = course.Assessments;
        var total = rows?.Sum(a => a.MaximumMarks) ?? 100;
        var earned = rows?.Sum(a => a.EarnedMarks ?? 0) ?? 0;
        var lost = rows?.Where(a => a.EarnedMarks.HasValue).Sum(a => a.MaximumMarks - a.EarnedMarks!.Value) ?? 0;
        var remaining = rows?.Where(a => !a.EarnedMarks.HasValue).Sum(a => a.MaximumMarks) ?? 100;
        var allGraded = rows is { Count: > 0 } && rows.All(a => a.EarnedMarks.HasValue);
        var recorded = scale.FirstOrDefault(g => g.Label == course.Grade && (g.Points.HasValue || g.Completed));
        // An explicitly recorded final grade is fixed, never replaced with a best-case guess.
        if (recorded is not null)
            return new(course.Id!, true, null, rows is not null, allGraded, total, earned, lost, 0, null, recorded.Label, recorded.Points, "recorded");
        if (total != 100)
            return new(course.Id!, false, $"Assessment total is {total:0.##}/100. Adjust the breakdown to exactly 100.", rows is not null, allGraded, total, earned, lost, remaining, null, null, null, "assessments");
        try
        {
            var grade = ConvertScore(scale, bands, earned + remaining);
            return new(course.Id!, true, null, rows is not null, allGraded, total, earned, lost, remaining, earned + remaining, grade.Label, grade.Points, "assessments");
        }
        catch (InputException e)
        {
            return new(course.Id!, false, e.Message, rows is not null, allGraded, total, earned, lost, remaining, null, null, null, "assessments");
        }
    }

    public OverviewResult Overview(OverviewRequest request)
    {
        // Reuse the existing identity, chronology, credit, scale and retake validation.
        var records = gpa.Cumulative(new(request.Scale, request.Semesters));
        if (request.Semesters.Any(s => s.Status is not ("completed" or "in-progress")))
            throw new InputException("Semester status must be completed or in-progress.");
        foreach (var c in request.Semesters.SelectMany(s => s.Courses)) ValidateAssessments(c);
        var assessmentIds = request.Semesters.SelectMany(s => s.Courses).SelectMany(c => c.Assessments ?? []).Select(a => a.Id).ToList();
        if (assessmentIds.Distinct().Count() != assessmentIds.Count) throw new InputException("Assessment IDs must be unique across course attempts.");
        var completed = request.Semesters.Where(s => s.Status == "completed").ToList();
        var actual = gpa.Cumulative(new(request.Scale, completed));
        if (request.CurrentSemesterId is null) return new(records, actual, null);
        var current = request.Semesters.SingleOrDefault(s => s.Id == request.CurrentSemesterId)
            ?? throw new InputException("Select an existing current semester.");
        if (current.Status != "in-progress") throw new InputException("Only an in-progress semester can be current.");
        if (current.Order is null || completed.Any(s => s.Order is null || s.Order >= current.Order))
            throw new InputException("Place the current semester after completed semesters in chronological order before tracking potential.");
        if (current.Courses.Any(c => string.IsNullOrWhiteSpace(c.Id))) throw new InputException("Current courses require attempt IDs.");
        var courses = current.Courses.Select(c => Course(request.Scale, request.ScoreBands, c)).ToList();
        // An invalid draft must never silently disappear from a semester projection, even if excluded.
        var valid = courses.All(c => c.Valid);
        var projectedCourses = current.Courses.Select((c, i) => c with { Grade = courses[i].Grade }).ToList();
        GpaResult? semester = valid ? gpa.Calculate(request.Scale, projectedCourses) : null;
        GpaResult? projected = valid ? gpa.Cumulative(new(request.Scale, completed.Append(current with { Courses = projectedCourses }).ToList())).Total : null;
        return new(records, actual, new(current.Id, current.Name, valid,
            valid ? null : "Complete the score boundaries and every assessment total before using this projection.",
            courses, semester, projected, courses.Sum(c => c.Lost), courses.Sum(c => c.Remaining),
            courses.Count(c => c.Source != "recorded" && !c.AllGraded)));
    }

    public SemesterInput Finalize(FinalizeRequest request)
    {
        if (!request.Confirmed) throw new InputException("Review and explicitly confirm final grades before completing a semester.");
        var overview = Overview(new(request.Scale, request.Semesters, request.CurrentSemesterId, request.ScoreBands));
        if (overview.Potential is null) throw new InputException("Select the current semester before finalizing.");
        var current = request.Semesters.Single(s => s.Id == request.CurrentSemesterId);
        if (request.Grades is null || request.Grades.Count != current.Courses.Count || request.Grades.Any(g => g is null) || request.Grades.Select(g => g.AttemptId).Distinct().Count() != request.Grades.Count)
            throw new InputException("Confirm a final grade for every course attempt. Missing assessments must not be assumed to receive full marks.");
        var finalized = current.Courses.Select(c =>
        {
            var choice = request.Grades.SingleOrDefault(g => g.AttemptId == c.Id);
            if (choice is null || !request.Scale.Any(g => g.Label == choice.Grade))
                throw new InputException("Every course needs a reviewed final grade. Finish its assessments or explicitly enter its official grade.");
            return c with { Grade = choice.Grade };
        }).ToList();
        return current with { Courses = finalized, Status = "completed" };
    }
}
