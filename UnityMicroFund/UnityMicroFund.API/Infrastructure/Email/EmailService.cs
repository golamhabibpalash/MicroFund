using MimeKit;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Configuration;

namespace UnityMicroFund.API.Infrastructure.Email;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string body);
    Task SendTransactionApprovedEmailAsync(string userEmail, string userName, string refNo, decimal amount, string accountName, string status);
    Task SendUserApprovedEmailAsync(string userEmail, string userName);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        try
        {
            var emailSettings = _configuration.GetSection("Email");
            if (!emailSettings.Exists() || string.IsNullOrEmpty(emailSettings["Host"]))
            {
                _logger.LogWarning("Email not configured. Skipping email send to {Email}", toEmail);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(
                emailSettings["FromName"] ?? "UnityMicroFund",
                emailSettings["From"] ?? "noreply@unitymicrofund.com"
            ));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;

            message.Body = new TextPart("html")
            {
                Text = body
            };

            using var client = new SmtpClient();
            
            var useSsl = bool.TryParse(emailSettings["UseSsl"], out var ssl) && ssl;
            var port = int.TryParse(emailSettings["Port"], out var p) ? p : (useSsl ? 465 : 25);

            var host = emailSettings["Host"] ?? "localhost";
            await client.ConnectAsync(
                host,
                port,
                useSsl
            );

            var username = emailSettings["Username"];
            var password = emailSettings["Password"];
            if (!string.IsNullOrEmpty(username) && !string.IsNullOrEmpty(password))
            {
                await client.AuthenticateAsync(username, password);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent successfully to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
        }
    }

    public async Task SendTransactionApprovedEmailAsync(string userEmail, string userName, string refNo, decimal amount, string accountName, string status)
    {
        var subject = status == "Approved" 
            ? "Transaction Approved - UnityMicroFund" 
            : "Transaction Rejected - UnityMicroFund";

        var statusColor = status == "Approved" ? "#27ae60" : "#e74c3c";
        var statusText = status == "Approved" ? "Approved" : "Rejected";
        var amountColor = status == "Approved" ? "#27ae60" : "#e74c3c";

        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;'>
        <h1 style='color: white; margin: 0; text-align: center;'>UnityMicroFund</h1>
    </div>
    <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;'>
        <h2 style='color: {statusColor}; margin-top: 0;'>Transaction {statusText}</h2>
        <p>Dear <strong>{userName}</strong>,</p>
        <p>Your transaction has been <strong>{statusText}</strong> by the administrator.</p>
        <div style='background: white; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='padding: 10px 0; border-bottom: 1px solid #eee;'><strong>Reference No:</strong></td>
                    <td style='padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-family: monospace;'>{refNo}</td>
                </tr>
                <tr>
                    <td style='padding: 10px 0; border-bottom: 1px solid #eee;'><strong>Amount:</strong></td>
                    <td style='padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: {amountColor};'>৳{amount:N2}</td>
                </tr>
                <tr>
                    <td style='padding: 10px 0; border-bottom: 1px solid #eee;'><strong>Account:</strong></td>
                    <td style='padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;'>{accountName}</td>
                </tr>
                <tr>
                    <td style='padding: 10px 0;'><strong>Status:</strong></td>
                    <td style='padding: 10px 0; text-align: right;'>
                        <span style='background: {statusColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px;'>{statusText}</span>
                    </td>
                </tr>
            </table>
        </div>
        <p>If you have any questions, please contact the administrator.</p>
        <p style='margin-top: 30px; color: #666; font-size: 12px;'>
            This is an automated message from UnityMicroFund. Please do not reply to this email.
        </p>
    </div>
</body>
</html>";

        await SendEmailAsync(userEmail, subject, body);
    }

    public async Task SendUserApprovedEmailAsync(string userEmail, string userName)
    {
        var subject = "Account Approved — Welcome to UnityMicroFund!";

        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;'>
        <h1 style='color: white; margin: 0; text-align: center;'>UnityMicroFund</h1>
    </div>
    <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;'>
        <h2 style='color: #27ae60; margin-top: 0;'>Your Account Has Been Approved!</h2>
        <p>Dear <strong>{userName}</strong>,</p>
        <p>We are pleased to inform you that your UnityMicroFund account has been <strong>approved</strong> by an administrator.</p>
        <p>You can now log in and access all features of the platform.</p>
        <div style='text-align: center; margin: 30px 0;'>
            <a href='https://app.unitymicrofund.com/auth/login'
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white; padding: 14px 32px; border-radius: 6px;
                      text-decoration: none; font-weight: bold; font-size: 16px;'>
                Log In Now
            </a>
        </div>
        <p>If you have any questions, feel free to contact the administrator.</p>
        <p style='margin-top: 30px; color: #666; font-size: 12px;'>
            This is an automated message from UnityMicroFund. Please do not reply to this email.
        </p>
    </div>
</body>
</html>";

        await SendEmailAsync(userEmail, subject, body);
    }
}
