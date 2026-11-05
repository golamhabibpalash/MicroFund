using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;

namespace UnityMicroFund.API.Infrastructure.Helpers;

/// <summary>
/// Password (and one-time code) hashing. New hashes use ASP.NET Core Identity's
/// PasswordHasher (salted PBKDF2 with a version marker). Hashes created before this
/// change were unsalted SHA-256; they still verify, and <c>needsRehash</c> tells the
/// caller to replace them with a modern hash after a successful login.
/// </summary>
public static class PasswordHashing
{
    private static readonly PasswordHasher<object> Hasher = new();

    public static string Hash(string password) => Hasher.HashPassword(null!, password);

    public static bool Verify(string password, string? storedHash) => Verify(password, storedHash, out _);

    public static bool Verify(string password, string? storedHash, out bool needsRehash)
    {
        needsRehash = false;
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(storedHash))
        {
            return false;
        }

        if (IsLegacySha256(storedHash))
        {
            var legacy = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(password)));
            var matches = CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(legacy), Encoding.UTF8.GetBytes(storedHash));
            needsRehash = matches;
            return matches;
        }

        try
        {
            var result = Hasher.VerifyHashedPassword(null!, storedHash, password);
            needsRehash = result == PasswordVerificationResult.SuccessRehashNeeded;
            return result != PasswordVerificationResult.Failed;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    /// <summary>Legacy format: base64 of a raw 32-byte SHA-256 digest (always 44 characters).</summary>
    private static bool IsLegacySha256(string storedHash)
    {
        if (storedHash.Length != 44) return false;
        Span<byte> buffer = stackalloc byte[33];
        return Convert.TryFromBase64String(storedHash, buffer, out var written) && written == 32;
    }
}
