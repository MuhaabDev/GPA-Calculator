using Folio.Api.Models;
namespace Folio.Api.Validation;

public sealed class InputException(string message) : Exception(message);

public static class RequestValidator
{
    public static void Scale(List<GradeRule>? scale)
    {
        if (scale is null || scale.Count is < 1 or > 30 || scale.Any(g => g is null || string.IsNullOrWhiteSpace(g.Label) || g.Label.Length > 12 || g.Points is < 0 or > 10))
            throw new InputException("Provide 1–30 grade rules, with unique labels and points between 0 and 10.");
        if (scale.Select(g => g.Label).Distinct(StringComparer.OrdinalIgnoreCase).Count() != scale.Count)
            throw new InputException("Grade labels must be unique (ignoring case).");
        if (!scale.Any(g => g.Points > 0)) throw new InputException("The scale needs at least one positive GPA-counted grade.");
    }

    public static void Courses(List<CourseInput>? courses, List<GradeRule> scale)
    {
        if (courses is null || courses.Count > 5000) throw new InputException("Provide no more than 5,000 courses.");
        foreach (var course in courses)
        {
            if (course is null || course.Credits <= 0 || course.Credits > 100)
                throw new InputException("Each course must have more than 0 and at most 100 credit hours.");
            if ((course.CourseId is not null && (string.IsNullOrWhiteSpace(course.CourseId) || course.CourseId.Length > 100 || string.IsNullOrWhiteSpace(course.Id))) || course.Id?.Length > 100)
                throw new InputException("Linked courses require a stable course ID and a unique attempt ID of at most 100 characters.");
            if (!string.IsNullOrEmpty(course.Grade) && !scale.Any(g => g.Label == course.Grade))
                throw new InputException($"Unknown grade: {course.Grade}. Use a grade from your configured scale.");
        }
    }
}
