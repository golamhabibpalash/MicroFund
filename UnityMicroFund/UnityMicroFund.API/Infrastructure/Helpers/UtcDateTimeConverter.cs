using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace UnityMicroFund.API.Infrastructure.Helpers;

/// <summary>
/// Serializes every DateTime as an ISO-8601 UTC instant with an explicit "Z".
/// MariaDB datetime columns carry no timezone, so EF Core materializes them with
/// DateTimeKind.Unspecified. Without this converter System.Text.Json would emit them
/// with no offset, and the browser would parse them as local time.
/// </summary>
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => ToUtc(reader);

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(ToUtc(value).ToString("O", CultureInfo.InvariantCulture));

    internal static DateTime ToUtc(Utf8JsonReader reader)
    {
        var raw = reader.GetString();
        if (string.IsNullOrWhiteSpace(raw))
            return default;

        // AssumeUniversal only kicks in when the string carries no offset; values that
        // already end in "Z" or "+06:00" keep their own offset and are converted from it.
        return DateTime.Parse(
            raw,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
    }

    internal static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        // Read back from MariaDB. Every write path uses DateTime.UtcNow, so the value
        // already is UTC - it just lost its Kind. Converting again would shift it twice.
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };
}

/// <summary>
/// Nullable counterpart of <see cref="UtcDateTimeConverter"/>. System.Text.Json does not
/// apply a JsonConverter&lt;DateTime&gt; to DateTime?, so both must be registered.
/// </summary>
public class NullableUtcDateTimeConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType == JsonTokenType.Null ? null : UtcDateTimeConverter.ToUtc(reader);

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStringValue(UtcDateTimeConverter.ToUtc(value.Value).ToString("O", CultureInfo.InvariantCulture));
    }
}
