<# ================================================================
   FarmCeutica Commission & Payout Engine
   Input:  farmceutica_master_skus.json, channel_mix_results.json,
           subscription_mrr_analysis.json
   Output: commission_payout_analysis.json
   Models practitioner commissions, affiliate payouts, tiered
   incentive programs, and total program cost with profitability
   impact per partner tier.
   ================================================================ #>

param(
    [string]$MasterFile  = "./farmceutica_master_skus.json",
    [string]$ChannelFile = "./channel_mix_results.json",
    [string]$SubFile     = "./subscription_mrr_analysis.json",
    [string]$OutputFile  = "./commission_payout_analysis.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json
$ChannelMix = Get-Content $ChannelFile | ConvertFrom-Json
$Subs = Get-Content $SubFile | ConvertFrom-Json

# --- Partner Program Tiers ---
$PartnerTiers = @(
    @{
        Tier = "Affiliate Basic"
        Type = "Affiliate"
        CommissionPct = 0.10
        RecurringPct = 0.05      # 5% on subscription renewals
        CookieDays = 30
        MinMonthlyPayout = 25
        EstPartners = 200
        AvgMonthlyReferrals = 4
        AvgOrderValue = 95
        ConversionRate = 0.03
    },
    @{
        Tier = "Affiliate Pro"
        Type = "Affiliate"
        CommissionPct = 0.15
        RecurringPct = 0.08
        CookieDays = 60
        MinMonthlyPayout = 50
        EstPartners = 50
        AvgMonthlyReferrals = 12
        AvgOrderValue = 120
        ConversionRate = 0.05
    },
    @{
        Tier = "Influencer"
        Type = "Influencer"
        CommissionPct = 0.20
        RecurringPct = 0.00      # No recurring for influencers
        CookieDays = 14
        MinMonthlyPayout = 0
        EstPartners = 30
        AvgMonthlyReferrals = 25
        AvgOrderValue = 110
        ConversionRate = 0.04
        FlatFee = 500            # Monthly flat fee per influencer
    },
    @{
        Tier = "Practitioner Standard"
        Type = "Practitioner"
        CommissionPct = 0.20
        RecurringPct = 0.15      # Strong recurring for patient retention
        CookieDays = 90
        MinMonthlyPayout = 100
        EstPartners = 120
        AvgMonthlyReferrals = 8
        AvgOrderValue = 155
        ConversionRate = 0.12
    },
    @{
        Tier = "Practitioner Elite"
        Type = "Practitioner"
        CommissionPct = 0.25
        RecurringPct = 0.20
        CookieDays = 120
        MinMonthlyPayout = 250
        EstPartners = 25
        AvgMonthlyReferrals = 20
        AvgOrderValue = 210
        ConversionRate = 0.15
        BonusThreshold = 5000    # Monthly bonus at $5K+ in referrals
        BonusPct = 0.05
    }
)

# --- Category Commission Overrides (testing kits pay less) ---
$CategoryCommOverride = @{
    Testing = 0.50  # 50% of standard commission rate for testing
}

# --- Calculate Per-Tier Economics ---
$TierResults = @()
$totalMonthlyPayouts = [decimal]0
$totalMonthlyRevenue = [decimal]0
$totalPartners = 0

foreach ($tier in $PartnerTiers) {
    $partners = [int]$tier.EstPartners
    $referrals = [decimal]$tier.AvgMonthlyReferrals
    $aov = [decimal]$tier.AvgOrderValue
    $commRate = [decimal]$tier.CommissionPct
    $recurRate = [decimal]$tier.RecurringPct

    # Monthly first-order revenue per partner
    $monthlyRefRevenue = [math]::Round($referrals * $aov, 2)

    # Recurring revenue (assume 40% of referred customers stay subscribed)
    $subRetention = 0.40
    $avgRecurringCustomers = [math]::Round($referrals * $subRetention * 3)  # 3 months of accumulated subs
    $monthlyRecurRevenue = [math]::Round($avgRecurringCustomers * $aov * 0.85, 2)  # 85% of AOV on subscription

    # Total revenue from this partner
    $totalPartnerRevenue = $monthlyRefRevenue + $monthlyRecurRevenue

    # Commission calculations
    $firstOrderComm = [math]::Round($monthlyRefRevenue * $commRate, 2)
    $recurringComm = [math]::Round($monthlyRecurRevenue * $recurRate, 2)

    # Flat fees (influencers)
    $flatFee = if ($tier.FlatFee) { [decimal]$tier.FlatFee } else { 0 }

    # Bonus (elite practitioners)
    $bonusPay = [decimal]0
    if ($tier.BonusThreshold -and $totalPartnerRevenue -ge $tier.BonusThreshold) {
        $bonusPay = [math]::Round($totalPartnerRevenue * [decimal]$tier.BonusPct, 2)
    }

    $totalPayoutPerPartner = [math]::Round($firstOrderComm + $recurringComm + $flatFee + $bonusPay, 2)

    # Tier totals
    $tierMonthlyRevenue = [math]::Round($totalPartnerRevenue * $partners, 2)
    $tierMonthlyPayouts = [math]::Round($totalPayoutPerPartner * $partners, 2)
    $tierMonthlyNet = [math]::Round($tierMonthlyRevenue - $tierMonthlyPayouts, 2)
    $effectiveCommRate = if ($tierMonthlyRevenue -gt 0) { [math]::Round(($tierMonthlyPayouts / $tierMonthlyRevenue) * 100, 1) } else { 0 }

    # COGS for this revenue (blended avg)
    $avgCOGS = [math]::Round(($Master | ForEach-Object { [decimal]$_.COGS } | Measure-Object -Average).Average, 2)
    $totalReferrals = $referrals * $partners
    $tierMonthlyCOGS = [math]::Round($totalReferrals * $avgCOGS, 2)
    $tierGrossProfit = [math]::Round($tierMonthlyRevenue - $tierMonthlyCOGS - $tierMonthlyPayouts, 2)
    $tierGrossMargin = if ($tierMonthlyRevenue -gt 0) { [math]::Round(($tierGrossProfit / $tierMonthlyRevenue) * 100, 1) } else { 0 }

    # ROI per partner
    $roiPerPartner = if ($totalPayoutPerPartner -gt 0) {
        [math]::Round((($totalPartnerRevenue - $totalPayoutPerPartner) / $totalPayoutPerPartner) * 100, 1)
    } else { 999 }

    # Partner satisfaction indicator
    $avgPartnerEarnings = $totalPayoutPerPartner
    $satisfaction = if ($avgPartnerEarnings -ge 500) { "HIGH" }
                    elseif ($avgPartnerEarnings -ge 200) { "MODERATE" }
                    elseif ($avgPartnerEarnings -ge $tier.MinMonthlyPayout) { "LOW" }
                    else { "AT RISK" }

    $totalMonthlyPayouts += $tierMonthlyPayouts
    $totalMonthlyRevenue += $tierMonthlyRevenue
    $totalPartners += $partners

    $TierResults += [PSCustomObject]@{
        Tier = $tier.Tier
        Type = $tier.Type
        Partners = $partners
        PerPartner = [PSCustomObject]@{
            AvgMonthlyReferrals = $referrals
            AvgOrderValue = $aov
            MonthlyReferralRevenue = $monthlyRefRevenue
            MonthlyRecurringRevenue = $monthlyRecurRevenue
            TotalMonthlyRevenue = [math]::Round($totalPartnerRevenue, 2)
            FirstOrderCommission = $firstOrderComm
            RecurringCommission = $recurringComm
            FlatFee = $flatFee
            Bonus = $bonusPay
            TotalPayout = $totalPayoutPerPartner
            ROI = "$roiPerPartner%"
        }
        TierTotals = [PSCustomObject]@{
            MonthlyRevenue = $tierMonthlyRevenue
            MonthlyPayouts = $tierMonthlyPayouts
            MonthlyCOGS = $tierMonthlyCOGS
            MonthlyGrossProfit = $tierGrossProfit
            GrossMarginAfterComm = "$tierGrossMargin%"
            EffectiveCommRate = "$effectiveCommRate%"
            AnnualRevenue = [math]::Round($tierMonthlyRevenue * 12, 2)
            AnnualPayouts = [math]::Round($tierMonthlyPayouts * 12, 2)
            AnnualGrossProfit = [math]::Round($tierGrossProfit * 12, 2)
        }
        CommissionRates = [PSCustomObject]@{
            FirstOrder = "$([math]::Round($commRate * 100))%"
            Recurring = "$([math]::Round($recurRate * 100))%"
            CookieDays = $tier.CookieDays
        }
        PartnerSatisfaction = $satisfaction
    }
}

# --- Program-Level Summary ---
$totalAnnualPayouts = [math]::Round($totalMonthlyPayouts * 12, 2)
$totalAnnualRevenue = [math]::Round($totalMonthlyRevenue * 12, 2)
$programROI = if ($totalAnnualPayouts -gt 0) {
    [math]::Round((($totalAnnualRevenue - $totalAnnualPayouts) / $totalAnnualPayouts) * 100, 1)
} else { 0 }

$payoutAsRevenueShare = if ($totalAnnualRevenue -gt 0) {
    [math]::Round(($totalAnnualPayouts / $totalAnnualRevenue) * 100, 1)
} else { 0 }

# Type breakdown
$typeBreakdown = $TierResults | Group-Object Type | ForEach-Object {
    $rev = ($_.Group | ForEach-Object { [decimal]$_.TierTotals.AnnualRevenue } | Measure-Object -Sum).Sum
    $pay = ($_.Group | ForEach-Object { [decimal]$_.TierTotals.AnnualPayouts } | Measure-Object -Sum).Sum
    $gp = ($_.Group | ForEach-Object { [decimal]$_.TierTotals.AnnualGrossProfit } | Measure-Object -Sum).Sum
    $parts = ($_.Group | ForEach-Object { $_.Partners } | Measure-Object -Sum).Sum
    [PSCustomObject]@{
        Type = $_.Name; Partners = $parts
        AnnualRevenue = [math]::Round($rev, 2)
        AnnualPayouts = [math]::Round($pay, 2)
        AnnualGrossProfit = [math]::Round($gp, 2)
        EffectiveRate = if ($rev -gt 0) { "$([math]::Round(($pay / $rev) * 100, 1))%" } else { "0%" }
    }
}

# --- Payout Forecast (12 months with growth) ---
$payoutForecast = @()
$growthRate = 0.05  # 5% monthly partner program growth
for ($m = 1; $m -le 12; $m++) {
    $growth = [math]::Pow(1 + $growthRate, $m - 1)
    $mRev = [math]::Round($totalMonthlyRevenue * $growth, 2)
    $mPay = [math]::Round($totalMonthlyPayouts * $growth, 2)
    $payoutForecast += [PSCustomObject]@{
        Month = $m; Revenue = $mRev; Payouts = $mPay
        NetAfterPayouts = [math]::Round($mRev - $mPay, 2)
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    ProgramSummary = [PSCustomObject]@{
        TotalPartners = $totalPartners
        MonthlyPartnerRevenue = [math]::Round($totalMonthlyRevenue, 2)
        MonthlyPayouts = [math]::Round($totalMonthlyPayouts, 2)
        AnnualPartnerRevenue = $totalAnnualRevenue
        AnnualPayouts = $totalAnnualPayouts
        PayoutAsRevenueShare = "$payoutAsRevenueShare%"
        ProgramROI = "$programROI%"
        TypeBreakdown = $typeBreakdown
    }
    PayoutForecast12Month = $payoutForecast
    PartnerTiers = $TierResults
}

$output | ConvertTo-Json -Depth 8 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
$revFmt = '{0:N0}' -f $totalAnnualRevenue
$payFmt = '{0:N0}' -f $totalAnnualPayouts
$netFmt = '{0:N0}' -f ($totalAnnualRevenue - $totalAnnualPayouts)
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  COMMISSION & PAYOUT ENGINE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Program: $totalPartners partners across 5 tiers" -ForegroundColor White
Write-Host "  Annual Partner Revenue:  `$$revFmt" -ForegroundColor Green
Write-Host "  Annual Payouts:          `$$payFmt ($payoutAsRevenueShare% of revenue)" -ForegroundColor Yellow
Write-Host "  Net After Commissions:   `$$netFmt" -ForegroundColor Green
Write-Host "  Program ROI:             $programROI%" -ForegroundColor White
Write-Host ""
Write-Host "  --- By Partner Type ---" -ForegroundColor Cyan
foreach ($t in $typeBreakdown) {
    $tRev = '{0:N0}' -f $t.AnnualRevenue
    $tPay = '{0:N0}' -f $t.AnnualPayouts
    Write-Host "    $($t.Type.PadRight(16)) $($t.Partners) partners | Rev: `$$tRev | Pay: `$$tPay ($($t.EffectiveRate))" -ForegroundColor White
}
Write-Host ""
Write-Host "  --- By Tier ---" -ForegroundColor Cyan
foreach ($t in $TierResults) {
    $avgEarn = '{0:N0}' -f $t.PerPartner.TotalPayout
    $color = switch ($t.PartnerSatisfaction) { "HIGH" { "Green" } "MODERATE" { "Yellow" } "LOW" { "Yellow" } default { "Red" } }
    Write-Host "    $($t.Tier.PadRight(25)) `$$avgEarn/mo per partner  [$($t.PartnerSatisfaction)]" -ForegroundColor $color
}
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
