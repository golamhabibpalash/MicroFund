using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using UnityMicroFund.API.Data;

namespace UnityMicroFund.API;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = "Server=localhost;Port=3306;Database=microfundDb;User=microfund;Password=123AsD,./;SslMode=none;Protocol=TCP;AllowUserVariables=True;UseAffectedRows=False";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));

        return new AppDbContext(optionsBuilder.Options);
    }
}
