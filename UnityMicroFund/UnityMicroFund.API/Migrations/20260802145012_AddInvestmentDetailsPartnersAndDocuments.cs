using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddInvestmentDetailsPartnersAndDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "investments",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "CertificateNumber",
                table: "investments",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "investments",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "DurationMonths",
                table: "investments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastModifiedAt",
                table: "investments",
                type: "datetime(6)",
                nullable: false,
                // Backfill existing rows with the current time rather than 0001-01-01,
                // which would render as "year 1" everywhere it is displayed.
                defaultValueSql: "CURRENT_TIMESTAMP(6)");

            migrationBuilder.AddColumn<string>(
                name: "LastModifiedBy",
                table: "investments",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "MaturityDate",
                table: "investments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferenceNumber",
                table: "investments",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "SharePrice",
                table: "investments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "investments",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                // Existing rows predate the status field; an empty string would not
                // parse back into InvestmentStatus and would throw on read.
                defaultValue: "Active")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "TotalShares",
                table: "investments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "investment_documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    InvestmentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    FileName = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FileUrl = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ContentType = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UploadedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_documents_investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "investment_partners",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    InvestmentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    MemberId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    PartnerName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Nid = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Phone1 = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Phone2 = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PresentAddress = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PermanentAddress = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NomineeName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NomineeRelationship = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NomineeContact = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_partners", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_partners_investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_investment_partners_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_investments_CertificateNumber",
                table: "investments",
                column: "CertificateNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_investments_ReferenceNumber",
                table: "investments",
                column: "ReferenceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_investment_documents_InvestmentId",
                table: "investment_documents",
                column: "InvestmentId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_partners_InvestmentId",
                table: "investment_partners",
                column: "InvestmentId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_partners_MemberId",
                table: "investment_partners",
                column: "MemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "investment_documents");

            migrationBuilder.DropTable(
                name: "investment_partners");

            migrationBuilder.DropIndex(
                name: "IX_investments_CertificateNumber",
                table: "investments");

            migrationBuilder.DropIndex(
                name: "IX_investments_ReferenceNumber",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "CertificateNumber",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "DurationMonths",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "LastModifiedAt",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "LastModifiedBy",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "MaturityDate",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "ReferenceNumber",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "SharePrice",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "TotalShares",
                table: "investments");
        }
    }
}
