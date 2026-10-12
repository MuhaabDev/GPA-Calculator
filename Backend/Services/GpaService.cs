using Folio.Api.DTOs;
using Folio.Api.Models;
using Folio.Api.Validation;
namespace Folio.Api.Services;

public sealed class GpaService
{
    public GpaResult Calculate(List<GradeRule> scale, List<CourseInput> courses)
    {
        RequestValidator.Scale(scale);
        RequestValidator.Courses(courses, scale);
        decimal quality = 0, attempted = 0, completed = 0, counted = 0, pending = 0;
        foreach (var course in courses)
        {
            attempted += course.Credits;
            var grade = scale.FirstOrDefault(g => g.Label == course.Grade);
            if (grade is null) { pending += course.Credits; continue; }
            if (grade.Completed) completed += course.Credits;
            if (!grade.Completed && grade.Points is null) pending += course.Credits;
            if (course.Excluded || grade.Points is null) continue;
            quality += course.Credits * grade.Points.Value;
            counted += course.Credits;
        }
        return new(counted > 0 ? quality / counted : null, quality, attempted, completed, counted, pending);
    }

    public CumulativeResult Cumulative(CumulativeRequest request)
    {
        var semesters = OrderedSemesters(request.Scale, request.Semesters);
        var all = Attempts(semesters);
        ValidateLinks(all);
        var groups = all.GroupBy(a => a.Key).ToList();
        var total = Effective(request.Scale, all);
        var firstAttempts = groups.Select(g => g.First()).ToList();
        var baseline = Effective(request.Scale, firstAttempts);
        var results = new List<SemesterResult>();
        var resolutions = new List<CourseResolution>();
        foreach (var group in groups)
        {
            var first = group.First();
            var effective = Latest(request.Scale, group);
            var withoutThisRetake = group.Count() > 1
                ? Effective(request.Scale, all.Where(a => a.Key != group.Key).Append(first).ToList())
                : total;
            var history = group.Select((attempt, index) =>
            {
                decimal? impact = null;
                if (index > 0)
                {
                    var atTime = all.Where(a => a.Order <= attempt.Order).ToList();
                    var before = Effective(request.Scale, atTime.Where(a => a.Id != attempt.Id).ToList());
                    impact = Difference(Effective(request.Scale, atTime).Gpa, before.Gpa);
                }
                return new AttemptResult(attempt.Id, attempt.SemesterId, attempt.SemesterName, index + 1,
                    attempt.Course.Grade, Rule(request.Scale, attempt.Course)?.Points, attempt.Course.Excluded,
                    Finalized(request.Scale, attempt.Course), effective?.Id == attempt.Id,
                    impact);
            }).ToList();
            resolutions.Add(new(first.Course.CourseId ?? first.Id, first.Course.Name, first.Course.Code, first.Course.Credits,
                first.SemesterId, first.SemesterName, first.Course.Grade, effective?.Course.Grade,
                effective?.SemesterName, Difference(Rule(request.Scale, effective?.Course)?.Points, Rule(request.Scale, first.Course)?.Points),
                group.Count() > 1 ? Difference(total.Gpa, withoutThisRetake.Gpa) : 0, history));
        }
        foreach (var semester in semesters)
        {
            var order = semesters.IndexOf(semester);
            var original = Calculate(request.Scale, semester.Courses);
            var anchored = groups.Where(g => g.First().SemesterId == semester.Id).SelectMany(g => g).ToList();
            var adjusted = Effective(request.Scale, anchored) with { AttemptedCredits = original.AttemptedCredits, PendingCredits = original.PendingCredits };
            var through = groups.Where(g => g.First().Order <= order).SelectMany(g => g).ToList();
            var historical = Effective(request.Scale, all.Where(a => a.Order <= order).ToList());
            var changes = resolutions.SelectMany(c => c.Attempts.Where(a => a.SemesterId == semester.Id && a.Order > 1)
                .Select(a => $"{c.Name} ({c.Code}): {c.Attempts.Take(a.Order - 1).LastOrDefault(p => p.Finalized && !p.Excluded)?.Grade ?? "Pending"} → {a.Grade ?? "Pending"}, {c.Credits} credits{(!a.Finalized || a.Excluded ? " (no replacement)" : "")}")).ToList();
            results.Add(new(semester.Id, semester.Name, adjusted, Effective(request.Scale, through).Gpa,
                original, historical, Difference(adjusted.Gpa, original.Gpa), changes));
        }
        return new(total, results, resolutions, groups.Count(g => g.Count() > 1), Difference(total.Gpa, baseline.Gpa), baseline);
    }

