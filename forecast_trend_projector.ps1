<# ================================================================
   FarmCeutica 12-Month Forecast & Trend Projector
   Input:  executive_dashboard.json, channel_mix_results.json,
           bundle_optimization.json
   Output: forecast_12month.json
   Projects monthly revenue, margins, and portfolio KPIs forward
   with growth rates, seasonality curves, bundle ramp, and
   milestone tracking across all channels and categories.
   ================================================================ #>

param(
    [string]$DashboardFile  = "./executive_dashboard.json",
    [string]$ChannelMixFile = "./channel_mix_results.json",
    [string]$BundleFile     = "./bundle_optimization.json",
    [string]$OutputFile     = "./forecast_12month.json"
)

$ErrorActionPreference = "Stop"

$Dashboard = Get-Content $DashboardFile | ConvertFrom-Json
$ChannelMix = Get-Content $ChannelMixFile | ConvertFrom-Json
$Bundles = Get-Content $BundleFile | ConvertFrom-Json

# --- Growth Assumptions ---
$Growth = @{
    BaseMonthlyGrowthPct = 3.0      # 3% MoM organic growth
    DTCGrowthPct         = 4.0      # DTC grows faster (digital acquisition)
    WholesaleGrowthPct   = 2.5      # Wholesale moderate
    DistributorGrowthPct = 1.5      # Distributor slowest
    COGSInflationPct     = 0.3      # 0.3% monthly COGS inflation
    BundleRampMonths     = 4        # Months to reach full bundle volume
    NewSKULaunchMonth    = 6        # Hypothetical new SKU launch in month 6
    NewSKUMonthlyRev     = 15000    # New SKU monthly revenue estimate
}

# --- Seasonality Index (1.0 = baseline) ---
# Supplements peak in Jan (resolutions), dip in summer, recover in fall
$Seasonality = @{
    "1"  = 1.15   # January - New Year resolutions
    "2"  = 1.10   # February - momentum
    "3"  = 1.05   # March - spring health push
    "4"  = 1.00   # April - baseline
    "5"  = 0.95   # May - summer slowdown begins
    "6"  = 0.90   # June - summer dip
    "7"  = 0.88   # July - lowest
    "8"  = 0.92   # August - back-to-school
    "9"  = 1.00   # September - fall recovery
    "10" = 1.05   # October - immune season
    "11" = 1.08   # November - holiday gifting
    "12" = 1.12   # December - year-end stocking
}

# --- Base Month Data from Dashboard ---
$basePnL = $Dashboard.ProfitAndLoss.Monthly
$baseMonthlyRev = [decimal]$basePnL.IndividualSKURevenue
$baseBundleRev = [decimal]$basePnL.BundleRevenue
$baseCOGS = [decimal]$basePnL.COGS
$baseVarCosts = [decimal]$basePnL.VariableCosts
$baseNetProfit = [decimal]$basePnL.NetOperatingProfit

# Channel breakdown from active scenario
$activeScenario = $ChannelMix.Scenarios | Where-Object { $_.Scenario -eq $Dashboard.ActiveScenario }
$baseDTCRev = [decimal]$activeScenario.ChannelSummary.DTC.Revenue
$baseWSRev = [decimal]$activeScenario.ChannelSummary.Wholesale.Revenue
$baseDistRev = [decimal]$activeScenario.ChannelSummary.Distributor.Revenue

# Category breakdown
$baseCatRevenue = @{}
foreach ($cat in $activeScenario.CategorySummary) {
    $baseCatRevenue[$cat.Category] = [decimal]$cat.Revenue
}

# Bundle data
$totalBundleMonthlyTarget = ($Bundles.Bundles | ForEach-Object { [decimal]$_.Projection.MonthlyRevenue } | Measure-Object -Sum).Sum
$totalBundleMonthlyGross = ($Bundles.Bundles | ForEach-Object { [decimal]$_.Projection.MonthlyGrossProfit } | Measure-Object -Sum).Sum
$bundleGrossMarginPct = if ($totalBundleMonthlyTarget -gt 0) { $totalBundleMonthlyGross / $totalBundleMonthlyTarget } else { 0.80 }

# --- Determine starting month ---
$startDate = Get-Date
$startMonth = $startDate.Month
$startYear = $startDate.Year

# --- Project 12 Months ---
$MonthlyForecast = @()
$cumulativeRev = [decimal]0
$cumulativeNet = [decimal]0
$milestones = @()

