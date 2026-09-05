using System.Text;
using System.Runtime.InteropServices;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using UnityMicroFund.API.Areas.Accounts.Services;
using UnityMicroFund.API.Areas.Auth.Services;
using UnityMicroFund.API.Areas.CashOut.Services;
using UnityMicroFund.API.Areas.Chat.Hubs;
using UnityMicroFund.API.Areas.Chat.Services;
using UnityMicroFund.API.Areas.Contributions.Services;
using UnityMicroFund.API.Areas.Dashboard.Services;
using UnityMicroFund.API.Areas.Investments.Services;
using UnityMicroFund.API.Areas.Members.Services;
using UnityMicroFund.API.Areas.OCR.Services;
using UnityMicroFund.API.Areas.Settings.Services;
using UnityMicroFund.API.Areas.Transactions.Services;
using UnityMicroFund.API.Data;
using UnityMicroFund.API.Infrastructure.Email;
using UnityMicroFund.API.Infrastructure.Sms;
using UnityMicroFund.API.Areas.Tasks.Services;
using UnityMicroFund.API.Infrastructure.Configuration;
using UnityMicroFund.API.Infrastructure.ExceptionHandling;
using UnityMicroFund.API.Infrastructure.Helpers;
using UnityMicroFund.API.Infrastructure.Logging;
using UnityMicroFund.API.Infrastructure.Middleware;
using UnityMicroFund.API.Areas.Logging.CQRS;
using UnityMicroFund.API.Areas.Logging.CQRS.Commands;
using UnityMicroFund.API.Areas.Logging.CQRS.Queries;
using UnityMicroFund.API.Areas.Logging.DTOs;
using UnityMicroFund.API.Areas.Logging.Repository;
using UnityMicroFund.API.Areas.Logging.Services;

// Add Homebrew library paths for Tesseract OCR (macOS)
if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
{
    var homebrewLibPath = "/opt/homebrew/lib";
    if (Directory.Exists(homebrewLibPath))
    {
        // Use NativeLibrary to add the path for DLL resolution
        NativeLibrary.SetDllImportResolver(typeof(Program).Assembly, (libraryName, assembly, searchPath) =>
        {
            if (libraryName == "libleptonica-1.82.0" || libraryName == "libtesseract-5")
            {
                return NativeLibrary.Load(Path.Combine(homebrewLibPath, $"lib{libraryName}.dylib"));
            }
            return IntPtr.Zero;
        });
    }
}

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=localhost;Port=3306;Database=microfundDb;User=root;Password=123AsD,./";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddHttpContextAccessor();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!);
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chat"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        var origins = new List<string>
        {
            "http://localhost:4200",
            "http://localhost:3000",
            "http://127.0.0.1:4200"
        };

        var configured = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (configured?.Length > 0)
            origins.AddRange(configured);

        policy.WithOrigins(origins.ToArray())
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableUtcDateTimeConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Unity MicroFund API",
        Version = "v1",
        Description = "API for managing microfund contributions and investments"
    });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.Configure<AdminSettings>(builder.Configuration.GetSection("AdminUser"));

builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddHttpClient<IAuthService, AuthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IMemberService, MemberService>();
builder.Services.AddScoped<IContributionService, ContributionService>();
builder.Services.AddScoped<IInvestmentService, InvestmentService>();
builder.Services.AddScoped<IInvestmentSettings, InvestmentSettings>();
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<ICashOutService, CashOutService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IInvestmentLifecycleService, InvestmentLifecycleService>();
builder.Services.AddScoped<IInterimProfitService, InterimProfitService>();
builder.Services.AddScoped<IProjectCostService, ProjectCostService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<IRolesService, RolesService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IAccountLedgerService, AccountLedgerService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.AddScoped<IOcrService, OcrService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient<ISmsService, SmsService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IParamBusConfigService, ParamBusConfigService>();

// Logging CQRS
builder.Services.AddScoped<ILogRepository, LogRepository>();
builder.Services.AddScoped<ICommandHandler<CreateLogEntryCommand, Guid>, CreateLogEntryHandler>();
builder.Services.AddScoped<IQueryHandler<GetLogsQuery, PagedResult<LogEntryDto>>, GetLogsHandler>();
builder.Services.AddScoped<ILogManager, LogManager>();

