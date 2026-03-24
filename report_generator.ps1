<# ================================================================
   FarmCeutica Executive HTML Report Generator
   Input:  All toolchain JSON outputs
   Output: farmceutica_report.html
   Renders a self-contained, print-ready executive report with
   inline CSS bar charts, KPI cards, and data tables.
   ================================================================ #>

param(
    [string]$DashboardFile  = "./executive_dashboard.json",
    [string]$RationalFile   = "./sku_rationalization.json",
    [string]$BundleFile     = "./bundle_optimization.json",
    [string]$ForecastFile   = "./forecast_12month.json",
    [string]$UnitEconFile   = "./unit_economics.json",
    [string]$InventoryFile  = "./inventory_reorder_plan.json",
    [string]$RunLogFile     = "./toolchain_run_log.json",
    [string]$OutputFile     = "./farmceutica_report.html"
)

$ErrorActionPreference = "Stop"

$Dash = Get-Content $DashboardFile | ConvertFrom-Json
$Rat = Get-Content $RationalFile | ConvertFrom-Json
$Bundles = Get-Content $BundleFile | ConvertFrom-Json
$Forecast = Get-Content $ForecastFile | ConvertFrom-Json
$UnitEcon = Get-Content $UnitEconFile | ConvertFrom-Json
$Inventory = Get-Content $InventoryFile | ConvertFrom-Json
$RunLog = if (Test-Path $RunLogFile) { Get-Content $RunLogFile | ConvertFrom-Json } else { $null }

$reportDate = (Get-Date -Format "MMMM d, yyyy")
$pnl = $Dash.ProfitAndLoss

# --- Helper: Format Currency ---
function Fmt-Currency([decimal]$val) {
    if ([math]::Abs($val) -ge 1000000) { return "`${0:N1}M" -f ($val / 1000000) }
    if ([math]::Abs($val) -ge 1000) { return "`${0:N0}K" -f ($val / 1000) }
    return "`${0:N0}" -f $val
}

# --- Helper: CSS Bar ---
function CSS-Bar([decimal]$pct, [string]$color) {
    $w = [math]::Max(0, [math]::Min(100, $pct))
    return "<div class='bar-bg'><div class='bar-fill' style='width:${w}%;background:${color}'></div></div>"
}

# --- Build KPI Cards ---
$annRev = Fmt-Currency $pnl.Annual.GrossRevenue
$annNet = Fmt-Currency $pnl.Annual.NetOperatingProfit
$netMgn = "$($pnl.Annual.NetMarginPct)%"
$healthScore = $Dash.PortfolioScorecard.PortfolioHealthScore
$starCount = $Dash.PortfolioScorecard.TierDistribution.Star
$totalSKUs = $Dash.PortfolioScorecard.TotalSKUs
$bundleCount = $Bundles.Bundles.Count
$riskCount = $Dash.RiskRegister.Count

# --- Tier Distribution ---
$tiers = $Dash.PortfolioScorecard.TierDistribution
$tierHTML = ""
foreach ($t in @(@{N="Star";V=$tiers.Star;C="#22c55e"},@{N="Core";V=$tiers.Core;C="#3b82f6"},@{N="Watch";V=$tiers.Watch;C="#eab308"},@{N="Sunset";V=$tiers.Sunset;C="#ef4444"})) {
    $pct = [math]::Round(($t.V / $totalSKUs) * 100, 0)
    $tierHTML += "<tr><td>$($t.N)</td><td class='num'>$($t.V)</td><td>$(CSS-Bar $pct $($t.C))</td><td class='num'>${pct}%</td></tr>"
}

# --- Channel Economics ---
$chanHTML = ""
foreach ($ch in $Dash.ChannelEconomics) {
    $rev = Fmt-Currency $ch.MonthlyRevenue
    $net = Fmt-Currency $ch.MonthlyNetProfit
    $chanHTML += "<tr><td>$($ch.Channel)</td><td class='num'>$rev</td><td class='num'>$($ch.RevenueShare)</td><td class='num'>$net</td><td class='num'>$($ch.NetMarginPct)%</td></tr>"
}

# --- Forecast Quarterly ---
$qHTML = ""
foreach ($q in $Forecast.QuarterlyRollup) {
    $rev = Fmt-Currency $q.Revenue
    $net = Fmt-Currency $q.NetProfit
    $qHTML += "<tr><td>$($q.Quarter)</td><td class='num'>$rev</td><td class='num'>$net</td><td class='num'>$($q.NetMarginPct)%</td></tr>"
}

# --- Forecast Monthly Revenue Chart (CSS bars) ---
$maxMonthRev = ($Forecast.MonthlyForecast | ForEach-Object { [decimal]$_.Revenue.Total } | Measure-Object -Maximum).Maximum
$forecastBarsHTML = ""
foreach ($m in $Forecast.MonthlyForecast) {
    $rev = [decimal]$m.Revenue.Total
    $pct = [math]::Round(($rev / $maxMonthRev) * 100, 0)
    $label = $m.Label -replace ' \d{4}$', ''
    $revFmt = Fmt-Currency $rev
    $forecastBarsHTML += "<div class='chart-bar-wrap'><span class='chart-label'>$label</span><div class='chart-bar-bg'><div class='chart-bar' style='width:${pct}%'></div></div><span class='chart-val'>$revFmt</span></div>"
}

