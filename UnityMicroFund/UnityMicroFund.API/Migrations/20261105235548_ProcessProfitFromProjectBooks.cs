using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class ProcessProfitFromProjectBooks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Rate",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "DaysInPeriod",
                table: "monthly_profit_distribution_lines");

            migrationBuilder.DropColumn(
                name: "HeldDays",
                table: "monthly_profit_distribution_lines");

            migrationBuilder.DropColumn(
                name: "Rate",
                table: "monthly_profit_distribution_lines");

            migrationBuilder.DropColumn(
                name: "MonthlyProfitRate",
                table: "investments");

            migrationBuilder.RenameColumn(
                name: "ProfitDate",
                table: "monthly_profit_distributions",
                newName: "PeriodEnd");

            migrationBuilder.RenameColumn(
                name: "GrossProfitAmount",
                table: "monthly_profit_distributions",
                newName: "NetProfitAmount");

            migrationBuilder.AddColumn<decimal>(
                name: "ExpenseAmount",
                table: "monthly_profit_distributions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "IncomeAmount",
                table: "monthly_profit_distributions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "MaintenanceDistributionId",
                table: "monthly_profit_distributions",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "ProfitDistributionId",
                table: "investment_project_costs",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "ProfitDistributionId",
                table: "investment_interim_profits",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_monthly_profit_distributions_MaintenanceDistributionId",
                table: "monthly_profit_distributions",
                column: "MaintenanceDistributionId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_project_costs_ProfitDistributionId",
                table: "investment_project_costs",
                column: "ProfitDistributionId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_interim_profits_ProfitDistributionId",
                table: "investment_interim_profits",
                column: "ProfitDistributionId");

            migrationBuilder.AddForeignKey(
                name: "FK_investment_interim_profits_monthly_profit_distributions_Prof~",
                table: "investment_interim_profits",
                column: "ProfitDistributionId",
                principalTable: "monthly_profit_distributions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_investment_project_costs_monthly_profit_distributions_Profit~",
                table: "investment_project_costs",
                column: "ProfitDistributionId",
                principalTable: "monthly_profit_distributions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_monthly_profit_distributions_investment_maintenance_distribu~",
                table: "monthly_profit_distributions",
                column: "MaintenanceDistributionId",
                principalTable: "investment_maintenance_distributions",
                principalColumn: "Id");

            // Distributions created before this change have no period end: a monthly one
            // covers its whole calendar month.
            migrationBuilder.Sql(@"
UPDATE monthly_profit_distributions
SET PeriodEnd = LAST_DAY(STR_TO_DATE(CONCAT(Year, '-', Month, '-01'), '%Y-%m-%d'))
WHERE PeriodEnd IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_investment_interim_profits_monthly_profit_distributions_Prof~",
                table: "investment_interim_profits");

            migrationBuilder.DropForeignKey(
                name: "FK_investment_project_costs_monthly_profit_distributions_Profit~",
                table: "investment_project_costs");

            migrationBuilder.DropForeignKey(
                name: "FK_monthly_profit_distributions_investment_maintenance_distribu~",
                table: "monthly_profit_distributions");

            migrationBuilder.DropIndex(
                name: "IX_monthly_profit_distributions_MaintenanceDistributionId",
                table: "monthly_profit_distributions");

            migrationBuilder.DropIndex(
                name: "IX_investment_project_costs_ProfitDistributionId",
                table: "investment_project_costs");

            migrationBuilder.DropIndex(
                name: "IX_investment_interim_profits_ProfitDistributionId",
                table: "investment_interim_profits");

            migrationBuilder.DropColumn(
                name: "ExpenseAmount",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "IncomeAmount",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "MaintenanceDistributionId",
                table: "monthly_profit_distributions");

            migrationBuilder.DropColumn(
                name: "ProfitDistributionId",
                table: "investment_project_costs");

            migrationBuilder.DropColumn(
                name: "ProfitDistributionId",
                table: "investment_interim_profits");

            migrationBuilder.RenameColumn(
                name: "PeriodEnd",
                table: "monthly_profit_distributions",
                newName: "ProfitDate");

            migrationBuilder.RenameColumn(
                name: "NetProfitAmount",
                table: "monthly_profit_distributions",
                newName: "GrossProfitAmount");

            migrationBuilder.AddColumn<decimal>(
                name: "Rate",
                table: "monthly_profit_distributions",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
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

            migrationBuilder.AddColumn<decimal>(
                name: "Rate",
                table: "monthly_profit_distribution_lines",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyProfitRate",
                table: "investments",
                type: "decimal(9,6)",
                nullable: true);
        }
    }
}