for ($m = 1; $m -le 12; $m++) {
    $calMonth = (($startMonth + $m - 2) % 12) + 1
    $calYear = $startYear + [math]::Floor(($startMonth + $m - 2) / 12)
    $monthLabel = (Get-Date -Year $calYear -Month $calMonth -Day 1).ToString("MMM yyyy")

    $seasonIdx = [decimal]$Seasonality["$calMonth"]
    $growthMultiplier = [math]::Pow(1 + $Growth.BaseMonthlyGrowthPct / 100, $m - 1)

    # Channel-specific growth
    $dtcGrowth = [math]::Pow(1 + $Growth.DTCGrowthPct / 100, $m - 1)
    $wsGrowth = [math]::Pow(1 + $Growth.WholesaleGrowthPct / 100, $m - 1)
    $distGrowth = [math]::Pow(1 + $Growth.DistributorGrowthPct / 100, $m - 1)

    $dtcRev = [math]::Round($baseDTCRev * $dtcGrowth * $seasonIdx, 2)
    $wsRev = [math]::Round($baseWSRev * $wsGrowth * $seasonIdx, 2)
    $distRev = [math]::Round($baseDistRev * $distGrowth * $seasonIdx, 2)
    $skuRevenue = [math]::Round($dtcRev + $wsRev + $distRev, 2)

    # Bundle ramp (linear ramp over N months to full volume)
    $bundleRampPct = [math]::Min(1.0, $m / $Growth.BundleRampMonths)
    $bundleRev = [math]::Round($totalBundleMonthlyTarget * $bundleRampPct * $seasonIdx, 2)
    $bundleGross = [math]::Round($bundleRev * $bundleGrossMarginPct, 2)

    # New SKU launch
    $newSKURev = [decimal]0
    if ($m -ge $Growth.NewSKULaunchMonth) {
        $monthsSinceLaunch = $m - $Growth.NewSKULaunchMonth + 1
        $launchRamp = [math]::Min(1.0, $monthsSinceLaunch / 3)  # 3-month ramp
        $newSKURev = [math]::Round($Growth.NewSKUMonthlyRev * $launchRamp * $seasonIdx, 2)
    }

    $totalRevenue = [math]::Round($skuRevenue + $bundleRev + $newSKURev, 2)

    # COGS with inflation
    $cogsInflation = [math]::Pow(1 + $Growth.COGSInflationPct / 100, $m - 1)
    $cogs = [math]::Round($baseCOGS * $growthMultiplier * $seasonIdx * $cogsInflation, 2)

    # Variable costs scale with revenue
    $varCostRatio = if ($baseMonthlyRev -gt 0) { $baseVarCosts / $baseMonthlyRev } else { 0.30 }
    $varCosts = [math]::Round($skuRevenue * $varCostRatio, 2)

    $grossProfit = [math]::Round($totalRevenue - $cogs, 2)
    $netProfit = [math]::Round($grossProfit - $varCosts + $bundleGross, 2)
    $netMarginPct = if ($totalRevenue -gt 0) { [math]::Round(($netProfit / $totalRevenue) * 100, 1) } else { 0 }

    # Category projections
    $catProjections = @()
    foreach ($cat in $baseCatRevenue.Keys) {
        $catRev = [math]::Round($baseCatRevenue[$cat] * $growthMultiplier * $seasonIdx, 2)
        $catProjections += [PSCustomObject]@{ Category = $cat; Revenue = $catRev }
    }

    $cumulativeRev += $totalRevenue
    $cumulativeNet += $netProfit

    # Milestone detection
    if ($cumulativeRev -ge 5000000 -and ($cumulativeRev - $totalRevenue) -lt 5000000) {
        $milestones += [PSCustomObject]@{ Month = $m; Label = $monthLabel; Milestone = 'Cumulative revenue passes $5M' }
    }
    if ($cumulativeRev -ge 10000000 -and ($cumulativeRev - $totalRevenue) -lt 10000000) {
        $milestones += [PSCustomObject]@{ Month = $m; Label = $monthLabel; Milestone = 'Cumulative revenue passes $10M' }
    }
    if ($cumulativeRev -ge 20000000 -and ($cumulativeRev - $totalRevenue) -lt 20000000) {
        $milestones += [PSCustomObject]@{ Month = $m; Label = $monthLabel; Milestone = 'Cumulative revenue passes $20M' }
    }
    if ($m -eq $Growth.BundleRampMonths) {
        $milestones += [PSCustomObject]@{ Month = $m; Label = $monthLabel; Milestone = "Bundle portfolio at full volume" }
    }
    if ($m -eq $Growth.NewSKULaunchMonth) {
        $milestones += [PSCustomObject]@{ Month = $m; Label = $monthLabel; Milestone = "New SKU launch" }
    }

    $MonthlyForecast += [PSCustomObject]@{
        Month = $m
        Label = $monthLabel
        CalendarMonth = $calMonth
        SeasonalityIndex = $seasonIdx
        Revenue = [PSCustomObject]@{
            Total = $totalRevenue
            IndividualSKUs = $skuRevenue
            Bundles = $bundleRev
            NewSKUs = $newSKURev
        }
        Channels = [PSCustomObject]@{
            DTC = $dtcRev
            Wholesale = $wsRev
            Distributor = $distRev
        }
        Costs = [PSCustomObject]@{
            COGS = $cogs
            VariableCosts = $varCosts
        }
        GrossProfit = $grossProfit
        NetProfit = $netProfit
        NetMarginPct = $netMarginPct
        CumulativeRevenue = [math]::Round($cumulativeRev, 2)
        CumulativeNetProfit = [math]::Round($cumulativeNet, 2)
        Categories = $catProjections
    }
}

