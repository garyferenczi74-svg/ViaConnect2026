<# ================================================================
   FarmCeutica Portfolio Health Trend Tracker
   Input:  All toolchain JSON outputs + trend_history.json
   Output: trend_history.json (appended), trend_report.json
   Captures timestamped KPI snapshot and compares against prior
   snapshots to show MoM trends and directional indicators.
   ================================================================ #>

param(
    [string]$WorkingDir  = ".",
    [string]$HistoryFile = "./trend_history.json",
    [string]$OutputFile  = "./trend_report.json"
)

$ErrorActionPreference = "Stop"
Set-Location $WorkingDir

$SnapshotDate = Get-Date -Format "yyyy-MM-dd"
$SnapshotTime = Get-Date -Format "o"

# --- Collect Current KPIs from All Sources ---
$KPIs = @{}

# Executive Dashboard
if (Test-Path "./executive_dashboard.json") {
    $dash = Get-Content "./executive_dashboard.json" | ConvertFrom-Json
    $KPIs["AnnualRevenue"] = [decimal]$dash.ProfitAndLoss.Annual.GrossRevenue
    $KPIs["AnnualNetProfit"] = [decimal]$dash.ProfitAndLoss.Annual.NetOperatingProfit
    $KPIs["NetMarginPct"] = [decimal]$dash.ProfitAndLoss.Annual.NetMarginPct
    $KPIs["PortfolioHealthScore"] = [decimal]$dash.PortfolioScorecard.PortfolioHealthScore
    $KPIs["StarSKUs"] = [int]$dash.PortfolioScorecard.TierDistribution.Star
    $KPIs["WatchSKUs"] = [int]$dash.PortfolioScorecard.TierDistribution.Watch
    $KPIs["SunsetSKUs"] = [int]$dash.PortfolioScorecard.TierDistribution.Sunset
    $KPIs["RiskCount"] = $dash.RiskRegister.Count
    $KPIs["AvgDTCMargin"] = [decimal]$dash.PortfolioScorecard.AvgDTCMargin
    $KPIs["AvgCOGSRatio"] = [decimal]$dash.PortfolioScorecard.AvgCOGSRatio
    $KPIs["TotalSKUs"] = [int]$dash.PortfolioScorecard.TotalSKUs
}

# Forecast
if (Test-Path "./forecast_12month.json") {
    $fc = Get-Content "./forecast_12month.json" | ConvertFrom-Json
    $KPIs["ForecastAnnualRevenue"] = [decimal]$fc.AnnualSummary.TotalRevenue
    $KPIs["ForecastGrowthPct"] = [decimal]$fc.AnnualSummary.TotalGrowthPct
    $KPIs["ForecastPeakMonthRevenue"] = [decimal]$fc.AnnualSummary.PeakMonth.Revenue
}

# Subscriptions
if (Test-Path "./subscription_mrr_analysis.json") {
    $subs = Get-Content "./subscription_mrr_analysis.json" | ConvertFrom-Json
    $KPIs["CurrentMRR"] = [decimal]$subs.CurrentState.CurrentMRR
    $KPIs["CurrentARR"] = [decimal]$subs.CurrentState.CurrentARR
    $KPIs["TotalSubscribers"] = [int]$subs.CurrentState.TotalSubscriptions
    $KPIs["ActiveCustomers"] = [int]$subs.CustomerAssumptions.TotalActiveCustomers
}

# Cash Flow
if (Test-Path "./cashflow_analysis.json") {
    $cf = Get-Content "./cashflow_analysis.json" | ConvertFrom-Json
    $KPIs["EndingCash"] = [decimal]$cf.AnnualSummary.EndingCash
    $KPIs["FreeCashFlow"] = [decimal]$cf.AnnualSummary.FreeCashFlow
    $KPIs["CashConversionCycleDays"] = [decimal]($cf.WorkingCapitalMetrics.CashConversionCycle -replace ' days','')
}

# Inventory
if (Test-Path "./inventory_reorder_plan.json") {
    $inv = Get-Content "./inventory_reorder_plan.json" | ConvertFrom-Json
    $KPIs["InventoryValue"] = [decimal]$inv.PortfolioSummary.TotalAvgInventoryValue
    $KPIs["AnnualHoldingCost"] = [decimal]$inv.PortfolioSummary.TotalAnnualHoldingCost
    $urgentPOs = ($inv.SKUs | Where-Object { $_.NextPO.Urgency -eq "URGENT" }).Count
    $KPIs["UrgentReorders"] = $urgentPOs
}

# Bundles
if (Test-Path "./bundle_optimization.json") {
    $bundles = Get-Content "./bundle_optimization.json" | ConvertFrom-Json
    $KPIs["TotalBundles"] = $bundles.Bundles.Count
    $KPIs["AnnualBundleRevenue"] = ($bundles.Bundles | ForEach-Object { [decimal]$_.Projection.AnnualBundleRevenue } | Measure-Object -Sum).Sum
}

