using UnityMicroFund.API.Areas.Settings.DTOs;

namespace UnityMicroFund.API.Areas.Settings.Services;

public interface IParamBusConfigService
{
    Task<IEnumerable<ParamBusConfigDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<ParamBusConfigDto>> GetActiveAsync(CancellationToken cancellationToken = default);
    Task<ParamBusConfigDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ParamBusConfigDto?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<ParamBusConfigDto> CreateAsync(CreateParamBusConfigDto dto, string modifiedBy, CancellationToken cancellationToken = default);
    Task<ParamBusConfigDto> SetValueByNameAsync(string name, string value, string? description, string modifiedBy, CancellationToken cancellationToken = default);
    Task<ParamBusConfigDto?> UpdateAsync(Guid id, UpdateParamBusConfigDto dto, string modifiedBy, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ToggleStatusAsync(Guid id, string modifiedBy, CancellationToken cancellationToken = default);
}