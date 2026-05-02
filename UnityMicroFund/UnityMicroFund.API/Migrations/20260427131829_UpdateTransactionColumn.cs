using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTransactionColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TransferFor",
                table: "transactions",
                newName: "TransferTo");

            migrationBuilder.RenameColumn(
                name: "RefNo",
                table: "transactions",
                newName: "TransactionId");

            migrationBuilder.RenameIndex(
                name: "IX_transactions_RefNo",
                table: "transactions",
                newName: "IX_transactions_TransactionId");

            migrationBuilder.AddColumn<string>(
                name: "TransferFrom",
                table: "transactions",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TransferFrom",
                table: "transactions");

            migrationBuilder.RenameColumn(
                name: "TransferTo",
                table: "transactions",
                newName: "TransferFor");

            migrationBuilder.RenameColumn(
                name: "TransactionId",
                table: "transactions",
                newName: "RefNo");

            migrationBuilder.RenameIndex(
                name: "IX_transactions_TransactionId",
                table: "transactions",
                newName: "IX_transactions_RefNo");
        }
    }
}
