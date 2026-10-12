using Folio.Api.DTOs;
using Folio.Api.Models;
using Folio.Api.Services;
using Folio.Api.Validation;
using Xunit;
namespace Folio.Api.Tests;

public class RetakeTests
{
    private readonly GpaService service = new();
    private readonly List<GradeRule> scale = [new("A",4),new("B",3),new("C",2),new("D",1),new("F",0,false),new("P",null,true),new("I",null,false),new("W",null,false)];
    private static CourseInput Course(string id,string key,string? grade,decimal credits=3,bool excluded=false) => new(credits,grade,excluded,id,key,key,"CS201");
    private static SemesterInput Semester(int order,params CourseInput[] courses) => new($"s{order}",$"Semester {order}",courses.ToList(),order);
    private CumulativeResult Run(params SemesterInput[] semesters) => service.Cumulative(new(scale,semesters.ToList()));
    [Fact] public void SingleAttemptMatchesOriginalAndAdjusted()
    {
        var r=Run(Semester(1,Course("a","data","D")));
        Assert.Equal(1m,r.Total.Gpa);Assert.Equal(r.Semesters[0].Original,r.Semesters[0].Result);Assert.Equal(3,r.Total.CompletedCredits);Assert.Equal(0,r.RetakenCourses);
    }
    [Fact] public void ExamplePreservesHistoryAndAttributesReplacementToOrigin()
    {
        var r=Run(Semester(3,Course("a","algorithms","A"),Course("b","databases","B"),Course("c","structures","D")),Semester(5,Course("d","structures","A")));
        Assert.Equal(8m/3,r.Semesters[0].Original.Gpa);Assert.Equal(11m/3,r.Semesters[0].Result.Gpa);
        Assert.Equal(8m/3,r.Semesters[0].Historical.Gpa);Assert.Equal(11m/3,r.Semesters[0].CumulativeGpa);
        Assert.Equal(11m/3,r.Total.Gpa);Assert.Equal(1m,r.Semesters[0].Improvement);Assert.Equal(12,r.Total.AttemptedCredits);Assert.Equal(9,r.Total.CompletedCredits);Assert.Equal(9,r.Total.GpaCredits);
        Assert.Equal("D",r.Courses[2].OriginalGrade);Assert.Equal("A",r.Courses[2].EffectiveGrade);Assert.Equal(1m,r.Courses[2].CumulativeImpact);Assert.Equal(1m,r.RetakeImpact);
    }
    [Fact] public void RetakeOnlySemesterHasOriginalPerformanceButNoAdjustedGpa()
    {
        var r=Run(Semester(1,Course("a","x","D")),Semester(2,Course("b","x","A")));
        Assert.Equal(4m,r.Semesters[1].Original.Gpa);Assert.Null(r.Semesters[1].Result.Gpa);Assert.Equal(0,r.Semesters[1].Result.GpaCredits);Assert.Equal(3,r.Semesters[1].Result.AttemptedCredits);
    }
    [Fact] public void MultipleRetakesHaveChronologicalHistory()
    {
        var r=Run(Semester(1,Course("a","x","D")),Semester(2,Course("b","x","B")),Semester(3,Course("c","x","A")));
        Assert.Equal(new decimal?[]{1,3,4},r.Semesters.Select(s=>s.Historical.Gpa));Assert.All(r.Semesters,s=>Assert.Equal(4m,s.CumulativeGpa));
        Assert.Equal(new decimal?[]{null,2,1},r.Courses[0].Attempts.Select(a=>a.GpaImpact));Assert.Equal(3,r.Total.GpaCredits);Assert.Equal(9,r.Total.AttemptedCredits);Assert.Equal(3,r.Courses[0].Attempts.Count);
    }
    [Fact] public void LatestLowerGradeReplacesAnAWithoutErasingEarnedCredit()
    {
        var r=Run(Semester(1,Course("a","x","A")),Semester(2,Course("b","x","F")));
        Assert.Equal(0m,r.Total.Gpa);Assert.Equal(-4m,r.RetakeImpact);Assert.Equal(-4m,r.Courses[0].Attempts[1].GpaImpact);Assert.Equal(3,r.Total.CompletedCredits);Assert.Equal("F",r.Courses[0].EffectiveGrade);
    }
    [Theory][InlineData(null)][InlineData("I")][InlineData("W")]
    public void UnfinishedRetakeDoesNotReplace(string? grade)
    {
        var r=Run(Semester(1,Course("a","x","B")),Semester(2,Course("b","x",grade)));
        Assert.Equal(3m,r.Total.Gpa);Assert.Equal(3,r.Total.PendingCredits);Assert.Equal(0m,r.RetakeImpact);Assert.True(r.Courses[0].Attempts[0].Effective);
    }
    [Fact] public void ExcludedRetakeDoesNotReplace()
    {
        var r=Run(Semester(1,Course("a","x","B")),Semester(2,Course("b","x","A",excluded:true)));
        Assert.Equal(3m,r.Total.Gpa);Assert.Equal(0m,r.Courses[0].Attempts[1].GpaImpact);
    }
    [Fact] public void TimelineUsesPreviousEffectiveGradeAcrossIncompleteAttempts()
    {
        var r=Run(Semester(1,Course("a","x","B")),Semester(2,Course("b","x","I")),Semester(3,Course("c","x","A")));
        Assert.Contains("B → A",r.Semesters[2].RetakeChanges[0]);Assert.Equal(1m,r.Courses[0].Attempts[2].GpaImpact);
    }
    [Fact] public void CompletedNonGpaRetakeReplacesWithoutInventingQualityPoints()
    {
        var r=Run(Semester(1,Course("a","x","F")),Semester(2,Course("b","x","P")));
        Assert.Null(r.Total.Gpa);Assert.Equal(0,r.Total.GpaCredits);Assert.Equal(3,r.Total.CompletedCredits);Assert.Equal("P",r.Courses[0].EffectiveGrade);Assert.Null(r.RetakeImpact);
    }
    [Fact] public void MultipleCoursesRetakenTogetherUseCompleteRecordForImpact()
    {
        var r=Run(Semester(1,Course("a","x","D"),Course("b","y","B"),Course("c","z","A",6)),Semester(2,Course("d","x","A"),Course("e","y","C")));
        Assert.Equal(3.5m,r.Total.Gpa);Assert.Equal(.5m,r.RetakeImpact);Assert.Equal(.75m,r.Courses[0].CumulativeImpact);Assert.Equal(-.25m,r.Courses[1].CumulativeImpact);Assert.Equal(12,r.Total.GpaCredits);
    }
    [Fact] public void DeleteRetakeRestoresPreviousEffectiveGrade()
    {
        var original=Semester(1,Course("a","x","D"));var middle=Semester(2,Course("b","x","B"));var latest=Semester(3,Course("c","x","A"));
        Assert.Equal(4m,Run(original,middle,latest).Total.Gpa);latest.Courses.Clear();Assert.Equal(3m,Run(original,middle,latest).Total.Gpa);
    }
    [Fact] public void DeleteRetakeSemesterRestoresPreviousEffectiveGrade()
    {
        var semesters=new List<SemesterInput>{Semester(1,Course("a","x","D")),Semester(2,Course("b","x","A"))};semesters.RemoveAt(1);Assert.Equal(1m,Run(semesters.ToArray()).Total.Gpa);
    }
    [Fact] public void DeleteOriginalReanchorsToEarliestSurvivingAttempt()
    {
        var r=Run(Semester(2,Course("b","x","B")),Semester(3,Course("c","x","A")));Assert.Equal("s2",r.Courses[0].OriginalSemesterId);Assert.Equal(4m,r.Semesters[0].Result.Gpa);
    }
    [Fact] public void EditOriginalPreservesLaterReplacementAndReconstructsHistory()
    {
        var original=Semester(1,Course("a","x","D"));var later=Semester(2,Course("b","x","A"));original.Courses[0]=original.Courses[0] with {Grade="C"};
        var r=Run(original,later);Assert.Equal(2m,r.Semesters[0].Original.Gpa);Assert.Equal(2m,r.Semesters[0].Historical.Gpa);Assert.Equal(4m,r.Total.Gpa);
    }
    [Fact] public void ExplicitOrderControlsHistoryEvenWhenArrayIsOutOfOrder()
    {
        var r=Run(Semester(7,Course("c","x","C")),Semester(1,Course("a","x","A")),Semester(5,Course("b","x","B")));
        Assert.Equal(new[]{"s1","s5","s7"},r.Semesters.Select(s=>s.Id));Assert.Equal(2m,r.Total.Gpa);Assert.Equal("s1",r.Courses[0].OriginalSemesterId);
    }
    [Fact] public void ReorderingSemestersChangesLatestAndAnchorConsistently()
    {
        var r=Run(Semester(1,Course("a","x","A")) with {Order=8},Semester(5,Course("b","x","B")));Assert.Equal(4m,r.Total.Gpa);Assert.Equal("s5",r.Courses[0].OriginalSemesterId);
    }
    [Fact] public void SameNameWithDifferentIdentityIsNeverMerged()
    {
        var a=Course("a","identity1","D") with {Name="Same name"};var b=Course("b","identity2","A") with {Name="Same name"};var r=Run(Semester(1,a),Semester(2,b));Assert.Equal(6,r.Total.GpaCredits);Assert.Equal(0,r.RetakenCourses);
    }
    [Fact] public void DecimalCreditsRemainUniqueAndPrecise()
    {
        var r=Run(Semester(1,Course("a","x","D",1.25m),Course("b","y","B",2.5m)),Semester(2,Course("c","x","A",1.25m)));Assert.Equal(12.5m/3.75m,r.Total.Gpa);Assert.Equal(3.75m,r.Total.GpaCredits);
    }
    [Theory][InlineData(0)][InlineData(4)] public void ZeroOrChangedRetakeCreditsAreRejected(decimal credits) => Assert.Throws<InputException>(()=>Run(Semester(1,Course("a","x","D")),Semester(2,Course("b","x","A",credits))));
    [Fact] public void DuplicateAttemptsInSameSemesterAreRejected() => Assert.Throws<InputException>(()=>Run(Semester(1,Course("a","x","D"),Course("b","x","A"))));
    [Fact] public void DuplicateAttemptIdsAreRejected() => Assert.Throws<InputException>(()=>Run(Semester(1,Course("a","x","D")),Semester(2,Course("a","x","A"))));
    [Fact] public void DuplicateOrderIsRejected() => Assert.Throws<InputException>(()=>Run(Semester(1),Semester(2) with {Order=1}));
    [Fact] public void PartialOrderingIsRejected() => Assert.Throws<InputException>(()=>Run(Semester(1),Semester(2) with {Order=null}));
    [Fact] public void NoCountedCoursesHasNullGpa() {var r=Run(Semester(1,Course("a","x",null)),Semester(2,Course("b","x","I")));Assert.Null(r.Total.Gpa);Assert.Equal(6,r.Total.AttemptedCredits);Assert.Equal(0,r.Total.CompletedCredits);}
    [Fact] public void SimulationAndTargetUseOrderedAdjustedBaseline()
    {
        List<SemesterInput> semesters=[Semester(2,Course("b","x","A")),Semester(1,Course("a","x","D"))];
        var sim=service.Simulate(new(scale,[],[Course("c","y","C")],semesters));Assert.Equal(4m,sim.Current.Gpa);Assert.Equal(3m,sim.Projected.Gpa);Assert.Equal(6,sim.Projected.GpaCredits);
        var target=service.Target(new(scale,[],3.5m,3,semesters));Assert.Equal(3m,target.RequiredGpa);Assert.Equal(4m,target.MaximumGpa);
    }
    [Fact] public void HypotheticalLinkedAttemptReplacesWithoutAddingCredits()
    {
        var sim=service.Simulate(new(scale,[],[Course("b","x","A")],[Semester(1,Course("a","x","D"))]));Assert.Equal(4m,sim.Projected.Gpa);Assert.Equal(3,sim.Projected.GpaCredits);Assert.Equal(6,sim.Projected.AttemptedCredits);
    }
}
