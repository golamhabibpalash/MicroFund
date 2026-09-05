using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddInvestmentParticipantsNomineeAndAgreement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GuarantorMemberId",
                table: "investments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "InvestorMemberId",
                table: "investments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "WitnessMemberId",
                table: "investments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<DateTime>(
                name: "AgreementAcceptedAt",
                table: "investment_share_subscriptions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "investment_nominees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    InvestmentPartnerId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Phone = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Nid = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Relation = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_nominees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_nominees_investment_partners_InvestmentPartnerId",
                        column: x => x.InvestmentPartnerId,
                        principalTable: "investment_partners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_investments_GuarantorMemberId",
                table: "investments",
                column: "GuarantorMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_investments_InvestorMemberId",
                table: "investments",
                column: "InvestorMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_investments_WitnessMemberId",
                table: "investments",
                column: "WitnessMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_nominees_InvestmentPartnerId",
                table: "investment_nominees",
                column: "InvestmentPartnerId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_investments_members_GuarantorMemberId",
                table: "investments",
                column: "GuarantorMemberId",
                principalTable: "members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_investments_members_InvestorMemberId",
                table: "investments",
                column: "InvestorMemberId",
                principalTable: "members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_investments_members_WitnessMemberId",
                table: "investments",
                column: "WitnessMemberId",
                principalTable: "members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_investments_members_GuarantorMemberId",
                table: "investments");

            migrationBuilder.DropForeignKey(
                name: "FK_investments_members_InvestorMemberId",
                table: "investments");

            migrationBuilder.DropForeignKey(
                name: "FK_investments_members_WitnessMemberId",
                table: "investments");

            migrationBuilder.DropTable(
                name: "investment_nominees");

            migrationBuilder.DropIndex(
                name: "IX_investments_GuarantorMemberId",
                table: "investments");

            migrationBuilder.DropIndex(
                name: "IX_investments_InvestorMemberId",
                table: "investments");

            migrationBuilder.DropIndex(
                name: "IX_investments_WitnessMemberId",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "GuarantorMemberId",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "InvestorMemberId",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "WitnessMemberId",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "AgreementAcceptedAt",
                table: "investment_share_subscriptions");
        }
    }
}
