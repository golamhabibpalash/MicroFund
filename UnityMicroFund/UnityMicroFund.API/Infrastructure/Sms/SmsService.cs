using System.Net.Http.Json;

namespace UnityMicroFund.API.Infrastructure.Sms;

public interface ISmsService
{
    bool IsConfigured { get; }
    Task<bool> SendSmsAsync(string phone, string message, CancellationToken cancellationToken = default);
}

public class SmsService : ISmsService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmsService> _logger;

    public SmsService(HttpClient httpClient, IConfiguration configuration, ILogger<SmsService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrEmpty(_configuration["Sms:ApiKey"]);

    public async Task<bool> SendSmsAsync(string phone, string message, CancellationToken cancellationToken = default)
    {
        var sms = _configuration.GetSection("Sms");
        var apiKey = sms["ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("SMS not configured. Skipping send to {Phone}", phone);
            return false;
        }

        var apiUrl = sms["ApiUrl"] ?? "https://app.seasms.com/api/v3";
        var senderId = sms["SenderId"] ?? "UnityMF";

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{apiUrl.TrimEnd('/')}/sms/send")
            {
                Content = JsonContent.Create(new
                {
                    recipient = FormatBangladeshNumber(phone),
                    sender_id = senderId,
                    type = "plain",
                    message
                })
            };
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("SMS send failed with status {Status} for {Phone}", response.StatusCode, phone);
                return false;
            }

            _logger.LogInformation("SMS sent successfully to {Phone}", phone);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SMS to {Phone}", phone);
            return false;
        }
    }

    private static string FormatBangladeshNumber(string phone)
    {
        var number = new string(phone.Where(char.IsDigit).ToArray());

        if (number.StartsWith("880"))
        {
            return number;
        }
        if (number.StartsWith("0"))
        {
            number = number[1..];
        }
        return "880" + number;
    }
}
