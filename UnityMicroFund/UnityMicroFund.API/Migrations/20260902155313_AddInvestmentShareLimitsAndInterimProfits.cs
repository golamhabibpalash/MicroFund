using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddInvestmentShareLimitsAndInterimProfits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaximumSharesPerMember",
                table: "investments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinimumSharesPerMember",
                table: "investments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "investment_interim_profits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    InvestmentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ProfitDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Remarks = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_interim_profits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_interim_profits_investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_investment_interim_profits_InvestmentId",
                table: "investment_interim_profits",
                column: "InvestmentId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_interim_profits_InvestmentId_ProfitDate",
                table: "investment_interim_profits",
                columns: new[] { "InvestmentId", "ProfitDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "investment_interim_profits");

            migrationBuilder.DropColumn(
                name: "MaximumSharesPerMember",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "MinimumSharesPerMember",
                table: "investments");
        }
    }
}
