using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMaintenanceAccountsAndProjectCosts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "OperationalExpensePercentage",
                table: "investments",
                newName: "MaintenancePercentage");

            migrationBuilder.RenameColumn(
                name: "OperationalExpenseAmount",
                table: "investments",
                newName: "MaintenanceAmount");

            migrationBuilder.AddColumn<Guid>(
                name: "MaintenanceAccountId",
                table: "investments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "investment_maintenance_distributions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    InvestmentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    AccountId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Percentage = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    DisbursedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DisbursedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Remarks = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_maintenance_distributions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_maintenance_distributions_accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_investment_maintenance_distributions_investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "investment_project_costs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    InvestmentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Title = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Remarks = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CostDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_project_costs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_project_costs_investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_investments_MaintenanceAccountId",
                table: "investments",
                column: "MaintenanceAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_maintenance_distributions_AccountId",
                table: "investment_maintenance_distributions",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_maintenance_distributions_InvestmentId",
                table: "investment_maintenance_distributions",
                column: "InvestmentId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_project_costs_InvestmentId",
                table: "investment_project_costs",
                column: "InvestmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_investments_accounts_MaintenanceAccountId",
                table: "investments",
                column: "MaintenanceAccountId",
                principalTable: "accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_investments_accounts_MaintenanceAccountId",
                table: "investments");

            migrationBuilder.DropTable(
                name: "investment_maintenance_distributions");

            migrationBuilder.DropTable(
                name: "investment_project_costs");

            migrationBuilder.DropIndex(
                name: "IX_investments_MaintenanceAccountId",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "MaintenanceAccountId",
                table: "investments");

            migrationBuilder.RenameColumn(
                name: "MaintenancePercentage",
                table: "investments",
                newName: "OperationalExpensePercentage");

            migrationBuilder.RenameColumn(
                name: "MaintenanceAmount",
                table: "investments",
                newName: "OperationalExpenseAmount");
        }
    }
}
