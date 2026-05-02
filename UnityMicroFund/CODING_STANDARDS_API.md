# UnityMicroFund API - Coding Standards

## Table of Contents

1. [Project Structure](#project-structure)
2. [Naming Conventions](#naming-conventions)
3. [Code Organization](#code-organization)
4. [Controller Guidelines](#controller-guidelines)
5. [Service Guidelines](#service-guidelines)
6. [Model & DTO Guidelines](#model--dto-guidelines)
7. [Error Handling](#error-handling)
8. [Dependency Injection](#dependency-injection)
9. [Database & ORM](#database--orm)
10. [Security](#security)
11. [Logging](#logging)
12. [Testing](#testing)
13. [Documentation](#documentation)

---

## Project Structure

```
UnityMicroFund.API/
├── Areas/                    # Feature-based organization
│   ├── [FeatureName]/
│   │   ├── Controllers/
│   │   ├── Services/
│   │   ├── Models/
│   │   ├── DTOs/
│   │   └── Interfaces/
├── Data/                     # Database context and configuration
├── Infrastructure/           # Cross-cutting concerns
│   ├── Logging/
│   ├── ExceptionHandling/
│   ├── Middleware/
│   └── Email/
├── Migrations/               # EF Core migrations
└── Program.cs
```

### Rules

- Use **Feature-based** organization (group by feature, not by type)
- All feature code goes inside `Areas/` folder
- Each feature should have: Controllers, Services, Models, DTOs, Interfaces
- Core shared code goes in `Infrastructure/`

---

## Naming Conventions

### Classes & Interfaces

| Type | Convention | Example |
|------|------------|---------|
| Controller | `[Feature]Controller` | `AuthController`, `TransactionsController` |
| Service Interface | `I[Feature]Service` | `IAuthService`, `ITransactionService` |
| Service Implementation | `[Feature]Service` | `AuthService`, `TransactionService` |
| Model | PascalCase (no prefix) | `User`, `Transaction`, `Member` |
| DTO | `[Feature][Action]Dto` | `RegisterDto`, `LoginDto`, `UpdateProfileDto` |
| Enum | PascalCase | `TransactionStatus`, `UserRole` |

### Variables & Properties

| Type | Convention | Example |
|------|------------|---------|
| Private fields | `_camelCase` | `_authService`, `_dbContext` |
| Public properties | PascalCase | `UserId`, `Email`, `CreatedAt` |
| Method parameters | camelCase | `dto`, `userId`, `cancellationToken` |
| Local variables | camelCase | `result`, `user`, `existingUser` |

### Files

- Use PascalCase for file names
- Controller: `[Name]Controller.cs`
- Service: `[Name]Service.cs`
- Model: `[Name].cs`
- DTO: `[Name]Dto.cs`

---

## Code Organization

### Using Statements

```csharp
// Order: System > Microsoft > Project (alphabetically within each group)

// System
using System.Security.Claims;

// Microsoft
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// Project
using UnityMicroFund.API.Areas.Auth.DTOs;
using UnityMicroFund.API.Areas.Auth.Services;
```

### File Structure (Controller Example)

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UnityMicroFund.API.Areas.Auth.DTOs;
using UnityMicroFund.API.Areas.Auth.Services;

namespace UnityMicroFund.API.Areas.Auth.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // Actions here...
}
```

---

## Controller Guidelines

### Principles

- Controllers should be **thin** - delegate ALL business logic to services
- **NEVER write business logic in controllers** - only call service methods
- Controllers should only handle: HTTP request/response, validation, authorization, route parameters
- All data processing, database operations, and business rules go in Services
- If you find yourself writing `if/else`, loops, or database queries in a controller - move it to a service

### What Controllers Should Do

```csharp
// ✅ CORRECT - Controller only calls service
[HttpPost]
public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionDto dto)
{
    // Just call service, no logic here
    var transaction = await _transactionService.CreateTransactionAsync(dto, userId);
    return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
}

// ❌ WRONG - Controller contains business logic
[HttpPost]
public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionDto dto)
{
    // This logic should be in a service!
    if (string.IsNullOrWhiteSpace(dto.TransferTo))
        return BadRequest(new { message = "TransferTo is required" });
    
    var account = await _context.Accounts.FindAsync(dto.AccountId);
    if (account == null)
        return NotFound(new { message = "Account not found" });
    
    // ... more logic
}
```

- Use attribute routing consistently
- Return appropriate HTTP status codes
- Use proper DTOs for request/response

### Method Naming

| HTTP Verb | Method Name Pattern |
|-----------|---------------------|
| GET | `Get[Resource]` or `GetAll[Resources]` |
| POST | `Create[Resource]` |
| PUT | `Update[Resource]` |
| DELETE | `Delete[Resource]` |

### Route Conventions

```csharp
[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    // GET api/transactions
    [HttpGet]
    public async Task<IActionResult> GetAll() { }

    // GET api/transactions/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) { }

    // POST api/transactions
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTransactionDto dto) { }

    // PUT api/transactions/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTransactionDto dto) { }

    // DELETE api/transactions/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) { }
}
```

### Response Patterns

```csharp
// Success - 200 OK
return Ok(result);
return Ok(new { message = "Operation successful" });

// Created - 201 Created
return CreatedAtAction(nameof(GetById), new { id = createdId }, result);

// Bad Request - 400
return BadRequest(new { message = "Error description" });

// Unauthorized - 401
return Unauthorized();
return Unauthorized(new { message = "Invalid credentials" });

// Forbidden - 403
return Forbid();

// Not Found - 404
return NotFound();
return NotFound(new { message = "Resource not found" });
```

---

## Service Guidelines

### Core Principle
**ALL business logic belongs in Services** - Controllers should only be thin wrappers that call service methods.

### Service Interface & Implementation

```csharp
// Interface
public interface IAuthService
{
    Task<AuthResponseDto?> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto?> LoginAsync(LoginDto dto);
    Task<User?> GetUserByIdAsync(Guid userId);
}

// Implementation
public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IJwtService _jwtService;

    public AuthService(AppDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
    {
        // Business logic here
    }
}
```

### Service Registration (Program.cs)

```csharp
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
```

### Rules

- Always depend on abstractions (interfaces), not concrete implementations
- Use constructor injection
- Keep services focused on single responsibility
- Async/await for all I/O operations

---

## Model & DTO Guidelines

### Models (Database Entities)

```csharp
public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsApproved { get; set; }

    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
```

### DTOs (Data Transfer Objects)

```csharp
// Request DTOs
public record RegisterDto(
    string Email,
    string Password,
    string? FirstName,
    string? LastName
);

public record LoginDto(
    string Email,
    string Password
);

// Response DTOs
public record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    UserDto User,
    bool RequiresApproval
);
```

### Rules

- Use `record` for immutable DTOs (recommended)
- Use `class` for entities/models with navigation properties
- DTOs should only contain needed properties (no extra fields)
- Separate Request DTOs from Response DTOs
- Use nullable types (`string?`, `int?`) for optional fields

---

## Error Handling

### Global Exception Handler

Use the existing `UseGlobalExceptionHandler()` middleware in `Program.cs`.

### Service-Level Error Handling

```csharp
public async Task<User> GetUserByIdAsync(Guid id)
{
    var user = await _context.Users.FindAsync(id);
    if (user == null)
    {
        throw new NotFoundException($"User with ID {id} not found");
    }
    return user;
}
```

### Custom Exceptions

```csharp
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}

public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message) : base(message) { }
}

public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}
```

### Controller Error Responses

```csharp
try
{
    var result = await _service.GetUserByIdAsync(id);
    return Ok(result);
}
catch (NotFoundException ex)
{
    return NotFound(new { message = ex.Message });
}
catch (Exception ex)
{
    _logger.LogError(ex, "Error getting user");
    return StatusCode(500, new { message = "An error occurred" });
}
```

---

## Dependency Injection

### Constructor Injection (Preferred)

```csharp
public class TransactionService : ITransactionService
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;
    private readonly ILogger<TransactionService> _logger;

    public TransactionService(
        AppDbContext context,
        IAuditService auditService,
        ILogger<TransactionService> logger)
    {
        _context = context;
        _auditService = auditService;
        _logger = logger;
    }
}
```

### Injection Lifetimes

| Lifetime | Use Case | Example |
|----------|----------|---------|
| `Scoped` | Most services, DbContext | `AuthService`, `TransactionService` |
| `Singleton` | Configuration, static services | `AppSettings`, `StaticCache` |
| `Transient` | Lightweight, stateless services | `IEmailSender` (if stateless) |

---

## Database & ORM

### Entity Framework Core

#### DbContext

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Transaction> Transactions => Set<Transaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure relationships, keys, etc.
    }
}
```

#### Query Patterns

```csharp
// Basic query
var users = await _context.Users.ToListAsync();

// With include
var user = await _context.Users
    .Include(u => u.Transactions)
    .FirstOrDefaultAsync(u => u.Id == id);

// With projection
var userDto = await _context.Users
    .Where(u => u.IsApproved)
    .Select(u => new UserDto
    {
        Id = u.Id,
        Email = u.Email,
        FullName = $"{u.FirstName} {u.LastName}"
    })
    .ToListAsync();
```

#### Saving Changes

```csharp
await _context.SaveChangesAsync();  // With tracking
await _context.SaveChangesAsync(cancellationToken);  // With cancellation token (preferred)
```

### Rules

- Always use `async/await` with database operations
- Include cancellation token in service methods
- Use `AsNoTracking()` for read-only queries
- Use projections (`Select`) to return only needed fields
- Track changes and save at appropriate points

---

## Security

### Authentication

```csharp
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // JWT configuration
});
```

### Authorization

```csharp
// Role-based
[Authorize(Roles = "Admin")]
[Authorize(Roles = "Admin,Manager")]

// Policy-based
[Authorize(Policy = "CanManageUsers")]

// Custom
[Authorize]
public async Task<IActionResult> ProtectedEndpoint()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    // ...
}
```

### Input Validation

```csharp
public async Task<IActionResult> Create([FromBody][Required] CreateDto dto)
{
    if (!ModelState.IsValid)
    {
        return BadRequest(ModelState);
    }
    // ...
}
```

### Security Rules

- Never store plain text passwords (use BCrypt/Argon2)
- Validate all inputs on server side
- Use parameterized queries (EF Core does this by default)
- Implement rate limiting for authentication endpoints
- Use HTTPS in production

---

## Logging

### ILogger Injection

```csharp
public class AuthService : IAuthService
{
    private readonly ILogger<AuthService> _logger;

    public AuthService(ILogger<AuthService> logger)
    {
        _logger = logger;
    }
}
```

### Log Levels

```csharp
_logger.LogDebug("Debug information");
_logger.LogInformation("User {UserId} logged in successfully", userId);
_logger.LogWarning("Invalid login attempt for email {Email}", email);
_logger.LogError(ex, "Error processing transaction {TransactionId}", transactionId);
_logger.LogCritical(ex, "Critical system failure");
```

### Rules

- Use structured logging with placeholders `{Name}`
- Don't log sensitive data (passwords, tokens, personal info)
- Include relevant context in log messages
- Use appropriate log levels

---

## Testing

### Unit Tests

```csharp
[Fact]
public async Task RegisterAsync_WithValidData_ReturnsSuccess()
{
    // Arrange
    var mockContext = new Mock<AppDbContext>();
    var mockJwtService = new Mock<IJwtService>();
    var service = new AuthService(mockContext.Object, mockJwtService.Object);

    var dto = new RegisterDto("test@example.com", "password123", "John", "Doe");

    // Act
    var result = await service.RegisterAsync(dto);

    // Assert
    Assert.NotNull(result);
}
```

### Integration Tests

```csharp
[Fact]
public async Task AuthController_Login_ReturnsToken()
{
    // Use WebApplicationFactory for integration tests
}
```

### Rules

- Test service logic, not controllers
- Use mocking for external dependencies
- Aim for high coverage on business logic
- Test edge cases and error scenarios

---

## Documentation

### API Documentation

Use Swagger/OpenAPI (already configured in `Program.cs`).

### XML Comments

```csharp
/// <summary>
/// Registers a new user in the system.
/// </summary>
/// <param name="dto">Registration details including email, password, and optional name.</param>
/// <returns>Authentication response with tokens if successful.</returns>
/// <response code="200">Returns authentication tokens.</response>
/// <response code="400">Returns validation errors.</response>
[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] RegisterDto dto)
{
    // ...
}
```

---

## Summary Checklist

- [ ] Feature-based folder structure in `Areas/`
- [ ] Interfaces for all services
- [ ] Proper naming conventions (PascalCase, camelCase)
- [ ] Async/await for all I/O
- [ ] Cancellation tokens in service methods
- [ ] DTOs for request/response
- [ ] Proper HTTP status codes
- [ ] Global exception handling
- [ ] Structured logging
- [ ] Authorization attributes
- [ ] Input validation
- [ ] XML documentation for APIs

---

*Last Updated: 2026-05-02*