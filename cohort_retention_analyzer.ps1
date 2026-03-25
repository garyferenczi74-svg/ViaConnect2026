<# ================================================================
   FarmCeutica Customer Cohort & Retention Analyzer
   Input:  subscription_mrr_analysis.json, executive_dashboard.json
   Output: cohort_retention_analysis.json
   Models monthly cohort retention curves, revenue decay per cohort,
   new vs existing revenue split, and calculates true cohort LTV
   with reactivation and expansion revenue modeling.
   ================================================================ #>

param(
    [string]$SubFile       = "./subscription_mrr_analysis.json",
    [string]$DashboardFile = "./executive_dashboard.json",
    [string]$OutputFile    = "./cohort_retention_analysis.json"
)

$ErrorActionPreference = "Stop"

$Subs = Get-Content $SubFile | ConvertFrom-Json
$Dash = Get-Content $DashboardFile | ConvertFrom-Json

# --- Cohort Assumptions ---
$Assumptions = @{
    # Monthly new customer cohort sizes (last 12 months, most recent first)
    CohortSizes = @(650, 625, 600, 580, 560, 540, 520, 500, 480, 460, 440, 420)

    # Retention curve by month (% of original cohort still active)
    # Based on supplement industry benchmarks
    RetentionCurve = @(
        1.00,  # M0: 100% (acquisition month)
        0.62,  # M1: 62% survive first month
        0.48,  # M2: 48%
        0.40,  # M3: 40%
        0.35,  # M4: 35%
        0.31,  # M5: 31%
        0.28,  # M6: 28%
        0.26,  # M7: 26%
        0.24,  # M8: 24% - stabilization begins
        0.23,  # M9: 23%
        0.22,  # M10: 22%
        0.21,  # M11: 21%
        0.20   # M12: 20% - loyal base
    )

    # Average revenue per active customer per month
    ARPC = 95.00

    # Revenue expansion rate (existing customers buy more over time)
    ExpansionRate = 0.02  # 2% monthly revenue expansion from cross-sell/upsell

    # Reactivation rate (churned customers who come back)
    ReactivationRate = 0.03  # 3% of churned reactivate per month

    # Reactivated customer revenue multiplier (they spend less)
    ReactivationRevMultiplier = 0.70

    # CAC by acquisition channel
    CACByChannel = @{
        Organic = 0; PaidSocial = 55; PaidSearch = 42; Email = 8
        Referral = 15; Influencer = 65; Practitioner = 25
    }

    # Channel mix of new customers
    AcquisitionMix = @{
        Organic = 0.15; PaidSocial = 0.30; PaidSearch = 0.20; Email = 0.10
        Referral = 0.10; Influencer = 0.08; Practitioner = 0.07
    }
}

# --- Build Cohort Retention Matrix ---
# Rows = cohort month (0 = most recent, 11 = oldest)
# Columns = months since acquisition

$RetentionMatrix = @()
$RevenueMatrix = @()
$totalMonths = 13  # M0 through M12

for ($cohort = 0; $cohort -lt 12; $cohort++) {
    $cohortSize = $Assumptions.CohortSizes[$cohort]
    $monthsSinceAcq = $cohort  # oldest cohort = 11 months ago

    $retRow = @()
    $revRow = @()

    for ($m = 0; $m -lt $totalMonths; $m++) {
        if ($m -le $monthsSinceAcq) {
            # This month has occurred
            $retRate = [decimal]$Assumptions.RetentionCurve[[math]::Min($m, $Assumptions.RetentionCurve.Count - 1)]
            $activeCustomers = [math]::Round($cohortSize * $retRate)

            # Expansion revenue grows with tenure
            $expansionMultiplier = 1 + ($Assumptions.ExpansionRate * $m)

            # Reactivation adds back some churned customers
            $churnedTotal = $cohortSize - $activeCustomers
            $reactivated = [math]::Round($churnedTotal * $Assumptions.ReactivationRate)
            $totalActive = $activeCustomers + $reactivated

            $baseRevenue = [math]::Round($activeCustomers * $Assumptions.ARPC * $expansionMultiplier, 2)
            $reactivationRevenue = [math]::Round($reactivated * $Assumptions.ARPC * $Assumptions.ReactivationRevMultiplier, 2)
            $monthRevenue = [math]::Round($baseRevenue + $reactivationRevenue, 2)

            $retRow += [PSCustomObject]@{
                Month = $m; ActiveCustomers = $totalActive; RetentionRate = $retRate
                Revenue = $monthRevenue; Reactivated = $reactivated
            }
            $revRow += $monthRevenue
        } else {
            # Future month - project
            $retRate = [decimal]$Assumptions.RetentionCurve[[math]::Min($m, $Assumptions.RetentionCurve.Count - 1)]
            $activeCustomers = [math]::Round($cohortSize * $retRate)
            $expansionMultiplier = 1 + ($Assumptions.ExpansionRate * $m)
            $churnedTotal = $cohortSize - $activeCustomers
            $reactivated = [math]::Round($churnedTotal * $Assumptions.ReactivationRate)
            $totalActive = $activeCustomers + $reactivated
            $baseRevenue = [math]::Round($activeCustomers * $Assumptions.ARPC * $expansionMultiplier, 2)
            $reactivationRevenue = [math]::Round($reactivated * $Assumptions.ARPC * $Assumptions.ReactivationRevMultiplier, 2)
            $monthRevenue = [math]::Round($baseRevenue + $reactivationRevenue, 2)

            $retRow += [PSCustomObject]@{
                Month = $m; ActiveCustomers = $totalActive; RetentionRate = $retRate
                Revenue = $monthRevenue; Reactivated = $reactivated; Projected = $true
            }
            $revRow += $monthRevenue
        }
    }

    $cohortLabel = "Cohort M-$cohort"
    $totalCohortRevenue = ($revRow | Measure-Object -Sum).Sum
    $ltv = if ($cohortSize -gt 0) { [math]::Round($totalCohortRevenue / $cohortSize, 2) } else { 0 }

    $RetentionMatrix += [PSCustomObject]@{
        CohortIndex = $cohort
        Label = $cohortLabel
        InitialSize = $cohortSize
        MonthsSinceAcquisition = $monthsSinceAcq
        M1Retention = "$([math]::Round([decimal]$Assumptions.RetentionCurve[1] * 100))%"
        M6Retention = "$([math]::Round([decimal]$Assumptions.RetentionCurve[6] * 100))%"
        M12Retention = "$([math]::Round([decimal]$Assumptions.RetentionCurve[12] * 100))%"
        TotalRevenue = [math]::Round($totalCohortRevenue, 2)
        CohortLTV = $ltv
        MonthlyDetail = $retRow
    }
}

