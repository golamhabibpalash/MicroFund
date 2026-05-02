using Microsoft.EntityFrameworkCore;
using UnityMicroFund.API.Areas.Settings.DTOs;
using UnityMicroFund.API.Data;

namespace UnityMicroFund.API.Areas.Settings.Services;

public class ParamBusConfigService : IParamBusConfigService
{
    private readonly AppDbContext _context;

    public ParamBusConfigService(AppDbContext context)
    {
        _context = context;
    }

    private async Task<string> GetModifiedByDisplayName(string? lastModifiedBy, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(lastModifiedBy) || lastModifiedBy == "System")
            return "System";

        if (Guid.TryParse(lastModifiedBy, out var userId))
        {
            var user = await _context.Users.FindAsync([userId], cancellationToken);
            if (user != null)
                return user.Name ?? user.Email;
        }
        return lastModifiedBy;
    }

    public async Task<IEnumerable<ParamBusConfigDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var configs = await _context.ParamBusConfigs
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);

        var result = new List<ParamBusConfigDto>();
        foreach (var c in configs)
        {
            result.Add(new ParamBusConfigDto
            {
                Id = c.Id,
                Name = c.Name,
                Value = c.Value,
                Description = c.Description,
                Status = c.Status,
                LastModifiedDate = c.LastModifiedDate,
                LastModifiedBy = await GetModifiedByDisplayName(c.LastModifiedBy, cancellationToken),
                LastModifiedColumn = c.LastModifiedColumn
            });
        }
        return result;
    }

    public async Task<IEnumerable<ParamBusConfigDto>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var configs = await _context.ParamBusConfigs
            .Where(c => c.Status)
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);

        var result = new List<ParamBusConfigDto>();
        foreach (var c in configs)
        {
            result.Add(new ParamBusConfigDto
            {
                Id = c.Id,
                Name = c.Name,
                Value = c.Value,
                Description = c.Description,
                Status = c.Status,
                LastModifiedDate = c.LastModifiedDate,
                LastModifiedBy = await GetModifiedByDisplayName(c.LastModifiedBy, cancellationToken),
                LastModifiedColumn = c.LastModifiedColumn
            });
        }
        return result;
    }

    public async Task<ParamBusConfigDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var config = await _context.ParamBusConfigs.FindAsync([id], cancellationToken);
        if (config == null) return null;

        return new ParamBusConfigDto
        {
            Id = config.Id,
            Name = config.Name,
            Value = config.Value,
            Description = config.Description,
            Status = config.Status,
            LastModifiedDate = config.LastModifiedDate,
            LastModifiedBy = await GetModifiedByDisplayName(config.LastModifiedBy, cancellationToken),
            LastModifiedColumn = config.LastModifiedColumn
        };
    }

    public async Task<ParamBusConfigDto?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        var config = await _context.ParamBusConfigs
            .FirstOrDefaultAsync(c => c.Name == name, cancellationToken);

        if (config == null) return null;

        return new ParamBusConfigDto
        {
            Id = config.Id,
            Name = config.Name,
            Value = config.Value,
            Description = config.Description,
            Status = config.Status,
            LastModifiedDate = config.LastModifiedDate,
            LastModifiedBy = await GetModifiedByDisplayName(config.LastModifiedBy, cancellationToken),
            LastModifiedColumn = config.LastModifiedColumn
        };
    }

    public async Task<ParamBusConfigDto> CreateAsync(CreateParamBusConfigDto dto, string modifiedBy, CancellationToken cancellationToken = default)
    {
        var config = new API.Models.ParamBusConfig
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Value = dto.Value,
            Description = dto.Description,
            Status = dto.Status,
            LastModifiedDate = DateTime.UtcNow,
            LastModifiedBy = modifiedBy,
            LastModifiedColumn = "All"
        };

        _context.ParamBusConfigs.Add(config);
        await _context.SaveChangesAsync(cancellationToken);

        return new ParamBusConfigDto
        {
            Id = config.Id,
            Name = config.Name,
            Value = config.Value,
            Description = config.Description,
            Status = config.Status,
            LastModifiedDate = config.LastModifiedDate,
            LastModifiedBy = await GetModifiedByDisplayName(config.LastModifiedBy, cancellationToken),
            LastModifiedColumn = config.LastModifiedColumn
        };
    }

    public async Task<ParamBusConfigDto?> UpdateAsync(Guid id, UpdateParamBusConfigDto dto, string modifiedBy, CancellationToken cancellationToken = default)
    {
        var config = await _context.ParamBusConfigs.FindAsync([id], cancellationToken);
        if (config == null) return null;

        var changedColumns = new List<string>();

        if (config.Value != dto.Value)
        {
            changedColumns.Add("Value");
            config.Value = dto.Value;
        }

        if (config.Description != dto.Description)
        {
            changedColumns.Add("Description");
            config.Description = dto.Description;
        }

        if (config.Status != dto.Status)
        {
            changedColumns.Add("Status");
            config.Status = dto.Status;
        }

        config.LastModifiedDate = DateTime.UtcNow;
        config.LastModifiedBy = modifiedBy;
        config.LastModifiedColumn = string.Join(",", changedColumns);

        await _context.SaveChangesAsync(cancellationToken);

        return new ParamBusConfigDto
        {
            Id = config.Id,
            Name = config.Name,
            Value = config.Value,
            Description = config.Description,
            Status = config.Status,
            LastModifiedDate = config.LastModifiedDate,
            LastModifiedBy = await GetModifiedByDisplayName(config.LastModifiedBy, cancellationToken),
            LastModifiedColumn = config.LastModifiedColumn
        };
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var config = await _context.ParamBusConfigs.FindAsync([id], cancellationToken);
        if (config == null) return false;

        _context.ParamBusConfigs.Remove(config);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ToggleStatusAsync(Guid id, string modifiedBy, CancellationToken cancellationToken = default)
    {
        var config = await _context.ParamBusConfigs.FindAsync([id], cancellationToken);
        if (config == null) return false;

        config.Status = !config.Status;
        config.LastModifiedDate = DateTime.UtcNow;
        config.LastModifiedBy = modifiedBy;
        config.LastModifiedColumn = "Status";

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}