    public SimulationResult Simulate(SimulationRequest request)
    {
        var attempts = CurrentAttempts(request.Scale, request.CurrentCourses, request.Semesters);
        var current = Effective(request.Scale, attempts);
        var future = Calculate(request.Scale, request.FutureCourses);
        var futureOrder = attempts.Count == 0 ? 0 : attempts.Max(a => a.Order) + 1;
        var combined = attempts.Concat(request.FutureCourses.Select((c, i) => new Attempt(c.Id ?? $"future-{i}", Key(c, $"future-{i}"), "future", "Projected semester", futureOrder, c))).ToList();
        ValidateLinks(combined);
        var projected = Effective(request.Scale, combined);
        return new(current, future, projected, current.Gpa.HasValue && projected.Gpa.HasValue ? projected.Gpa - current.Gpa : null);
    }

    public TargetResult Target(TargetRequest request)
    {
        var current = Effective(request.Scale, CurrentAttempts(request.Scale, request.CurrentCourses, request.Semesters));
        var grades = request.Scale.Where(g => g.Points.HasValue).OrderBy(g => g.Points).ToList();
        var max = grades.Last().Points!.Value;
        var min = grades.First().Points!.Value;
        if (request.FutureCredits <= 0 || request.FutureCredits > 1000)
            throw new InputException("Future GPA credits must be greater than 0 and at most 1,000.");
        if (request.TargetGpa < 0 || request.TargetGpa > max)
            throw new InputException($"Target GPA must be between 0 and {max}.");
        var totalCredits = current.GpaCredits + request.FutureCredits;
        var required = (request.TargetGpa * totalCredits - current.QualityPoints) / request.FutureCredits;
        var maximum = (current.QualityPoints + max * request.FutureCredits) / totalCredits;
        var minimum = (current.QualityPoints + min * request.FutureCredits) / totalCredits;
        GradeCombination? suggestion = null;
        if (required <= max)
        {
            var effective = Math.Max(required, min);
            var low = grades.Last(g => g.Points <= effective);
            var high = grades.First(g => g.Points >= effective);
            var highCredits = high.Points == low.Points ? request.FutureCredits : request.FutureCredits * (effective - low.Points!.Value) / (high.Points!.Value - low.Points.Value);
            // Round UP to a quarter credit so the illustrative mix actually meets the target.
            highCredits = Math.Min(request.FutureCredits, Math.Ceiling(highCredits * 4) / 4);
            var lowCredits = request.FutureCredits - highCredits;
            var average = (highCredits * high.Points!.Value + lowCredits * low.Points!.Value) / request.FutureCredits;
            suggestion = new(high.Label, highCredits, low.Label, lowCredits, average);
        }
        return new(required, required <= max, maximum, minimum, current.Gpa >= request.TargetGpa, suggestion);
    }

    private sealed record Attempt(string Id, string Key, string SemesterId, string SemesterName, int Order, CourseInput Course);
    private static string Key(CourseInput course, string fallback) => course.CourseId is null ? $"independent:{fallback}" : $"linked:{course.CourseId}";
    private static GradeRule? Rule(List<GradeRule> scale, CourseInput? course) => course is null ? null : scale.FirstOrDefault(g => g.Label == course.Grade);
    // Completed means "earns credit", so a numeric F is also a finalized attempt.
    private static bool Finalized(List<GradeRule> scale, CourseInput course) => Rule(scale, course) is { } g && (g.Points.HasValue || g.Completed);
    private static Attempt? Latest(List<GradeRule> scale, IEnumerable<Attempt> attempts) => attempts.LastOrDefault(a => !a.Course.Excluded && Finalized(scale, a.Course));
    private static decimal? Difference(decimal? after, decimal? before) => after.HasValue && before.HasValue ? after - before : null;

