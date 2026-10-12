using Folio.Api.Models;
namespace Folio.Api.DTOs;

public record CalculationRequest(List<GradeRule> Scale, List<CourseInput> Courses);
public record CumulativeRequest(List<GradeRule> Scale, List<SemesterInput> Semesters);
public record SimulationRequest(List<GradeRule> Scale, List<CourseInput> CurrentCourses, List<CourseInput> FutureCourses, List<SemesterInput>? Semesters = null);
public record TargetRequest(List<GradeRule> Scale, List<CourseInput> CurrentCourses, decimal TargetGpa, decimal FutureCredits, List<SemesterInput>? Semesters = null);
public record GpaResult(decimal? Gpa, decimal QualityPoints, decimal AttemptedCredits, decimal CompletedCredits, decimal GpaCredits, decimal PendingCredits);
public record SemesterResult(string Id, string Name, GpaResult Result, decimal? CumulativeGpa,
    GpaResult Original, GpaResult Historical, decimal? Improvement, List<string> RetakeChanges);
public record AttemptResult(string Id, string SemesterId, string SemesterName, int Order, string? Grade,
    decimal? Points, bool Excluded, bool Finalized, bool Effective, decimal? GpaImpact);
public record CourseResolution(string CourseId, string Name, string Code, decimal Credits,
    string OriginalSemesterId, string OriginalSemesterName, string? OriginalGrade, string? EffectiveGrade,
    string? EffectiveSemesterName, decimal? GradePointChange, decimal? CumulativeImpact, List<AttemptResult> Attempts);
public record CumulativeResult(GpaResult Total, List<SemesterResult> Semesters,
    List<CourseResolution> Courses, int RetakenCourses, decimal? RetakeImpact, GpaResult WithoutRetakes);
public record SimulationResult(GpaResult Current, GpaResult Future, GpaResult Projected, decimal? Change);
public record GradeCombination(string HigherGrade, decimal HigherCredits, string LowerGrade, decimal LowerCredits, decimal AverageGpa);
public record TargetResult(decimal RequiredGpa, bool Achievable, decimal MaximumGpa, decimal MinimumGpa, bool AlreadyAtTarget, GradeCombination? Suggestion);
public record OverviewRequest(List<GradeRule> Scale, List<SemesterInput> Semesters, string? CurrentSemesterId, List<ScoreBand> ScoreBands);
public record CoursePotential(string AttemptId, bool Valid, string? Issue, bool HasBreakdown, bool AllGraded,
    decimal TotalMarks, decimal Earned, decimal Lost, decimal Remaining, decimal? MaximumScore,
    string? Grade, decimal? Points, string Source);
public record SemesterPotential(string SemesterId, string Name, bool Valid, string? Issue,
    List<CoursePotential> Courses, GpaResult? Semester, GpaResult? Cumulative,
    decimal MarksLost, decimal Remaining, int InProgressCourses);
public record OverviewResult(CumulativeResult Records, CumulativeResult Actual, SemesterPotential? Potential);
public record FinalGradeInput(string AttemptId, string Grade);
public record FinalizeRequest(List<GradeRule> Scale, List<SemesterInput> Semesters, string? CurrentSemesterId,
    List<ScoreBand> ScoreBands, List<FinalGradeInput> Grades, bool Confirmed);