# Cohort
if (Test-Path "./cohort_retention_analysis.json") {
    $cohort = Get-Content "./cohort_retention_analysis.json" | ConvertFrom-Json
    $KPIs["CohortLTV"] = [decimal]$cohort.KeyMetrics.AvgCohortLTV
    $KPIs["LTVtoCACRatio"] = [decimal]$cohort.KeyMetrics.LTVtoCACRatio
    $KPIs["BlendedCAC"] = [decimal]$cohort.KeyMetrics.BlendedCAC
}

# Suppliers
if (Test-Path "./supplier_scorecard.json") {
    $suppliers = Get-Content "./supplier_scorecard.json" | ConvertFrom-Json
    $KPIs["SupplierHHI"] = [decimal]$suppliers.ProcurementSummary.HHI
    $KPIs["SupplierCount"] = $suppliers.Suppliers.Count
    $elevated = ($suppliers.Suppliers | Where-Object { $_.RiskTier -in @("ELEVATED","HIGH") }).Count
    $KPIs["HighRiskSuppliers"] = $elevated
}

# Integrity
if (Test-Path "./integrity_report.json") {
    $integrity = Get-Content "./integrity_report.json" | ConvertFrom-Json
    $KPIs["IntegrityPassed"] = [int]$integrity.Summary.Passed
    $KPIs["IntegrityFailed"] = [int]$integrity.Summary.Failed
    $KPIs["IntegrityTotal"] = [int]$integrity.Summary.TotalChecks
}

# --- Build Snapshot ---
$snapshot = [PSCustomObject]@{
    Date = $SnapshotDate
    Timestamp = $SnapshotTime
    KPIs = $KPIs
}

# --- Load/Append History ---
$history = @()
if (Test-Path $HistoryFile) {
    $existing = Get-Content $HistoryFile | ConvertFrom-Json
    if ($existing -is [array]) { $history = @($existing) }
}

# Check if same-day snapshot exists, replace it
$history = @($history | Where-Object { $_.Date -ne $SnapshotDate })
$history += $snapshot

# Keep last 365 days
if ($history.Count -gt 365) { $history = $history[-365..-1] }

$history | ConvertTo-Json -Depth 5 | Set-Content $HistoryFile -Encoding UTF8

# --- Calculate Trends vs Prior Snapshot ---
$trends = @()
$priorSnapshot = if ($history.Count -ge 2) { $history[$history.Count - 2] } else { $null }

# Define which KPIs to track and their "good" direction
$TrackedKPIs = @(
    @{ Key="AnnualRevenue"; Label="Annual Revenue"; Format="Currency"; GoodDirection="Up" },
    @{ Key="AnnualNetProfit"; Label="Net Profit"; Format="Currency"; GoodDirection="Up" },
    @{ Key="NetMarginPct"; Label="Net Margin"; Format="Pct"; GoodDirection="Up" },
    @{ Key="PortfolioHealthScore"; Label="Portfolio Health"; Format="Score"; GoodDirection="Up" },
    @{ Key="CurrentMRR"; Label="MRR"; Format="Currency"; GoodDirection="Up" },
    @{ Key="CurrentARR"; Label="ARR"; Format="Currency"; GoodDirection="Up" },
    @{ Key="TotalSubscribers"; Label="Subscribers"; Format="Number"; GoodDirection="Up" },
    @{ Key="ActiveCustomers"; Label="Active Customers"; Format="Number"; GoodDirection="Up" },
    @{ Key="CohortLTV"; Label="Cohort LTV"; Format="Currency"; GoodDirection="Up" },
    @{ Key="LTVtoCACRatio"; Label="LTV:CAC"; Format="Ratio"; GoodDirection="Up" },
    @{ Key="FreeCashFlow"; Label="Free Cash Flow"; Format="Currency"; GoodDirection="Up" },
    @{ Key="EndingCash"; Label="Ending Cash"; Format="Currency"; GoodDirection="Up" },
    @{ Key="StarSKUs"; Label="Star SKUs"; Format="Number"; GoodDirection="Up" },
    @{ Key="WatchSKUs"; Label="Watch SKUs"; Format="Number"; GoodDirection="Down" },
    @{ Key="SunsetSKUs"; Label="Sunset SKUs"; Format="Number"; GoodDirection="Down" },
    @{ Key="RiskCount"; Label="Active Risks"; Format="Number"; GoodDirection="Down" },
    @{ Key="UrgentReorders"; Label="Urgent Reorders"; Format="Number"; GoodDirection="Down" },
    @{ Key="AvgDTCMargin"; Label="Avg DTC Margin"; Format="Pct"; GoodDirection="Up" },
    @{ Key="AvgCOGSRatio"; Label="Avg COGS Ratio"; Format="Pct"; GoodDirection="Down" },
    @{ Key="InventoryValue"; Label="Inventory Value"; Format="Currency"; GoodDirection="Neutral" },
    @{ Key="SupplierHHI"; Label="Supplier HHI"; Format="Number"; GoodDirection="Down" },
    @{ Key="IntegrityPassed"; Label="Integrity Passed"; Format="Number"; GoodDirection="Up" },
    @{ Key="IntegrityFailed"; Label="Integrity Failed"; Format="Number"; GoodDirection="Down" },
    @{ Key="ForecastAnnualRevenue"; Label="12mo Forecast Rev"; Format="Currency"; GoodDirection="Up" },
    @{ Key="AnnualBundleRevenue"; Label="Bundle Revenue"; Format="Currency"; GoodDirection="Up" }
)

