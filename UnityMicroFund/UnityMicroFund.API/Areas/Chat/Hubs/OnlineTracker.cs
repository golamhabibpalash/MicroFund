using System.Collections.Concurrent;

namespace UnityMicroFund.API.Areas.Chat.Hubs;

/// <summary>
/// In-memory store of active SignalR connections. Lives for the process lifetime.
/// One user can have multiple connections (multiple tabs) — they appear online until
/// all connections drop.
/// </summary>
public static class OnlineTracker
{
    // connectionId → userId
    private static readonly ConcurrentDictionary<string, string> _connections = new();

    public static void Connect(string connectionId, string userId)
    {
        if (!string.IsNullOrEmpty(userId))
            _connections[connectionId] = userId;
    }

    /// <returns>true when this was the user's last connection (now fully offline).</returns>
    public static bool Disconnect(string connectionId, out string userId)
    {
        if (!_connections.TryRemove(connectionId, out userId!))
            return false;

        return !_connections.Values.Contains(userId);
    }

    public static bool IsOnline(string userId)
        => _connections.Values.Any(u => u == userId);

    public static IReadOnlyList<string> OnlineUserIds
        => _connections.Values.Distinct().ToList();
}