# --- Revenue Split: Existing vs New Customers ---
$revenueBySource = @()
$totalActiveFromExisting = 0
$totalRevenueExisting = [decimal]0

for ($m = 0; $m -lt 12; $m++) {
    $existingRev = [decimal]0
    $existingActive = 0

    # Sum revenue from all cohorts that are alive in this calendar month
    for ($c = 0; $c -lt 12; $c++) {
        $monthsSinceAcq = $c
        $targetMonth = $m  # which month of the cohort's life are we looking at
        $cohortAge = $monthsSinceAcq - ($m - 0)

        if ($c -ge $m) {
            # This cohort existed before calendar month $m
            $ageInMonth = $c - $m
            if ($ageInMonth -ge 0 -and $ageInMonth -lt $RetentionMatrix[$c].MonthlyDetail.Count) {
                $detail = $RetentionMatrix[$c].MonthlyDetail[$ageInMonth]
                $existingRev += [decimal]$detail.Revenue
                $existingActive += [int]$detail.ActiveCustomers
            }
        }
    }

    # New customer revenue for this month
    $newCohortSize = $Assumptions.CohortSizes[[math]::Min($m, $Assumptions.CohortSizes.Count - 1)]
    $newRev = [math]::Round($newCohortSize * $Assumptions.ARPC, 2)

    $totalRev = [math]::Round($existingRev + $newRev, 2)
    $existingPct = if ($totalRev -gt 0) { [math]::Round(($existingRev / $totalRev) * 100, 1) } else { 0 }

    $revenueBySource += [PSCustomObject]@{
        Month = $m + 1
        ExistingCustomerRevenue = [math]::Round($existingRev, 2)
        NewCustomerRevenue = $newRev
        TotalRevenue = $totalRev
        ExistingRevenuePct = "$existingPct%"
        ExistingActiveCustomers = $existingActive
        NewCustomers = $newCohortSize
    }
}

# --- Blended CAC Calculation ---
$blendedCAC = [decimal]0
foreach ($ch in @($Assumptions.AcquisitionMix.Keys)) {
    $mix = [decimal]$Assumptions.AcquisitionMix[$ch]
    $cac = [decimal]$Assumptions.CACByChannel[$ch]
    $blendedCAC += $mix * $cac
}
$blendedCAC = [math]::Round($blendedCAC, 2)

# --- Cohort LTV Summary ---
$avgCohortLTV = [math]::Round(($RetentionMatrix | ForEach-Object { $_.CohortLTV } | Measure-Object -Average).Average, 2)
$ltvToCACRatio = if ($blendedCAC -gt 0) { [math]::Round($avgCohortLTV / $blendedCAC, 1) } else { 999 }

# Payback month (first month where cumulative revenue > CAC)
$paybackMonth = 0
$cumRevPerCustomer = [decimal]0
for ($m = 0; $m -lt $Assumptions.RetentionCurve.Count; $m++) {
    $ret = [decimal]$Assumptions.RetentionCurve[$m]
    $cumRevPerCustomer += $ret * $Assumptions.ARPC
    if ($cumRevPerCustomer -ge $blendedCAC -and $paybackMonth -eq 0) {
        $paybackMonth = $m
    }
}

