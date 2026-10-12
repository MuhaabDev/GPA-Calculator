using Folio.Api.Services;
using Folio.Api.Validation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<GpaService>();
builder.Services.AddSingleton<AssessmentService>();
builder.Services.AddProblemDetails();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200").AllowAnyHeader().AllowAnyMethod()));
var app = builder.Build();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var invalid = error is InputException;
    context.Response.StatusCode = invalid ? 400 : 500;
    await context.Response.WriteAsJsonAsync(new ProblemDetails
    {
        Status = context.Response.StatusCode,
        Title = invalid ? "Check your inputs" : "Calculation failed",
        Detail = invalid ? error!.Message : "An unexpected server error occurred.",
        Instance = context.Request.Path
    }, options: (System.Text.Json.JsonSerializerOptions?)null, contentType: "application/problem+json");
}));
app.UseCors();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ready" }));
app.Run();

public partial class Program { }
