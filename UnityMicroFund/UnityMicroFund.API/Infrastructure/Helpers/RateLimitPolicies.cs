namespace UnityMicroFund.API.Infrastructure.Helpers;

/// <summary>Rate-limiter policy names registered in Program.cs.</summary>
public static class RateLimitPolicies
{
    /// <summary>10 requests per minute per client IP, for anonymous auth endpoints.</summary>
    public const string Auth = "auth";
}
