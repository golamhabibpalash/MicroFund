using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddInvestmentWalletSubscriptionsAndProfit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "SharePercentage",
                table: "member_investments",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2);

            migrationBuilder.AddColumn<decimal>(
                name: "AmountInvested",
                table: "member_investments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "SharesOwned",
                table: "member_investments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "member_investments",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "ActualGrossProfit",
                table: "investments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClosingNotes",
                table: "investments",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletionDate",
                table: "investments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NetProfit",
                table: "investments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OperationalExpenseAmount",
                table: "investments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OperationalExpensePercentage",
                table: "investments",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TargetGrossProfit",
                table: "investments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UndistributedRemainder",
                table: "investments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "investment_profit_distributions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    InvestmentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    MemberId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SharesOwned = table.Column<int>(type: "int", nullable: false),
                    OwnershipPercentage = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: false),
                    PrincipalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ProfitAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalPayable = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DistributedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    DisbursedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DisbursedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_profit_distributions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_profit_distributions_investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_investment_profit_distributions_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "investment_share_subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    InvestmentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    MemberId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SharesPurchased = table.Column<int>(type: "int", nullable: false),
                    SharePriceAtPurchase = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PurchasedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_share_subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_share_subscriptions_investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_investment_share_subscriptions_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "investment_wallet_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    MemberId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EntryType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TransactionId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    InvestmentId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    ShareSubscriptionId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    Description = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_wallet_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_investment_wallet_entries_investments_InvestmentId",
                        column: x => x.InvestmentId,
                        principalTable: "investments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_investment_wallet_entries_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_investment_wallet_entries_transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_investment_profit_distributions_InvestmentId_MemberId",
                table: "investment_profit_distributions",
                columns: new[] { "InvestmentId", "MemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_investment_profit_distributions_MemberId",
                table: "investment_profit_distributions",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_share_subscriptions_InvestmentId_MemberId",
                table: "investment_share_subscriptions",
                columns: new[] { "InvestmentId", "MemberId" });

            migrationBuilder.CreateIndex(
                name: "IX_investment_share_subscriptions_MemberId",
                table: "investment_share_subscriptions",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_wallet_entries_InvestmentId",
                table: "investment_wallet_entries",
                column: "InvestmentId");

            migrationBuilder.CreateIndex(
                name: "IX_investment_wallet_entries_MemberId_CreatedAt",
                table: "investment_wallet_entries",
                columns: new[] { "MemberId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_investment_wallet_entries_TransactionId",
                table: "investment_wallet_entries",
                column: "TransactionId",
                unique: true);

            // --- Backfill: seed wallets from money already collected -----------------
            // Every approved Fund transaction becomes an opening Deposit entry, so
            // members start with the balance they have actually paid in and can
            // subscribe immediately. The unique index on TransactionId makes this
            // safe to re-run: a second attempt would violate it rather than
            // double-credit, and the NOT EXISTS guard keeps it silent.
            migrationBuilder.Sql(@"
                INSERT INTO investment_wallet_entries
                    (Id, MemberId, EntryType, Amount, TransactionId, Description, CreatedBy, CreatedAt)
                SELECT
                    UUID(),
                    mtm.MemberId,
                    'Deposit',
                    t.Amount,
                    t.Id,
                    CONCAT('Opening balance from transaction ', COALESCE(t.TransactionId, '')),
                    'system-migration',
                    COALESCE(t.TransactionDate, t.CreatedAt)
                FROM transactions t
                JOIN member_transaction_map mtm ON mtm.TransactionId = t.Id
                WHERE t.Status = 'Fund'
                  AND t.ApprovalStatus = 'Approved'
                  AND NOT EXISTS (
                      SELECT 1 FROM investment_wallet_entries w WHERE w.TransactionId = t.Id
                  );
            ");

            // Projects predating the lifecycle rules cannot satisfy the 100%-subscription
            // gate (they have no subscriptions at all), so park them in Draft rather than
            // leaving them in a state they could never legitimately have reached.
            migrationBuilder.Sql(@"
                UPDATE investments
                SET Status = 'Draft'
                WHERE Status NOT IN ('Draft','OpenForSubscription','FullySubscribed','Active',
                                     'Completed','ProfitDistributed','Closed','Cancelled')
                   OR Status = 'Active';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "investment_profit_distributions");

            migrationBuilder.DropTable(
                name: "investment_share_subscriptions");

            migrationBuilder.DropTable(
                name: "investment_wallet_entries");

            migrationBuilder.DropColumn(
                name: "AmountInvested",
                table: "member_investments");

            migrationBuilder.DropColumn(
                name: "SharesOwned",
                table: "member_investments");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "member_investments");

            migrationBuilder.DropColumn(
                name: "ActualGrossProfit",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "ClosingNotes",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "CompletionDate",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "NetProfit",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "OperationalExpenseAmount",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "OperationalExpensePercentage",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "TargetGrossProfit",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "UndistributedRemainder",
                table: "investments");

            migrationBuilder.AlterColumn<decimal>(
                name: "SharePercentage",
                table: "member_investments",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(9,6)",
                oldPrecision: 9,
                oldScale: 6);
        }
    }
}
