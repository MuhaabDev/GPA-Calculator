namespace Folio.Api.Models;

public sealed record GradeRule(string Label, decimal? Points, bool Completed = true);
// Id identifies an attempt; CourseId links attempts. Missing identity retains legacy independent-course behavior.
public sealed record CourseInput(decimal Credits, string? Grade, bool Excluded = false,
    string? Id = null, string? CourseId = null, string Name = "", string Code = "", List<AssessmentInput>? Assessments = null);
public sealed record SemesterInput(string Id, string Name, List<CourseInput> Courses, int? Order = null, string Status = "completed");
public sealed record AssessmentInput(string Id, string Name, decimal MaximumMarks, decimal? EarnedMarks, int DisplayOrder);
public sealed record ScoreBand(decimal Minimum, string Grade);