// SignalR uses its own JSON protocol and does not inherit the MVC JsonOptions above.
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.Converters.Add(new UtcDateTimeConverter());
        options.PayloadSerializerOptions.Converters.Add(new NullableUtcDateTimeConverter());
    });

var app = builder.Build();

app.UseGlobalExceptionHandler();

app.UseCors("AllowAll");

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Unity MicroFund API v1");
    c.RoutePrefix = "swagger";
});

app.UseAuthentication();
app.UseAuthorization();
app.UseActivityLogging();

var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".jpeg"] = "image/jpeg";
contentTypeProvider.Mappings[".jpg"] = "image/jpeg";
contentTypeProvider.Mappings[".png"] = "image/png";
contentTypeProvider.Mappings[".svg"] = "image/svg+xml";
contentTypeProvider.Mappings[".webp"] = "image/webp";

var webDistPath = Path.Combine(builder.Environment.ContentRootPath, "..", "unitymicrofund_web", "dist", "unitymicrofund_web", "browser", "assets");
var altPath = Path.Combine(builder.Environment.ContentRootPath, "..", "..", "unitymicrofund_web", "dist", "unitymicrofund_web", "browser", "assets");
var assetsPath = Directory.Exists(webDistPath) ? webDistPath : (Directory.Exists(altPath) ? altPath : null);

if (assetsPath != null)
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(assetsPath),
        RequestPath = "/assets",
        ContentTypeProvider = contentTypeProvider,
        ServeUnknownFileTypes = false,
        DefaultContentType = "application/octet-stream"
    });
}

var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "..", "unitymicrofund_web", "src", "assets", "paymentReceipt");
if (Directory.Exists(uploadsPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
        RequestPath = "/assets/paymentReceipt"
    });

    app.Map("/uploads/receipts", appBuilder =>
    {
        appBuilder.Run(async context =>
        {
            var fileName = context.Request.Path.Value?.Replace("/uploads/receipts/", "") ?? "";
            if (!string.IsNullOrEmpty(fileName))
            {
                var filePath = Path.Combine(uploadsPath, fileName);
                if (System.IO.File.Exists(filePath))
                {
                    context.Response.ContentType = GetContentType(fileName);
                    await context.Response.SendFileAsync(filePath);
                    return;
                }
            }
            context.Response.StatusCode = 404;
        });
    });
}

var memberImagesPath = builder.Configuration["Uploads:MemberImagesPath"]
    ?? Path.Combine(builder.Environment.ContentRootPath, "..", "uploads", "member");
Directory.CreateDirectory(memberImagesPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(memberImagesPath),
    RequestPath = "/assets/member",
    ContentTypeProvider = contentTypeProvider
});

var organizationPath = builder.Configuration["Uploads:OrganizationPath"]
    ?? Path.Combine(builder.Environment.ContentRootPath, "..", "uploads", "organization");
Directory.CreateDirectory(organizationPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(organizationPath),
    RequestPath = "/assets/organization",
    ContentTypeProvider = contentTypeProvider
});

var investmentDocumentsPath = builder.Configuration["Uploads:InvestmentDocumentsPath"]
    ?? Path.Combine(builder.Environment.ContentRootPath, "..", "uploads", "investment");
Directory.CreateDirectory(investmentDocumentsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(investmentDocumentsPath),
    RequestPath = "/assets/investment",
    ContentTypeProvider = contentTypeProvider
});

static string GetContentType(string fileName)
{
    var ext = Path.GetExtension(fileName).ToLowerInvariant();
    return ext switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".pdf" => "application/pdf",
        _ => "application/octet-stream"
    };
}

app.UseDefaultFiles();

app.MapControllers();
app.MapHub<ChatHub>("/chat");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        Console.WriteLine("Database connected and schema ensured.");

        // Idempotent one-time fix: credit already-approved Fund transactions into the
        // member wallets so wallet balances reconcile with real funding.
        var wallet = scope.ServiceProvider.GetRequiredService<IWalletService>();
        await wallet.BackfillDepositsAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database connection failed: {ex.Message}");
    }
}

app.Run();
