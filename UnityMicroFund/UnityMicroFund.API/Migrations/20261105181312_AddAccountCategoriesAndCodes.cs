using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountCategoriesAndCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "accounts",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Asset")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "accounts",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            // Non-destructive backfill: every existing account is a cash/bank resource,
            // so it starts as an Asset and receives a stable code in the 1000 range.
            migrationBuilder.Sql(
                "UPDATE `accounts` SET `Category` = 'Asset' WHERE `Category` IS NULL OR `Category` = '';");

            migrationBuilder.Sql(
                """
                UPDATE `accounts` AS a
                INNER JOIN (
                    SELECT `Id`, ROW_NUMBER() OVER (ORDER BY `Name`, `Id`) AS rn
                    FROM `accounts`
                    WHERE `Code` IS NULL
                ) AS numbered ON numbered.`Id` = a.`Id`
                SET a.`Code` = CAST(1000 + numbered.rn - 1 AS CHAR);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_accounts_Category",
                table: "accounts",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_accounts_Code",
                table: "accounts",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_accounts_Category",
                table: "accounts");

            migrationBuilder.DropIndex(
                name: "IX_accounts_Code",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "accounts");
        }
    }
}