    private List<SemesterInput> OrderedSemesters(List<GradeRule> scale, List<SemesterInput>? semesters)
    {
        RequestValidator.Scale(scale);
        if (semesters is null || semesters.Count > 100 || semesters.Any(s => s is null || string.IsNullOrWhiteSpace(s.Id) || string.IsNullOrWhiteSpace(s.Name) || s.Name.Length > 80) || semesters.Select(s => s.Id).Distinct().Count() != semesters.Count)
            throw new InputException("Provide up to 100 semesters with unique IDs and names of 1–80 characters.");
        if (semesters.Any(s => s.Order.HasValue) && (semesters.Any(s => s.Order is null or < 0) || semesters.Select(s => s.Order).Distinct().Count() != semesters.Count))
            throw new InputException("Every semester needs a unique, non-negative chronological order.");
        foreach (var semester in semesters) RequestValidator.Courses(semester.Courses, scale);
        if (semesters.Sum(s => s.Courses.Count) > 5000) throw new InputException("Provide no more than 5,000 academic attempts.");
        // Array ordering is supported only for older clients without explicit order fields.
        return semesters.Any(s => s.Order.HasValue) ? semesters.OrderBy(s => s.Order).ToList() : semesters.ToList();
    }

    private static List<Attempt> Attempts(List<SemesterInput> semesters) => semesters.SelectMany((s, index) => s.Courses.Select((c, i) =>
        new Attempt(c.Id ?? $"{s.Id}:{i}", Key(c, $"{s.Id}:{i}"), s.Id, s.Name, index, c))).ToList();

    private List<Attempt> CurrentAttempts(List<GradeRule> scale, List<CourseInput> courses, List<SemesterInput>? semesters)
    {
        RequestValidator.Scale(scale);
        List<Attempt> attempts;
        if (semesters is not null) attempts = Attempts(OrderedSemesters(scale, semesters));
        else
        {
            RequestValidator.Courses(courses, scale);
            attempts = courses.Select((c, i) => new Attempt(c.Id ?? $"current-{i}", Key(c, $"current-{i}"), $"current-{i}", "Current records", i, c)).ToList();
        }
        ValidateLinks(attempts);
        return attempts;
    }

    private static void ValidateLinks(List<Attempt> attempts)
    {
        if (attempts.Select(a => a.Id).Distinct().Count() != attempts.Count) throw new InputException("Attempt IDs must be unique.");
        foreach (var group in attempts.GroupBy(a => a.Key))
        {
            if (group.Select(a => a.Course.Credits).Distinct().Count() > 1) throw new InputException("Linked attempts must have identical credit hours. Different-credit retakes are unsupported.");
            if (group.Select(a => a.SemesterId).Distinct().Count() != group.Count()) throw new InputException("A course may have only one attempt in each semester.");
        }
    }

    private GpaResult Effective(List<GradeRule> scale, List<Attempt> attempts)
    {
        decimal quality = 0, counted = 0, earned = 0;
        foreach (var group in attempts.GroupBy(a => a.Key))
        {
            var credits = group.First().Course.Credits;
            if (group.Any(a => Rule(scale, a.Course)?.Completed == true)) earned += credits;
            var chosen = Latest(scale, group);
            if (Rule(scale, chosen?.Course)?.Points is { } points)
            {
                quality += credits * points;
                counted += credits;
            }
        }
        return new(counted > 0 ? quality / counted : null, quality, attempts.Sum(a => a.Course.Credits), earned, counted,
            attempts.Where(a => !Finalized(scale, a.Course)).Sum(a => a.Course.Credits));
    }
}