# --- Top 5 Bundles ---
$bundleHTML = ""
foreach ($b in ($Bundles.Bundles | Sort-Object { [decimal]$_.Projection.AnnualGrossProfit } -Descending | Select-Object -First 5)) {
    $rev = Fmt-Currency $b.Projection.AnnualBundleRevenue
    $gross = Fmt-Currency $b.Projection.AnnualGrossProfit
    $bundleHTML += "<tr><td>$($b.BundleName)</td><td class='num'>$($b.QualityFlag)</td><td class='num'>`$$($b.Pricing.BundlePrice)</td><td class='num'>$($b.Pricing.BundleDTCMargin)%</td><td class='num'>$rev</td><td class='num'>$gross</td></tr>"
}

# --- Top Stars ---
$starsHTML = ""
foreach ($s in ($Rat.SKUs | Where-Object { $_.Tier -eq "Star" } | Sort-Object { [decimal]$_.CompositeScore } -Descending)) {
    $starsHTML += "<tr><td>$($s.SKU)</td><td>$($s.Name)</td><td class='num'>$($s.CompositeScore)</td><td class='num'>$($s.DTCMargin)%</td><td class='num'>$($s.ViableChannels)/3</td></tr>"
}

# --- Risk Register ---
$riskHTML = ""
foreach ($r in $Dash.RiskRegister) {
    $sevClass = switch ($r.Severity) { "HIGH" { "risk-high" } "MEDIUM" { "risk-med" } default { "risk-low" } }
    $riskHTML += "<tr><td><span class='$sevClass'>$($r.Severity)</span></td><td>$($r.Category)</td><td>$($r.Risk)</td><td>$($r.Action)</td></tr>"
}

# --- Recommendations ---
$recHTML = ""
foreach ($r in $Dash.TopRecommendations) {
    $recHTML += "<tr><td class='num'>$($r.Priority)</td><td>$($r.Area)</td><td>$($r.Recommendation)</td><td>$($r.Impact)</td></tr>"
}

# --- Inventory Alerts ---
$invAlerts = $Inventory.PortfolioSummary.UrgentReorders
$invHTML = ""
if ($invAlerts) {
    foreach ($po in $invAlerts) {
        $urgClass = if ($po.Urgency -eq "URGENT") { "risk-high" } else { "risk-med" }
        $invHTML += "<tr><td>$($po.SKU)</td><td>$($po.Name)</td><td><span class='$urgClass'>$($po.Urgency)</span></td><td class='num'>$($po.DaysUntilReorder)d</td><td class='num'>$($po.OrderQty)</td><td class='num'>`$$($po.OrderValue)</td></tr>"
    }
}

# --- Pipeline Status ---
$pipeHTML = ""
if ($RunLog) {
    $pipeHTML = "<p>Last run: <strong>$($RunLog.RunId)</strong> | $($RunLog.Summary.Passed)/$($RunLog.Summary.TotalSteps) passed | $($RunLog.TotalDuration) | $($RunLog.FilesChanged) files changed</p>"
}

