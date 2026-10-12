using Folio.Api.DTOs;
using Folio.Api.Models;
using Folio.Api.Services;
using Folio.Api.Validation;
using Xunit;
namespace Folio.Api.Tests;

public class AssessmentTests
{
    private readonly AssessmentService service = new(new GpaService());
    private readonly List<GradeRule> scale = [new("A+",4),new("A",4),new("A-",3.7m),new("B+",3.3m),new("B",3),new("C",2),new("D",1),new("F",0,false),new("P",null,true),new("I",null,false)];
    private readonly List<ScoreBand> bands = [new(97,"A+"),new(94,"A"),new(90,"A-"),new(85,"B+"),new(75,"B"),new(65,"C"),new(50,"D"),new(0,"F")];
    private static AssessmentInput A(string id,decimal max,decimal? earned,int order=0) => new(id,id,max,earned,order);
    private static CourseInput C(string id="c",string? grade=null,List<AssessmentInput>? rows=null,decimal credits=3,string? identity=null,bool excluded=false) => new(credits,grade,excluded,id,identity??id,id,"",rows);
    private static SemesterInput S(string id,int order,string status,params CourseInput[] courses)=>new(id,id,courses.ToList(),order,status);
    private OverviewResult Overview(params SemesterInput[] semesters)=>service.Overview(new(scale,semesters.ToList(),"now",bands));
    private CoursePotential Calc(List<AssessmentInput>? rows)=>service.Course(scale,bands,C(rows:rows));
    private List<AssessmentInput> Example()=>[A("project",10,8),A("hands",10,10,1),A("midterm",15,12,2),A("final",40,null,3),A("practical",20,null,4),A("quiz",5,3,5)];

