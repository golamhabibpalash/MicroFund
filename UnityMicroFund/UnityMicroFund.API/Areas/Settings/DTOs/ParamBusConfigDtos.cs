namespace UnityMicroFund.API.Areas.Settings.DTOs;

public class ParamBusConfigDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Status { get; set; }
    public DateTime LastModifiedDate { get; set; }
    public string? LastModifiedBy { get; set; }
    public string? LastModifiedColumn { get; set; }
}

public class CreateParamBusConfigDto
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Status { get; set; } = true;
}

public class UpdateParamBusConfigDto
{
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Status { get; set; }
}