using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBankingFieldsToAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccountHolderName",
                table: "accounts",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "AccountNumber",
                table: "accounts",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BankEmail",
                table: "accounts",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "accounts",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BankPhone",
                table: "accounts",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BranchAddress",
                table: "accounts",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BranchName",
                table: "accounts",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Iban",
                table: "accounts",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "RoutingNumber",
                table: "accounts",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SwiftCode",
                table: "accounts",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountHolderName",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "AccountNumber",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "BankEmail",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "BankPhone",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "BranchAddress",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "BranchName",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "Iban",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "RoutingNumber",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "SwiftCode",
                table: "accounts");
        }
    }
}
