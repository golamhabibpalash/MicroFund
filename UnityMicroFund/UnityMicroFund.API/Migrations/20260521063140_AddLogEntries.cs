using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLogEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "log_entries",
                columns: table => new
                {
                    LogId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    LogLevel = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    UserEmail = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Action = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Message = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Exception = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IPAddress = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UserAgent = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Module = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SubModule = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CorrelationId = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AdditionalData = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_log_entries", x => x.LogId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "ParamBusConfig",
                columns: new[] { "Id", "Description", "LastModifiedBy", "LastModifiedColumn", "LastModifiedDate", "Name", "Status", "Value" },
                values: new object[] { new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"), "Primary funding account ID for transactions", "System", "Value", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "PrimaryFundingAccount", true, "" });

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_CorrelationId",
                table: "log_entries",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_LogLevel",
                table: "log_entries",
                column: "LogLevel");

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_Module",
                table: "log_entries",
                column: "Module");

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_Timestamp",
                table: "log_entries",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_Timestamp_LogLevel",
                table: "log_entries",
                columns: new[] { "Timestamp", "LogLevel" });

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_UserId",
                table: "log_entries",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "log_entries");

            migrationBuilder.DeleteData(
                table: "ParamBusConfig",
                keyColumn: "Id",
                keyValue: new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"));
        }
    }
}
