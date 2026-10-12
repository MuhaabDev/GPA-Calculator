using Microsoft.AspNetCore.Mvc;
using Folio.Api.DTOs;
using Folio.Api.Services;
namespace Folio.Api.Controllers;

[ApiController]
[Route("api/gpa")]
public sealed class GpaController(GpaService service, AssessmentService assessments) : ControllerBase
{
    [HttpPost("semester")]
    public ActionResult<GpaResult> Semester(CalculationRequest request) => service.Calculate(request.Scale, request.Courses);
    [HttpPost("cumulative")]
    public ActionResult<CumulativeResult> Cumulative(CumulativeRequest request) => service.Cumulative(request);
    [HttpPost("simulate")]
    public ActionResult<SimulationResult> Simulate(SimulationRequest request) => service.Simulate(request);
    [HttpPost("target")]
    public ActionResult<TargetResult> Target(TargetRequest request) => service.Target(request);
    [HttpPost("overview")]
    public ActionResult<OverviewResult> Overview(OverviewRequest request) => assessments.Overview(request);
    [HttpPost("finalize")]
    public ActionResult<Folio.Api.Models.SemesterInput> FinalizeSemester(FinalizeRequest request) => assessments.Finalize(request);
}