# --- Annual Totals ---
$annualRevenue = [math]::Round($cumulativeRev, 2)
$annualNet = [math]::Round($cumulativeNet, 2)
$annualMargin = [math]::Round(($annualNet / $annualRevenue) * 100, 1)

$month1Rev = $MonthlyForecast[0].Revenue.Total
$month12Rev = $MonthlyForecast[11].Revenue.Total
$totalGrowthPct = [math]::Round((($month12Rev - $month1Rev) / $month1Rev) * 100, 1)

$peakMonth = $MonthlyForecast | Sort-Object { $_.Revenue.Total } -Descending | Select-Object -First 1
$troughMonth = $MonthlyForecast | Sort-Object { $_.Revenue.Total } | Select-Object -First 1

# --- Quarterly Rollups ---
$quarters = @()
for ($q = 0; $q -lt 4; $q++) {
    $qMonths = $MonthlyForecast | Select-Object -Skip ($q * 3) -First 3
    $qRev = ($qMonths | ForEach-Object { $_.Revenue.Total } | Measure-Object -Sum).Sum
    $qNet = ($qMonths | ForEach-Object { $_.NetProfit } | Measure-Object -Sum).Sum
    $qMargin = if ($qRev -gt 0) { [math]::Round(($qNet / $qRev) * 100, 1) } else { 0 }
    $quarters += [PSCustomObject]@{
        Quarter = "Q$($q + 1)"
        Months = ($qMonths | ForEach-Object { $_.Label }) -join ", "
        Revenue = [math]::Round($qRev, 2)
        NetProfit = [math]::Round($qNet, 2)
        NetMarginPct = $qMargin
    }
}

# --- Sensitivity Analysis (what-if on growth rate) ---
$sensitivity = @()
foreach ($rate in @(0, 1.5, 3.0, 5.0, 7.0)) {
    $sensRev = [decimal]0
    for ($m = 1; $m -le 12; $m++) {
        $calMonth = (($startMonth + $m - 2) % 12) + 1
        $si = [decimal]$Seasonality["$calMonth"]
        $gm = [math]::Pow(1 + $rate / 100, $m - 1)
        $sensRev += $baseMonthlyRev * $gm * $si
    }
    $sensitivity += [PSCustomObject]@{
        GrowthRate = "$rate%"
        AnnualRevenue = [math]::Round($sensRev, 2)
        VsBaseline = if ($rate -eq 3.0) { "BASELINE" } else {
            $baselineRev = ($sensitivity | Where-Object { $_.GrowthRate -eq "3%" }).AnnualRevenue
            if ($baselineRev) { "$([math]::Round(($sensRev - $baselineRev) / $baselineRev * 100, 1))%" } else { "-" }
        }
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    ForecastPeriod = "$($MonthlyForecast[0].Label) - $($MonthlyForecast[11].Label)"
    GrowthAssumptions = $Growth
    SeasonalityIndex = $Seasonality
    AnnualSummary = [PSCustomObject]@{
        TotalRevenue = $annualRevenue
        TotalNetProfit = $annualNet
        NetMarginPct = $annualMargin
        Month1Revenue = $month1Rev
        Month12Revenue = $month12Rev
        TotalGrowthPct = $totalGrowthPct
        PeakMonth = [PSCustomObject]@{ Label = $peakMonth.Label; Revenue = $peakMonth.Revenue.Total }
        TroughMonth = [PSCustomObject]@{ Label = $troughMonth.Label; Revenue = $troughMonth.Revenue.Total }
    }
    QuarterlyRollup = $quarters
    SensitivityAnalysis = $sensitivity
    Milestones = $milestones
    MonthlyForecast = $MonthlyForecast
}

$output | ConvertTo-Json -Depth 12 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
$annRevFmt = '{0:N0}' -f $annualRevenue
$annNetFmt = '{0:N0}' -f $annualNet
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  12-MONTH FORECAST" -ForegroundColor Cyan
Write-Host "  $($MonthlyForecast[0].Label) - $($MonthlyForecast[11].Label)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Annual Revenue:   `$$annRevFmt" -ForegroundColor Green
Write-Host "  Annual Net:       `$$annNetFmt ($annualMargin%)" -ForegroundColor Green
Write-Host "  M1->M12 Growth:   $totalGrowthPct%" -ForegroundColor White
Write-Host "  Peak:  $($peakMonth.Label) (`$$("{0:N0}" -f $peakMonth.Revenue.Total))" -ForegroundColor White
Write-Host "  Trough: $($troughMonth.Label) (`$$("{0:N0}" -f $troughMonth.Revenue.Total))" -ForegroundColor White
Write-Host ""
Write-Host "  --- Quarterly ---" -ForegroundColor Cyan
foreach ($q in $quarters) {
    $qRevFmt = '{0:N0}' -f $q.Revenue
    Write-Host "  $($q.Quarter): `$$qRevFmt ($($q.NetMarginPct)% net)" -ForegroundColor White
}
Write-Host ""
Write-Host "  Milestones: $($milestones.Count) projected" -ForegroundColor Yellow
foreach ($ms in $milestones) { Write-Host "    M$($ms.Month) ($($ms.Label)): $($ms.Milestone)" -ForegroundColor White }
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
