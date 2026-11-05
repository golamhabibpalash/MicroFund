using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddProfitPayoutModes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_monthly_profit_distributions_Year_Month",
                table: "monthly_profit_distributions");

            migrationBuilder.AlterColumn<decimal>(
                name: "Rate",
                table: "monthly_profit_distributions",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(9,6)",
                oldPrecision: 9,
                oldScale: 6);

            migrationBuilder.AddColumn<decimal>(
                name: "GrossProfitAmount",
                table: "monthly_profit_distributions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "InvestmentId",
                table: "monthly_profit_distributions",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<decimal>(
                name: "MaintenanceAmount",
                table: "monthly_profit_distributions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MaintenancePercentage",
                table: "monthly_profit_distributions",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProfitDate",
                table: "monthly_profit_distributions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "monthly_profit_distributions",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Monthly")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "UndistributedRemainder",
                table: "monthly_profit_distributions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DaysInPeriod",
                table: "monthly_profit_distribution_lines",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HeldDays",
                table: "monthly_profit_distribution_lines",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SharesOwned",
                table: "monthly_profit_distribution_lines",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyProfitRate",
                table: "investments",
                type: "decimal(9,6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfitPayoutMode",
                table: "investments",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "OnCompletion")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_monthly_profit_distributions_InvestmentId",
                table: "monthly_profit_distributions",
                column: "InvestmentId");

            migrationBuilder.CreateIndex(
                name: "IX_monthly_profit_distributions_Type_Year_Month",
                table: "monthly_profit_distributions",
                columns: new[] { "Type", "Year", "Month" });

            // Before this change every Active project was paid by monthly batches. Keep
            // those projects on the monthly flow, at the rate of their latest batch, so
            // next month's calculation does not silently leave them out.
            migrationBuilder.Sql(@"
UPDATE investments i
JOIN (
    SELECT l.InvestmentId, MAX(d.Year * 100 + d.Month) AS LastPeriod
    FROM monthly_profit_distribution_lines l
    JOIN monthly_profit_distributions d ON d.Id = l.MonthlyProfitDistributionId
    GROUP BY l.InvestmentId
) latest ON latest.InvestmentId = i.Id
JOIN monthly_profit_distribution_lines l2 ON l2.InvestmentId = i.Id
JOIN monthly_profit_distributions d2 ON d2.Id = l2.MonthlyProfitDistributionId
    AND d2.Year * 100 + d2.Month = latest.LastPeriod
SET i.ProfitPayoutMode = 'Monthly',
    i.MonthlyProfitRate = l2.Rate;");

            migrationBuilder.AddForeignKey(
                name: "FK_monthly_profit_distributions_investments_InvestmentId",
                table: "monthly_profit_distributions",
                column: "InvestmentId",
                principalTable: "investments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE monthly_profit_distributions SET Rate = 0 WHERE Rate IS NULL;");

            migrationBuilder.DropForeignKey(
                name: "FK_monthly_profit_distributions_investments_InvestmentId",
                table: "monthly_profit_distributions");

            migrationBuilder.DropIndex(
                name: "IX_monthly_profit_distributions_InvestmentId",
                table: "monthly_profit_distributions");

            migrationBuilder.DropIndex(
                name: "IX_monthly_profit_distributions_Type_Year_Month",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "GrossProfitAmount",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "InvestmentId",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "MaintenanceAmount",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "MaintenancePercentage",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "ProfitDate",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "UndistributedRemainder",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "DaysInPeriod",
                table: "monthly_profit_distribution_lines");

            migrationBuilder.DropColumn(
                name: "HeldDays",
                table: "monthly_profit_distribution_lines");

            migrationBuilder.DropColumn(
                name: "SharesOwned",
                table: "monthly_profit_distribution_lines");

            migrationBuilder.DropColumn(
                name: "MonthlyProfitRate",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "ProfitPayoutMode",
                table: "investments");

            migrationBuilder.AlterColumn<decimal>(
                name: "Rate",
                table: "monthly_profit_distributions",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(9,6)",
                oldPrecision: 9,
                oldScale: 6,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_monthly_profit_distributions_Year_Month",
                table: "monthly_profit_distributions",
                columns: new[] { "Year", "Month" },
                unique: true);
        }
    }
}
