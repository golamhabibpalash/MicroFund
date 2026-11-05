-- READ-ONLY preview of RepairMemberInvestmentShareValues.
-- Lists every holding the migration would change, with current vs. corrected values.
-- Changes nothing. Same calculation as the migration.
SELECT i.Name                    AS Investment,
       m.Name                    AS Member,
       x.SharesBought,
       x.SharePercentage         AS CurrentPct,
       x.NewSharePercentage      AS CorrectPct,
       x.ShareValue              AS CurrentValue,
       x.NewShareValue           AS CorrectValue,
       x.ShareValue - x.NewShareValue AS Overstatement
FROM (
    SELECT mi.InvestmentId, mi.MemberId, mi.SharePercentage, mi.ShareValue,
           p.Shares AS SharesBought,
           CASE WHEN COALESCE(NULLIF(i.TotalShares, 0), t.Shares, 0) > 0
                THEN ROUND(CAST(p.Shares AS DECIMAL(18,6)) * 100
                           / COALESCE(NULLIF(i.TotalShares, 0), t.Shares), 6)
                ELSE 0 END AS NewSharePercentage,
           ROUND(p.Amount, 2) AS NewShareValue
    FROM member_investments mi
    JOIN investments i ON i.Id = mi.InvestmentId
    JOIN (
        SELECT InvestmentId, MemberId,
               SUM(SharesPurchased) AS Shares, SUM(AmountPaid) AS Amount
        FROM investment_share_subscriptions
        WHERE Status <> 'Cancelled'
        GROUP BY InvestmentId, MemberId
    ) p ON p.InvestmentId = mi.InvestmentId AND p.MemberId = mi.MemberId
    JOIN (
        SELECT InvestmentId, SUM(SharesPurchased) AS Shares
        FROM investment_share_subscriptions
        WHERE Status <> 'Cancelled'
        GROUP BY InvestmentId
    ) t ON t.InvestmentId = mi.InvestmentId
) x
JOIN investments i ON i.Id = x.InvestmentId
JOIN members m ON m.Id = x.MemberId
WHERE x.ShareValue <> x.NewShareValue
   OR x.SharePercentage <> x.NewSharePercentage
ORDER BY i.Name, m.Name;
