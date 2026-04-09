using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UnityMicroFund.API.Models;

public enum UserRole
{
    Admin,
    Manager,
    Member,
    Viewer
}
