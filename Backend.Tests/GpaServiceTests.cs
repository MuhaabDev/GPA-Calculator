using Folio.Api.DTOs;
using Folio.Api.Models;
using Folio.Api.Services;
using Folio.Api.Validation;
using Xunit;

namespace Folio.Api.Tests;

public class GpaServiceTests
{
    private readonly GpaService service = new();
    private readonly List<GradeRule> scale = [new("A",4),new("A-",3.7m),new("B",3),new("C",2),new("F",0,false),new("P",null),new("I",null,false)];

    [Fact] public void FirstSemesterWeightsDifferentCredits()
    {
        var r=service.Calculate(scale,[new(4,"A"),new(2,"C")]);
        Assert.Equal(20m,r.QualityPoints); Assert.Equal(6m,r.GpaCredits); Assert.Equal(20m/6,r.Gpa);
    }
    [Fact] public void CumulativeUsesQualityPointsNotMeanOfGpas()
    {
        var r=service.Cumulative(new(scale,[new("1","Fall",[new(3,"A")]),new("2","Spring",[new(9,"C")])]));
        Assert.Equal(2.5m,r.Total.Gpa); Assert.NotEqual(3m,r.Total.Gpa); Assert.Equal(4m,r.Semesters[0].CumulativeGpa);
    }
    [Fact] public void EmptySemesterHasNoGpa()
    {
        var r=service.Calculate(scale,[]); Assert.Null(r.Gpa); Assert.Equal(0,r.GpaCredits);
    }
    [Fact] public void CreditsAreDistinguishedAndIncompleteExcluded()
    {
        var r=service.Calculate(scale,[new(3,"A"),new(3,"F"),new(2,"P"),new(2,"I"),new(1,null),new(4,"A",true)]);
        Assert.Equal(15,r.AttemptedCredits); Assert.Equal(9,r.CompletedCredits); Assert.Equal(6,r.GpaCredits); Assert.Equal(3,r.PendingCredits); Assert.Equal(2m,r.Gpa);
    }
    [Fact] public void DecimalCreditsKeepPrecision()
    {
        var r=service.Calculate(scale,[new(1.25m,"A-"),new(2.5m,"B")]);
        Assert.Equal(12.125m,r.QualityPoints); Assert.Equal(12.125m/3.75m,r.Gpa);
    }
    [Theory] [InlineData(0)] [InlineData(-1)] [InlineData(101)]
    public void InvalidCreditsAreRejected(decimal credits) => Assert.Throws<InputException>(()=>service.Calculate(scale,[new(credits,"A")]));
    [Fact] public void UnknownGradeIsRejectedEvenWhenExcluded() => Assert.Throws<InputException>(()=>service.Calculate(scale,[new(3,"X",true)]));
    [Fact] public void IndependentScratchpadRowsCountUnlessExplicitlyExcluded()
    {
        Assert.Equal(2m,service.Calculate(scale,[new(3,"F"),new(3,"A")]).Gpa);
        Assert.Equal(4m,service.Calculate(scale,[new(3,"F",true),new(3,"A")]).Gpa);
    }
    [Fact] public void SimulationCombinesActualAndFutureQualityPoints()
    {
        var r=service.Simulate(new(scale,[new(9,"B")],[new(3,"A")]));
        Assert.Equal(3m,r.Current.Gpa); Assert.Equal(4m,r.Future.Gpa); Assert.Equal(3.25m,r.Projected.Gpa); Assert.Equal(.25m,r.Change);
    }
    [Fact] public void SimulationWithoutGradesHasNoInventedGpa()
    {
        var r=service.Simulate(new(scale,[],[new(3,null)])); Assert.Null(r.Projected.Gpa); Assert.Null(r.Change);
    }
    [Fact] public void TargetUsesExactQualityPoints()
    {
        var courses=new List<CourseInput>{new(1.25m,"A-"),new(2.5m,"B")};
        var r=service.Target(new(scale,courses,3.5m,3));
        Assert.Equal((3.5m*6.75m-12.125m)/3,r.RequiredGpa); Assert.True(r.Achievable);
    }
    [Fact] public void ImpossibleTargetReportsCeiling()
    {
        var r=service.Target(new(scale,[new(90,"B")],3.8m,15));
        Assert.False(r.Achievable); Assert.Equal(8.6m,r.RequiredGpa); Assert.Equal(330m/105,r.MaximumGpa); Assert.Null(r.Suggestion);
    }
    [Theory] [InlineData(0)] [InlineData(-15)] [InlineData(1001)]
    public void InvalidFutureCreditsAreRejected(decimal credits) => Assert.Throws<InputException>(()=>service.Target(new(scale,[],3.5m,credits)));
    [Fact] public void AlreadyAboveTargetStillComputesMaintenance()
    {
        var r=service.Target(new(scale,[new(30,"A")],3.5m,15)); Assert.True(r.AlreadyAtTarget); Assert.Equal(2.5m,r.RequiredGpa);
    }
    [Fact] public void LowTargetCanBeGuaranteedEvenWithZeroFuturePoints()
    {
        var r=service.Target(new(scale,[new(90,"A")],2m,15)); Assert.True(r.Achievable); Assert.True(r.RequiredGpa<0); Assert.Equal(0,r.Suggestion!.AverageGpa);
    }
    [Fact] public void FirstSemesterTargetNeedsNoBaseline()
    {
        var r=service.Target(new(scale,[],3.5m,15)); Assert.Equal(3.5m,r.RequiredGpa); Assert.Equal(4m,r.MaximumGpa);
    }
    [Fact] public void SuggestedCreditMixMeetsOrExceedsTarget()
    {
        var current=new List<CourseInput>{new(9,"B")};
        var r=service.Target(new(scale,current,3.37m,7.3m));var s=r.Suggestion!;
        Assert.Equal(7.3m,s.HigherCredits+s.LowerCredits); Assert.True(s.AverageGpa>=r.RequiredGpa);
        Assert.True((27+s.AverageGpa*7.3m)/16.3m>=3.37m);
    }
    [Fact] public void CustomScaleControlsTheMaximum()
    {
        var r=service.Target(new([new("Excellent",5),new("Pass",2),new("Fail",0,false)],[],4.8m,10)); Assert.True(r.Achievable); Assert.Equal(5m,r.MaximumGpa);
    }
    [Fact] public void DuplicateGradeLabelsAreRejected() => Assert.Throws<InputException>(()=>service.Calculate([new("A",4),new("a",3)],[]));
    [Fact] public void AllExcludedScaleIsRejected() => Assert.Throws<InputException>(()=>service.Calculate([new("P",null)],[]));
    [Fact] public void EmptyCumulativeHasNoGpa() => Assert.Null(service.Cumulative(new(scale,[])).Total.Gpa);
    [Fact] public void EmptySemesterDoesNotChangeCumulative()
    {
        var r=service.Cumulative(new(scale,[new("1","Fall",[new(3,"A")]),new("2","Spring",[])]));Assert.Equal(4m,r.Semesters[1].CumulativeGpa);Assert.Null(r.Semesters[1].Result.Gpa);
    }
    [Fact] public void OutOfScaleTargetIsRejected() => Assert.Throws<InputException>(()=>service.Target(new(scale,[],4.1m,15)));
    [Fact] public void NullCourseCollectionIsRejected() => Assert.Throws<InputException>(()=>service.Calculate(scale,null!));
    [Fact] public void NullScaleIsRejected() => Assert.Throws<InputException>(()=>service.Calculate(null!,[]));
}
