using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <summary>
    /// One-time data repair for member_investments.ShareValue / SharePercentage.
    ///
    /// Before the fix in InvestmentService.UpdateInvestmentAsync, every edit of an
    /// investment rewrote each holding's ShareValue as CurrentValue x SharePercentage,
    /// so holdings drifted away from what members actually bought. This recalculates
    /// both columns from the share purchases (the source of truth), using the same
    /// rule as InvestmentService.BuildMemberHoldings:
    ///   ShareValue      = sum(AmountPaid)      of the member's non-cancelled purchases
    ///   SharePercentage = sum(SharesPurchased) / TotalShares * 100
    ///                     (falls back to total purchased shares if TotalShares is unset)
    ///
    /// Only rows that actually differ are changed. Legacy equal-split holdings with no
    /// purchases behind them are left alone. SharesOwned, AmountInvested, purchases,
    /// wallet entries and profit distributions are not touched.
    ///
    /// Every changed row's old and new values are recorded in
    /// member_investments_repair_backup; Down() restores the old values from it.
    /// </summary>
    public partial class RepairMemberInvestmentShareValues : Migration
    {
        private const string BackupTable = "member_investments_repair_backup";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($@"
CREATE TABLE `{BackupTable}` (
    `MemberInvestmentId` char(36) NOT NULL,
    `InvestmentId`       char(36) NOT NULL,
    `MemberId`           char(36) NOT NULL,
    `OldSharePercentage` decimal(9,6)  NOT NULL,
    `OldShareValue`      decimal(18,2) NOT NULL,
    `NewSharePercentage` decimal(9,6)  NOT NULL,
    `NewShareValue`      decimal(18,2) NOT NULL,
    `RepairedAt`         datetime(6)   NOT NULL,
    PRIMARY KEY (`MemberInvestmentId`)
);");

            // Compute the correct values and record only the rows that differ.
            migrationBuilder.Sql($@"
INSERT INTO `{BackupTable}`
    (`MemberInvestmentId`, `InvestmentId`, `MemberId`,
     `OldSharePercentage`, `OldShareValue`, `NewSharePercentage`, `NewShareValue`, `RepairedAt`)
SELECT x.Id, x.InvestmentId, x.MemberId,
       x.SharePercentage, x.ShareValue, x.NewSharePercentage, x.NewShareValue, UTC_TIMESTAMP(6)
FROM (
    SELECT mi.Id, mi.InvestmentId, mi.MemberId, mi.SharePercentage, mi.ShareValue,
           CASE WHEN COALESCE(NULLIF(i.TotalShares, 0), t.Shares, 0) > 0
                THEN ROUND(CAST(p.Shares AS DECIMAL(18,6)) * 100
                           / COALESCE(NULLIF(i.TotalShares, 0), t.Shares), 6)
                ELSE 0 END AS NewSharePercentage,
           ROUND(p.Amount, 2) AS NewShareValue
    FROM `member_investments` mi
    JOIN `investments` i ON i.Id = mi.InvestmentId
    JOIN (
        SELECT InvestmentId, MemberId,
               SUM(SharesPurchased) AS Shares, SUM(AmountPaid) AS Amount
        FROM `investment_share_subscriptions`
        WHERE Status <> 'Cancelled'
        GROUP BY InvestmentId, MemberId
    ) p ON p.InvestmentId = mi.InvestmentId AND p.MemberId = mi.MemberId
    JOIN (
        SELECT InvestmentId, SUM(SharesPurchased) AS Shares
        FROM `investment_share_subscriptions`
        WHERE Status <> 'Cancelled'
        GROUP BY InvestmentId
    ) t ON t.InvestmentId = mi.InvestmentId
) x
WHERE x.ShareValue <> x.NewShareValue
   OR x.SharePercentage <> x.NewSharePercentage;");

            migrationBuilder.Sql($@"
UPDATE `member_investments` mi
JOIN `{BackupTable}` b ON b.MemberInvestmentId = mi.Id
SET mi.SharePercentage = b.NewSharePercentage,
    mi.ShareValue      = b.NewShareValue,
    mi.UpdatedAt       = b.RepairedAt;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($@"
UPDATE `member_investments` mi
JOIN `{BackupTable}` b ON b.MemberInvestmentId = mi.Id
SET mi.SharePercentage = b.OldSharePercentage,
    mi.ShareValue      = b.OldShareValue;");

            migrationBuilder.Sql($"DROP TABLE `{BackupTable}`;");
        }
    }
}