    [Fact] public void NewUnconfiguredCourseStartsAtFullPotentialWithoutActualGrade()
    {var r=Overview(S("now",1,"in-progress",C()));Assert.Equal(100,r.Potential!.Courses[0].MaximumScore);Assert.Equal("A+",r.Potential.Courses[0].Grade);Assert.Equal(4m,r.Potential.Semester!.Gpa);Assert.Null(r.Actual.Total.Gpa);Assert.Null(r.Records.Total.Gpa);}
    [Fact] public void AllNotGradedStillHasFullMarks()
    {var p=Calc([A("a",40,null),A("b",60,null,1)]);Assert.Equal(0,p.Earned);Assert.Equal(0,p.Lost);Assert.Equal(100,p.Remaining);Assert.Equal(100,p.MaximumScore);Assert.False(p.AllGraded);}
    [Fact] public void IncompleteCurrentAttemptHasPotentialButDoesNotReplaceActualGrade()
    {var r=Overview(S("past",0,"completed",C("old","D",identity:"linked")),S("now",1,"in-progress",C("new","I",identity:"linked")));Assert.Equal(1m,r.Actual.Total.Gpa);Assert.Equal(1m,r.Records.Total.Gpa);Assert.Equal(4m,r.Potential!.Cumulative!.Gpa);Assert.Equal(3m,r.Potential.Cumulative.GpaCredits);}
    [Fact] public void FullMarksInGradedSectionsKeepMaximum()
    {var p=Calc([A("a",40,40),A("b",60,null,1)]);Assert.Equal(40,p.Earned);Assert.Equal(60,p.Remaining);Assert.Equal(100,p.MaximumScore);}
    [Fact] public void ExampleSeparatesEarnedLostRemainingAndConverts93()
    {var p=Calc(Example());Assert.Equal(33,p.Earned);Assert.Equal(7,p.Lost);Assert.Equal(60,p.Remaining);Assert.Equal(93,p.MaximumScore);Assert.Equal("A-",p.Grade);Assert.Equal(3.7m,p.Points);}
    [Theory][InlineData(0,"F")][InlineData(49.99,"F")][InlineData(50,"D")][InlineData(89.99,"B+")][InlineData(90,"A-")][InlineData(93,"A-")][InlineData(94,"A")][InlineData(97,"A+")][InlineData(100,"A+")]
    public void ScoreBoundariesAreInclusiveWithNoGaps(decimal score,string expected)=>Assert.Equal(expected,service.ConvertScore(scale,bands,score).Label);
    [Fact] public void EditingEarnedMarksRecalculatesAndCrossesThreshold()
    {var rows=Example();rows[0]=rows[0] with {EarnedMarks=9};var p=Calc(rows);Assert.Equal(94,p.MaximumScore);Assert.Equal(4m,p.Points);}
    [Theory][InlineData(90)][InlineData(110)]
    public void DraftTotalCannotProduceGpa(decimal total)
    {var rows=new List<AssessmentInput>{A("a",total/2,null),A("b",total/2,null,1)};var r=Overview(S("now",1,"in-progress",C(rows:rows)));Assert.False(r.Potential!.Valid);Assert.Null(r.Potential.Courses[0].MaximumScore);Assert.Null(r.Potential.Semester);Assert.Null(r.Potential.Cumulative);}
    [Fact] public void DeletingLastAssessmentStaysInvalidInsteadOfReturningToImplicit100()
    {Assert.False(Calc([]).Valid);Assert.True(Calc(null).Valid);}
    [Fact] public void ZeroEarnedMeansGradedNotPending()
    {var p=Calc([A("a",40,0),A("b",60,null,1)]);Assert.Equal(40,p.Lost);Assert.Equal(60,p.MaximumScore);Assert.Equal(60,p.Remaining);}
    [Fact] public void ZeroWeightAssessmentIsSupported()
    {var p=Calc([A("a",0,0),A("b",100,null,1)]);Assert.True(p.Valid);Assert.Equal(100,p.MaximumScore);}
    [Fact] public void AllGradedHasOnlyEarnedMarksAndFinalCandidate()
    {var p=Calc([A("a",40,33),A("b",60,60,1)]);Assert.True(p.AllGraded);Assert.Equal(0,p.Remaining);Assert.Equal(93,p.MaximumScore);}
    [Fact] public void ResetToNullRestoresAvailableMarksWithoutTreatingZeroAsNull()
    {var p=Calc([A("a",100,0)]);Assert.Equal(0,p.MaximumScore);Assert.Equal(100,Calc([A("a",100,null)]).MaximumScore);}
    [Fact] public void DecimalMarksKeepPrecision()
    {var p=Calc([A("a",33.3m,32.95m),A("b",66.7m,null,1)]);Assert.Equal(99.65m,p.MaximumScore);Assert.Equal(.35m,p.Lost);}
    [Theory][InlineData(-1,0)][InlineData(10,11)][InlineData(10,-1)]
    public void InvalidMarksAreRejected(decimal max,decimal earned)=>Assert.Throws<InputException>(()=>Calc([A("a",max,earned)]));
    [Fact] public void ReducingWeightBelowExistingEarnedMarksIsRejectedWithoutScaling()=>Assert.Throws<InputException>(()=>Calc([A("a",5,8),A("b",95,null,1)]));
    [Fact] public void DuplicateAssessmentIdsAndOrderAreRejected()
    {Assert.Throws<InputException>(()=>Calc([A("a",50,40),A("a",50,null,1)]));Assert.Throws<InputException>(()=>Calc([A("a",50,40),A("b",50,null)]));}
    [Fact] public void WeightedPotentialUsesActualCredits()
    {var r=Overview(S("now",1,"in-progress",C("db",rows:[A("a",100,93)]),C("alg"),C("os",rows:[A("b",100,96)]),C("se",rows:[A("c",100,88)],credits:2)));Assert.Equal(41.7m/11,r.Potential!.Semester!.Gpa);Assert.Equal(11,r.Potential.Cumulative!.GpaCredits);}
    [Fact] public void CurrentRetakeReplacesWithoutDuplicatedCreditsAndLeavesHistoryUntouched()
    {var old=S("past",0,"completed",C("first","D",identity:"x"));var current=S("now",1,"in-progress",C("retake",identity:"x",rows:[A("a",100,93)]));var r=Overview(old,current);Assert.Equal(1m,r.Actual.Total.Gpa);Assert.Equal(3.7m,r.Potential!.Cumulative!.Gpa);Assert.Equal(3,r.Potential.Cumulative.GpaCredits);Assert.Equal(1m,r.Actual.Semesters[0].Historical.Gpa);Assert.Null(current.Courses[0].Grade);}
    [Fact] public void LowRetakeCeilingCanLowerProjectedGpa()
    {var r=Overview(S("past",0,"completed",C("first","A",identity:"x")),S("now",1,"in-progress",C("retake",identity:"x",rows:[A("a",100,20)])));Assert.Equal(4m,r.Actual.Total.Gpa);Assert.Equal(0m,r.Potential!.Cumulative!.Gpa);Assert.Equal(3,r.Potential.Cumulative.CompletedCredits);}
    [Fact] public void ExcludedCourseDoesNotChangeGpaDenominator()
    {var r=Overview(S("now",1,"in-progress",C("counted"),C("excluded",rows:[A("a",100,0)],excluded:true)));Assert.Equal(4m,r.Potential!.Semester!.Gpa);Assert.Equal(3,r.Potential.Semester.GpaCredits);}
    [Fact] public void OtherInProgressSemestersAreNotProjectedOrCountedAsCompleted()
    {var r=Overview(S("past",0,"completed",C("past","B")),S("now",1,"in-progress",C()),S("later",2,"in-progress",C("later","F")));Assert.Equal(3m,r.Actual.Total.Gpa);Assert.Equal(3.5m,r.Potential!.Cumulative!.Gpa);Assert.Single(r.Actual.Semesters);}
    [Fact] public void SwitchingCurrentIsExplicitAndPreservesOtherAssessments()
    {List<SemesterInput> semesters=[S("one",1,"in-progress",C("a",rows:[A("aa",100,93)])),S("two",2,"in-progress",C("b"))];var a=service.Overview(new(scale,semesters,"one",bands));var b=service.Overview(new(scale,semesters,"two",bands));Assert.Equal(3.7m,a.Potential!.Semester!.Gpa);Assert.Equal(4m,b.Potential!.Semester!.Gpa);Assert.Equal(93,semesters[0].Courses[0].Assessments![0].EarnedMarks);}
    [Fact] public void NoCurrentDoesNotGenerateProjection()=>Assert.Null(service.Overview(new(scale,[S("past",0,"completed",C(grade:"B"))],null,bands)).Potential);
    [Fact] public void CompletedSemesterCannotBeCurrent()=>Assert.Throws<InputException>(()=>Overview(S("now",1,"completed",C())));
    [Fact] public void CurrentMustFollowCompletedChronology()=>Assert.Throws<InputException>(()=>Overview(S("past",2,"completed",C("p","B")),S("now",1,"in-progress",C())));
    [Fact] public void BandChangesOnlyAffectPotentialNotRecordedHistory()
    {List<SemesterInput> semesters=[S("past",0,"completed",C("p","B")),S("now",1,"in-progress",C(rows:[A("a",100,93)]))];var first=service.Overview(new(scale,semesters,"now",bands));var second=service.Overview(new(scale,semesters,"now",[new(0,"F"),new(90,"A")]));Assert.Equal(3.7m,first.Potential!.Semester!.Gpa);Assert.Equal(4m,second.Potential!.Semester!.Gpa);Assert.Equal(first.Actual.Total,second.Actual.Total);}
    [Fact] public void MissingBandConfigurationKeepsActualResultsButWithholdsPotential()
    {var r=service.Overview(new(scale,[S("past",0,"completed",C("p","B")),S("now",1,"in-progress",C())],"now",[]));Assert.Equal(3m,r.Actual.Total.Gpa);Assert.False(r.Potential!.Valid);Assert.Null(r.Potential.Cumulative);}
    [Fact] public void InvalidBandsCannotHaveGapsOverlapsDescendingPointsOrWrongCeiling()
    {Assert.Throws<InputException>(()=>service.ValidateBands(scale,[new(20,"F"),new(90,"A")]));Assert.Throws<InputException>(()=>service.ValidateBands(scale,[new(0,"F"),new(0,"A")]));Assert.Throws<InputException>(()=>service.ValidateBands(scale,[new(0,"B"),new(50,"F"),new(90,"A")]));Assert.Throws<InputException>(()=>service.ValidateBands(scale,[new(0,"F"),new(90,"B")]));}
    [Fact] public void RecordedGradeRemainsFixedAndRequiresExplicitClearingForTracking()
    {var p=service.Course(scale,bands,C(grade:"B",rows:[A("a",100,null)]));Assert.Equal("recorded",p.Source);Assert.Equal(3m,p.Points);Assert.Null(p.MaximumScore);}
    [Fact] public void FinalizationRequiresConfirmationAndEveryGrade()
    {List<SemesterInput> semesters=[S("now",1,"in-progress",C())];Assert.Throws<InputException>(()=>service.Finalize(new(scale,semesters,"now",bands,[],true)));Assert.Throws<InputException>(()=>service.Finalize(new(scale,semesters,"now",bands,[new("c","A+")],false)));}
    [Fact] public void AllGradedFinalizationPreservesMarksAndStopsPotential()
    {List<SemesterInput> semesters=[S("now",1,"in-progress",C(rows:[A("a",100,93)]))];var finalized=service.Finalize(new(scale,semesters,"now",bands,[new("c","A-")],true));Assert.Equal("completed",finalized.Status);Assert.Equal(93,finalized.Courses[0].Assessments![0].EarnedMarks);Assert.Null(semesters[0].Courses[0].Grade);var r=service.Overview(new(scale,[finalized],null,bands));Assert.Null(r.Potential);Assert.Equal(3.7m,r.Actual.Total.Gpa);}
    [Fact] public void MissingMarksNeedExplicitOfficialGradeNotMaximumAssumption()
    {List<SemesterInput> semesters=[S("now",1,"in-progress",C(rows:[A("a",100,null)]))];var s=service.Finalize(new(scale,semesters,"now",bands,[new("c","C")],true));Assert.Equal("C",s.Courses[0].Grade);Assert.Null(s.Courses[0].Assessments![0].EarnedMarks);}
    [Fact] public void ZeroCreditCourseIsRejected()=>Assert.Throws<InputException>(()=>Overview(S("now",1,"in-progress",C(credits:0))));
}
