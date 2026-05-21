using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserMemberOneToOne : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_members_users_UserId",
                table: "members");

            migrationBuilder.DropIndex(
                name: "IX_members_UserId",
                table: "members");

            migrationBuilder.CreateIndex(
                name: "IX_members_UserId",
                table: "members",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_members_users_UserId",
                table: "members",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_members_users_UserId",
                table: "members");

            migrationBuilder.DropIndex(
                name: "IX_members_UserId",
                table: "members");

            migrationBuilder.CreateIndex(
                name: "IX_members_UserId",
                table: "members",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_members_users_UserId",
                table: "members",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id");
        }
    }
}