# --- CAC by Channel Analysis ---
$channelAnalysis = @()
foreach ($ch in @($Assumptions.AcquisitionMix.Keys | Sort-Object)) {
    $mix = [decimal]$Assumptions.AcquisitionMix[$ch]
    $cac = [decimal]$Assumptions.CACByChannel[$ch]
    $monthlyCustomers = [math]::Round(650 * $mix)
    $monthlySpend = [math]::Round($monthlyCustomers * $cac, 2)
    $channelLTVtoCAC = if ($cac -gt 0) { [math]::Round($avgCohortLTV / $cac, 1) } else { 999 }

    $channelAnalysis += [PSCustomObject]@{
        Channel = $ch
        MixPct = "$([math]::Round($mix * 100))%"
        CAC = $cac
        MonthlyCustomers = $monthlyCustomers
        MonthlySpend = $monthlySpend
        LTVtoCAC = $channelLTVtoCAC
        Verdict = if ($channelLTVtoCAC -ge 5) { "EXCELLENT" } elseif ($channelLTVtoCAC -ge 3) { "GOOD" } elseif ($channelLTVtoCAC -ge 1) { "MARGINAL" } else { "NEGATIVE" }
    }
}

# --- Retention Improvement Scenarios ---
$retScenarios = @()
foreach ($improvement in @(0, 5, 10, 15, 20)) {
    $improvedLTV = [decimal]0
    for ($m = 0; $m -lt $Assumptions.RetentionCurve.Count; $m++) {
        $baseRet = [decimal]$Assumptions.RetentionCurve[$m]
        $improvedRet = [math]::Min(1.0, $baseRet * (1 + $improvement / 100))
        $improvedLTV += $improvedRet * $Assumptions.ARPC * (1 + $Assumptions.ExpansionRate * $m)
    }
    $improvedLTV = [math]::Round($improvedLTV, 2)
    $ltvDelta = [math]::Round($improvedLTV - $avgCohortLTV, 2)
    $annualImpact = [math]::Round($ltvDelta * 650 * 12, 2)

    $retScenarios += [PSCustomObject]@{
        RetentionImprovement = "$improvement%"
        ProjectedLTV = $improvedLTV
        LTVDelta = $ltvDelta
        AnnualRevenueImpact = $annualImpact
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    Assumptions = [PSCustomObject]@{
        ARPC = $Assumptions.ARPC
        ExpansionRate = "$([math]::Round($Assumptions.ExpansionRate * 100))%"
        ReactivationRate = "$([math]::Round($Assumptions.ReactivationRate * 100))%"
        RetentionCurve = ($Assumptions.RetentionCurve | ForEach-Object { "$([math]::Round($_ * 100))%" })
    }
    KeyMetrics = [PSCustomObject]@{
        BlendedCAC = $blendedCAC
        AvgCohortLTV = $avgCohortLTV
        LTVtoCACRatio = $ltvToCACRatio
        CACPaybackMonth = $paybackMonth
        M1Retention = "$([math]::Round([decimal]$Assumptions.RetentionCurve[1] * 100))%"
        M6Retention = "$([math]::Round([decimal]$Assumptions.RetentionCurve[6] * 100))%"
        M12Retention = "$([math]::Round([decimal]$Assumptions.RetentionCurve[12] * 100))%"
    }
    AcquisitionChannels = $channelAnalysis
    RevenueBySource = $revenueBySource
    RetentionImprovementScenarios = $retScenarios
    CohortMatrix = $RetentionMatrix
}

$output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CUSTOMER COHORT & RETENTION ANALYZER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Key Metrics" -ForegroundColor White
Write-Host "    Blended CAC:       `$$blendedCAC" -ForegroundColor White
Write-Host "    Avg Cohort LTV:    `$$avgCohortLTV" -ForegroundColor Green
Write-Host "    LTV:CAC Ratio:     ${ltvToCACRatio}x" -ForegroundColor Green
Write-Host "    CAC Payback:       Month $paybackMonth" -ForegroundColor White
Write-Host ""
Write-Host "  Retention Curve" -ForegroundColor Cyan
Write-Host "    M1: 62% | M3: 40% | M6: 28% | M12: 20%" -ForegroundColor White
Write-Host ""
Write-Host "  --- Acquisition Channels ---" -ForegroundColor Cyan
foreach ($ch in ($channelAnalysis | Sort-Object { $_.LTVtoCAC } -Descending)) {
    $color = switch ($ch.Verdict) { "EXCELLENT" { "Green" } "GOOD" { "Green" } "MARGINAL" { "Yellow" } default { "Red" } }
    Write-Host "    $($ch.Channel.PadRight(16)) CAC: `$$($ch.CAC.ToString().PadRight(5)) LTV:CAC: $($ch.LTVtoCAC)x  [$($ch.Verdict)]" -ForegroundColor $color
}
Write-Host ""
Write-Host "  --- Retention Improvement Impact ---" -ForegroundColor Cyan
foreach ($s in $retScenarios) {
    $impFmt = '{0:N0}' -f $s.AnnualRevenueImpact
    Write-Host "    +$($s.RetentionImprovement.PadRight(5)) LTV: `$$($s.ProjectedLTV)  Annual Impact: `$$impFmt" -ForegroundColor White
}
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