# --- Assemble HTML ---
$html = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FarmCeutica Executive Report - $reportDate</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #f8fafc; line-height: 1.5; }
  .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: white; padding: 40px 32px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 28px; font-weight: 700; }
  .header .subtitle { opacity: 0.8; margin-top: 4px; }
  .header .scenario { margin-top: 8px; font-size: 14px; opacity: 0.7; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .kpi-card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .kpi-card .kpi-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
  .kpi-card .kpi-value { font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px; }
  .kpi-card .kpi-sub { font-size: 13px; color: #64748b; margin-top: 2px; }
  .section { background: white; border-radius: 10px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .section h2 { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .section h3 { font-size: 15px; font-weight: 600; color: #475569; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 10px; background: #f1f5f9; color: #475569; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .bar-bg { background: #e2e8f0; border-radius: 4px; height: 8px; width: 100px; display: inline-block; }
  .bar-fill { height: 8px; border-radius: 4px; }
  .risk-high { background: #fecaca; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .risk-med { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .risk-low { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .chart-bar-wrap { display: flex; align-items: center; margin-bottom: 6px; gap: 8px; }
  .chart-label { width: 36px; font-size: 11px; color: #64748b; text-align: right; flex-shrink: 0; }
  .chart-bar-bg { flex: 1; background: #e2e8f0; border-radius: 4px; height: 18px; }
  .chart-bar { height: 18px; border-radius: 4px; background: linear-gradient(90deg, #3b82f6, #6366f1); }
  .chart-val { width: 60px; font-size: 11px; color: #475569; flex-shrink: 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px; padding: 16px; }
  @media print { body { background: white; } .container { padding: 0; } .section { box-shadow: none; border: 1px solid #e2e8f0; } }
</style>
</head>
<body>
<div class="container">

<div class="header">
  <h1>FarmCeutica Executive Report</h1>
  <div class="subtitle">$reportDate</div>
  <div class="scenario">Scenario: $($Dash.ActiveScenario) | Pipeline: $($RunLog.Summary.Passed)/$($RunLog.Summary.TotalSteps) steps passed</div>
</div>

<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">Annual Revenue</div><div class="kpi-value">$annRev</div><div class="kpi-sub">Individual + Bundles</div></div>
  <div class="kpi-card"><div class="kpi-label">Net Profit</div><div class="kpi-value">$annNet</div><div class="kpi-sub">$netMgn margin</div></div>
  <div class="kpi-card"><div class="kpi-label">Portfolio Health</div><div class="kpi-value">$healthScore<span style="font-size:16px;color:#64748b">/100</span></div><div class="kpi-sub">$starCount Stars / $totalSKUs SKUs</div></div>
  <div class="kpi-card"><div class="kpi-label">Active Risks</div><div class="kpi-value">$riskCount</div><div class="kpi-sub">$bundleCount bundles designed</div></div>
</div>

<div class="two-col">
<div class="section">
  <h2>Tier Distribution</h2>
  <table><tr><th>Tier</th><th class="num">SKUs</th><th>Distribution</th><th class="num">%</th></tr>$tierHTML</table>
</div>
<div class="section">
  <h2>Channel Economics (Monthly)</h2>
  <table><tr><th>Channel</th><th class="num">Revenue</th><th class="num">Share</th><th class="num">Net Profit</th><th class="num">Margin</th></tr>$chanHTML</table>
</div>
</div>

<div class="section">
  <h2>12-Month Revenue Forecast</h2>
  <div style="margin-bottom:12px">
    <span style="font-size:13px;color:#64748b">$($Forecast.ForecastPeriod) | Growth: $($Forecast.AnnualSummary.TotalGrowthPct)% M1-M12</span>
  </div>
  $forecastBarsHTML
</div>

<div class="section">
  <h2>Quarterly Outlook</h2>
  <table><tr><th>Quarter</th><th class="num">Revenue</th><th class="num">Net Profit</th><th class="num">Margin</th></tr>$qHTML
  <tr style="font-weight:700;border-top:2px solid #cbd5e1"><td>Full Year</td><td class="num">$(Fmt-Currency $Forecast.AnnualSummary.TotalRevenue)</td><td class="num">$(Fmt-Currency $Forecast.AnnualSummary.TotalNetProfit)</td><td class="num">$($Forecast.AnnualSummary.NetMarginPct)%</td></tr></table>
</div>

<div class="section">
  <h2>Star SKUs (Promote & Invest)</h2>
  <table><tr><th>SKU</th><th>Product</th><th class="num">Score</th><th class="num">DTC Margin</th><th class="num">Channels</th></tr>$starsHTML</table>
</div>

<div class="section">
  <h2>Top 5 Bundles by Gross Profit</h2>
  <table><tr><th>Bundle</th><th class="num">Quality</th><th class="num">Price</th><th class="num">Margin</th><th class="num">Annual Rev</th><th class="num">Gross Profit</th></tr>$bundleHTML</table>
</div>

<div class="section">
  <h2>Risk Register</h2>
  <table><tr><th>Severity</th><th>Category</th><th>Risk</th><th>Action</th></tr>$riskHTML</table>
</div>

<div class="section">
  <h2>Strategic Recommendations</h2>
  <table><tr><th class="num">#</th><th>Area</th><th>Recommendation</th><th>Impact</th></tr>$recHTML</table>
</div>

$(if ($invAlerts) { @"
<div class="section">
  <h2>Inventory Alerts</h2>
  <p style="font-size:13px;color:#64748b;margin-bottom:12px">Avg inventory value: $(Fmt-Currency $Inventory.PortfolioSummary.TotalAvgInventoryValue) | Annual holding: $(Fmt-Currency $Inventory.PortfolioSummary.TotalAnnualHoldingCost)</p>
  <table><tr><th>SKU</th><th>Product</th><th>Urgency</th><th class="num">Days Left</th><th class="num">Order Qty</th><th class="num">Value</th></tr>$invHTML</table>
</div>
"@ })

<div class="footer">
  Generated by FarmCeutica Toolchain v2.0 | $reportDate | $pipeHTML
</div>

</div>
</body>
</html>
"@

$html | Set-Content $OutputFile -Encoding UTF8

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  HTML REPORT GENERATED" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  File: $OutputFile" -ForegroundColor Green
Write-Host "  Size: $([math]::Round((Get-Item $OutputFile).Length / 1024, 1)) KB" -ForegroundColor White
Write-Host "  Sections: 9 (KPIs, Tiers, Channels, Forecast, Stars, Bundles, Risks, Recs, Inventory)" -ForegroundColor White
Write-Host ""