foreach ($kpi in $TrackedKPIs) {
    $current = $KPIs[$kpi.Key]
    $prior = if ($priorSnapshot) { $priorSnapshot.KPIs.$($kpi.Key) } else { $null }

    $delta = $null; $deltaPct = $null; $direction = "FLAT"; $signal = "NEUTRAL"
    if ($null -ne $current -and $null -ne $prior -and $prior -ne 0) {
        $delta = [math]::Round($current - $prior, 2)
        $deltaPct = [math]::Round(($delta / [math]::Abs($prior)) * 100, 1)
        $direction = if ($delta -gt 0) { "UP" } elseif ($delta -lt 0) { "DOWN" } else { "FLAT" }

        $goodDir = $kpi.GoodDirection
        $signal = if ($goodDir -eq "Up" -and $direction -eq "UP") { "POSITIVE" }
                  elseif ($goodDir -eq "Up" -and $direction -eq "DOWN") { "NEGATIVE" }
                  elseif ($goodDir -eq "Down" -and $direction -eq "DOWN") { "POSITIVE" }
                  elseif ($goodDir -eq "Down" -and $direction -eq "UP") { "NEGATIVE" }
                  elseif ($goodDir -eq "Neutral") { "NEUTRAL" }
                  else { "NEUTRAL" }
    }

    $trends += [PSCustomObject]@{
        KPI = $kpi.Label
        Key = $kpi.Key
        Current = $current
        Prior = $prior
        Delta = $delta
        DeltaPct = if ($deltaPct) { "$deltaPct%" } else { "-" }
        Direction = $direction
        Signal = $signal
    }
}

# --- Summary Signals ---
$positive = ($trends | Where-Object { $_.Signal -eq "POSITIVE" }).Count
$negative = ($trends | Where-Object { $_.Signal -eq "NEGATIVE" }).Count
$neutral = ($trends | Where-Object { $_.Signal -eq "NEUTRAL" }).Count
$overallTrend = if ($positive -gt $negative * 2) { "STRONG POSITIVE" }
                elseif ($positive -gt $negative) { "POSITIVE" }
                elseif ($negative -gt $positive * 2) { "STRONG NEGATIVE" }
                elseif ($negative -gt $positive) { "NEGATIVE" }
                else { "STABLE" }

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = $SnapshotTime
    SnapshotDate = $SnapshotDate
    HistoryDepth = $history.Count
    PriorSnapshotDate = if ($priorSnapshot) { $priorSnapshot.Date } else { "None" }
    OverallTrend = $overallTrend
    SignalSummary = [PSCustomObject]@{
        Positive = $positive; Negative = $negative; Neutral = $neutral
    }
    CurrentSnapshot = $KPIs
    Trends = $trends
}

$output | ConvertTo-Json -Depth 5 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PORTFOLIO HEALTH TREND TRACKER" -ForegroundColor Cyan
Write-Host "  Snapshot: $SnapshotDate" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
$trendColor = switch ($overallTrend) {
    "STRONG POSITIVE" { "Green" } "POSITIVE" { "Green" }
    "STRONG NEGATIVE" { "Red" } "NEGATIVE" { "Red" }
    default { "Yellow" }
}
Write-Host "  Overall: $overallTrend ($positive positive, $negative negative, $neutral neutral)" -ForegroundColor $trendColor
Write-Host "  History: $($history.Count) snapshots" -ForegroundColor White
Write-Host ""

Write-Host "  --- Current KPIs ---" -ForegroundColor Cyan
foreach ($t in $trends) {
    if ($null -eq $t.Current) { continue }
    $arrow = switch ($t.Direction) { "UP" { "^" } "DOWN" { "v" } default { "=" } }
    $sigColor = switch ($t.Signal) { "POSITIVE" { "Green" } "NEGATIVE" { "Red" } default { "White" } }
    $valStr = switch -Regex ($t.Key) {
        "Revenue|Profit|Cash|MRR|ARR|LTV|CAC|Inventory|Holding|Bundle" { "`$" + ("{0:N0}" -f $t.Current) }
        "Pct|Margin|Ratio|Growth" { "$($t.Current)" }
        default { "$($t.Current)" }
    }
    $deltaStr = if ($t.Delta) { " ($arrow $($t.DeltaPct))" } else { "" }
    Write-Host "    $($t.KPI.PadRight(22)) $($valStr.PadRight(16))$deltaStr" -ForegroundColor $sigColor
}
Write-Host ""
Write-Host "  History: $HistoryFile | Report: $OutputFile" -ForegroundColor Cyan
