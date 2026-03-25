<# ================================================================
   FarmCeutica Toolchain CLI
   Single entry point for the entire 18-script financial pipeline.
   Usage: .\farmceutica.ps1 <command> [options]
   ================================================================ #>

param(
    [Parameter(Position=0)]
    [string]$Command,
    [switch]$Help,
    [switch]$DryRun,
    [switch]$Detail
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Version = "2.0.0"
$Banner = @"

  ╔═══════════════════════════════════════════════╗
  ║   FarmCeutica Toolchain CLI v$Version           ║
  ║   25 scripts · 62 SKUs · 7 categories        ║
  ╚═══════════════════════════════════════════════╝

"@

# --- Command Registry ---
$Commands = [ordered]@{
    # Core Pipeline
    "run"        = @{ Script="toolchain_orchestrator.ps1"; Desc="Run full 11-step pipeline"; Category="Pipeline" }
    "run-dry"    = @{ Script="toolchain_orchestrator.ps1"; Args=@("-DryRun"); Desc="Dry run (validate without executing)"; Category="Pipeline" }
    "validate"   = @{ Script="data_integrity_checker.ps1"; Desc="Run 46 cross-file integrity checks"; Category="Pipeline" }
    "alerts"     = @{ Script="alert_engine.ps1"; Desc="Monitor 24 KPI checks, flag critical issues"; Category="Pipeline" }
    "report"     = @{ Script="report_generator.ps1"; Desc="Generate HTML executive report"; Category="Pipeline" }
    "export"     = @{ Script="data_exporter.ps1"; Desc="Export 17 CSVs for Excel/Sheets/BI"; Category="Pipeline" }

    # Data & Costs
    "master"     = @{ Script="farmceutica_master_skus.ps1"; Desc="Regenerate master SKU data (62 SKUs)"; Category="Data" }
    "cogs"       = @{ Script="cogs_recalculation_engine.ps1"; Desc="Recalculate COGS from BOM"; Category="Data" }
    "waterfall"  = @{ Script="margin_waterfall_calculator.ps1"; Desc="7-layer margin decomposition x 3 channels"; Category="Data" }
    "pricing"    = @{ Script="pricing_tier_calculator.ps1"; Desc="Recalculate DTC/WS/Dist pricing tiers"; Category="Data" }

    # Strategy & Revenue
    "channels"   = @{ Script="channel_mix_simulator.ps1"; Desc="Simulate 5 channel mix scenarios"; Category="Strategy" }
    "rational"   = @{ Script="sku_rationalization_engine.ps1"; Desc="Score & classify SKUs (Star/Core/Watch/Sunset)"; Category="Strategy" }
    "bundles"    = @{ Script="bundle_promotion_optimizer.ps1"; Desc="Design 15 bundles with uplift projections"; Category="Strategy" }
    "whatif"     = @{ Script="whatif_scenario_engine.ps1"; Desc="Run 12 what-if scenarios vs baseline"; Category="Strategy" }
    "promos"     = @{ Script="promotion_roi_calculator.ps1"; Desc="Promotion ROI & discount sensitivity"; Category="Strategy" }

    # Finance & Operations
    "dashboard"  = @{ Script="executive_dashboard_generator.ps1"; Desc="Consolidate P&L, KPIs, risks, recs"; Category="Finance" }
    "forecast"   = @{ Script="forecast_trend_projector.ps1"; Desc="12-month forecast with seasonality"; Category="Finance" }
    "unit-econ"  = @{ Script="breakeven_unit_economics.ps1"; Desc="Breakeven, LTV, CAC payback per SKU"; Category="Finance" }
    "inventory"  = @{ Script="inventory_reorder_planner.ps1"; Desc="EOQ, safety stock, reorder points"; Category="Operations" }
    "suppliers"  = @{ Script="supplier_scorecard.ps1"; Desc="Vendor risk scoring & procurement analysis"; Category="Operations" }
    "commissions" = @{ Script="commission_payout_engine.ps1"; Desc="Partner commissions & payout modeling"; Category="Operations" }
    "subs"       = @{ Script="subscription_mrr_analyzer.ps1"; Desc="5-tier MRR model, churn impact, cohort LTV"; Category="Finance" }
    "cashflow"   = @{ Script="cashflow_working_capital.ps1"; Desc="Cash flow, working capital, stress test"; Category="Finance" }
    "cohorts"    = @{ Script="cohort_retention_analyzer.ps1"; Desc="Cohort retention curves, LTV, channel CAC"; Category="Finance" }
    "trends"     = @{ Script="portfolio_trend_tracker.ps1"; Desc="Snapshot 25 KPIs, track MoM trends"; Category="Finance" }
    "board"      = @{ Script="board_metrics_generator.ps1"; Desc="15 investor-grade KPIs for board deck"; Category="Finance" }

    # Utilities
    "status"     = @{ Builtin=$true; Desc="Show pipeline file status & freshness"; Category="Utility" }
    "metrics"    = @{ Builtin=$true; Desc="Quick KPI snapshot from latest data"; Category="Utility" }
    "open"       = @{ Builtin=$true; Desc="Open HTML report in browser"; Category="Utility" }
}

# --- Show Help ---
function Show-Help {
    Write-Host $Banner -ForegroundColor Cyan
    Write-Host "  USAGE: .\farmceutica.ps1 <command> [--help] [--dry-run] [--verbose]" -ForegroundColor White
    Write-Host ""

    $lastCat = ""
    foreach ($key in $Commands.Keys) {
        $cmd = $Commands[$key]
        if ($cmd.Category -ne $lastCat) {
            Write-Host ""
            Write-Host "  $($cmd.Category)" -ForegroundColor Cyan
            $lastCat = $cmd.Category
        }
        Write-Host "    $($key.PadRight(14)) $($cmd.Desc)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "  EXAMPLES" -ForegroundColor Cyan
    Write-Host "    .\farmceutica.ps1 run           # Full pipeline (11 steps, ~5s)" -ForegroundColor DarkGray
    Write-Host "    .\farmceutica.ps1 validate       # Check data integrity (46 checks)" -ForegroundColor DarkGray
    Write-Host "    .\farmceutica.ps1 report          # Generate HTML report" -ForegroundColor DarkGray
    Write-Host "    .\farmceutica.ps1 whatif           # Run what-if scenarios" -ForegroundColor DarkGray
    Write-Host "    .\farmceutica.ps1 status          # File freshness overview" -ForegroundColor DarkGray
    Write-Host "    .\farmceutica.ps1 metrics         # Quick KPI snapshot" -ForegroundColor DarkGray
    Write-Host ""
}

# --- Built-in: Status ---
function Show-Status {
    Write-Host $Banner -ForegroundColor Cyan
    Write-Host "  FILE STATUS" -ForegroundColor Cyan
    Write-Host ""

    $outputFiles = @(
        @{ Name="Master SKUs"; File="farmceutica_master_skus.json" },
        @{ Name="COGS Delta"; File="cogs_delta_report.json" },
        @{ Name="Margin Waterfall"; File="margin_waterfall.json" },
        @{ Name="Pricing Tiers"; File="updated_pricing_tiers.json" },
        @{ Name="Channel Mix"; File="channel_mix_results.json" },
        @{ Name="Rationalization"; File="sku_rationalization.json" },
        @{ Name="Bundles"; File="bundle_optimization.json" },
        @{ Name="Dashboard"; File="executive_dashboard.json" },
        @{ Name="Forecast"; File="forecast_12month.json" },
        @{ Name="Unit Economics"; File="unit_economics.json" },
        @{ Name="Inventory"; File="inventory_reorder_plan.json" },
        @{ Name="What-If"; File="whatif_results.json" },
        @{ Name="Suppliers"; File="supplier_scorecard.json" },
        @{ Name="Subscriptions"; File="subscription_mrr_analysis.json" },
        @{ Name="Cash Flow"; File="cashflow_analysis.json" },
        @{ Name="Integrity"; File="integrity_report.json" },
        @{ Name="HTML Report"; File="farmceutica_report.html" },
        @{ Name="Run Log"; File="toolchain_run_log.json" }
    )

    foreach ($f in $outputFiles) {
        $path = "./$($f.File)"
        if (Test-Path $path) {
            $item = Get-Item $path
            $age = [math]::Round(((Get-Date) - $item.LastWriteTime).TotalHours, 1)
            $size = if ($item.Length -ge 1024) { "$([math]::Round($item.Length/1024,1))KB" } else { "$($item.Length)B" }
            $freshness = if ($age -lt 1) { "FRESH" } elseif ($age -lt 24) { "TODAY" } elseif ($age -lt 168) { "THIS WEEK" } else { "STALE" }
            $color = switch ($freshness) { "FRESH" { "Green" } "TODAY" { "Green" } "THIS WEEK" { "Yellow" } default { "Red" } }
            Write-Host "    $($f.Name.PadRight(18)) $($size.PadRight(10)) $($freshness.PadRight(12)) ${age}h ago" -ForegroundColor $color
        } else {
            Write-Host "    $($f.Name.PadRight(18)) ---        MISSING" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# --- Built-in: Metrics ---
function Show-Metrics {
    Write-Host $Banner -ForegroundColor Cyan

    if (Test-Path "./executive_dashboard.json") {
        $dash = Get-Content "./executive_dashboard.json" | ConvertFrom-Json
        $pnl = $dash.ProfitAndLoss
        $sc = $dash.PortfolioScorecard
        Write-Host "  P&L ($($dash.ActiveScenario) Scenario)" -ForegroundColor Cyan
        Write-Host "    Annual Revenue:    `$$("{0:N0}" -f $pnl.Annual.GrossRevenue)" -ForegroundColor Green
        Write-Host "    Annual Net Profit: `$$("{0:N0}" -f $pnl.Annual.NetOperatingProfit)" -ForegroundColor Green
        Write-Host "    Net Margin:        $($pnl.Annual.NetMarginPct)%" -ForegroundColor White
        Write-Host ""
        Write-Host "  Portfolio" -ForegroundColor Cyan
        Write-Host "    Health Score: $($sc.PortfolioHealthScore)/100" -ForegroundColor White
        Write-Host "    Tiers: $($sc.TierDistribution.Star) Star, $($sc.TierDistribution.Core) Core, $($sc.TierDistribution.Watch) Watch, $($sc.TierDistribution.Sunset) Sunset" -ForegroundColor White
        Write-Host "    Risks: $($dash.RiskRegister.Count) identified" -ForegroundColor White
    }

    if (Test-Path "./forecast_12month.json") {
        $fc = Get-Content "./forecast_12month.json" | ConvertFrom-Json
        Write-Host ""
        Write-Host "  Forecast ($($fc.ForecastPeriod))" -ForegroundColor Cyan
        Write-Host "    12mo Revenue:  `$$("{0:N0}" -f $fc.AnnualSummary.TotalRevenue)" -ForegroundColor White
        Write-Host "    M1->M12 Growth: $($fc.AnnualSummary.TotalGrowthPct)%" -ForegroundColor White
    }

    if (Test-Path "./subscription_mrr_analysis.json") {
        $subs = Get-Content "./subscription_mrr_analysis.json" | ConvertFrom-Json
        Write-Host ""
        Write-Host "  Subscriptions" -ForegroundColor Cyan
        Write-Host "    MRR: `$$("{0:N0}" -f $subs.CurrentState.CurrentMRR)  ARR: `$$("{0:N0}" -f $subs.CurrentState.CurrentARR)" -ForegroundColor White
        Write-Host "    Subscribers: $($subs.CurrentState.TotalSubscriptions)" -ForegroundColor White
    }

    if (Test-Path "./cashflow_analysis.json") {
        $cf = Get-Content "./cashflow_analysis.json" | ConvertFrom-Json
        Write-Host ""
        Write-Host "  Cash Flow" -ForegroundColor Cyan
        Write-Host "    Opening: `$$("{0:N0}" -f $cf.AnnualSummary.OpeningCash)  Ending: `$$("{0:N0}" -f $cf.AnnualSummary.EndingCash)" -ForegroundColor White
        Write-Host "    FCF: `$$("{0:N0}" -f $cf.AnnualSummary.FreeCashFlow)" -ForegroundColor White
    }

    if (Test-Path "./integrity_report.json") {
        $int = Get-Content "./integrity_report.json" | ConvertFrom-Json
        Write-Host ""
        $intColor = switch ($int.OverallStatus) { "PASS" { "Green" } "WARN" { "Yellow" } default { "Red" } }
        Write-Host "  Integrity: $($int.OverallStatus) ($($int.Summary.Passed)/$($int.Summary.TotalChecks) checks)" -ForegroundColor $intColor
    }

    Write-Host ""
}

# --- Built-in: Open Report ---
function Open-Report {
    $reportPath = Resolve-Path "./farmceutica_report.html" -ErrorAction SilentlyContinue
    if ($reportPath) {
        Start-Process $reportPath.Path
        Write-Host "  Opened: $($reportPath.Path)" -ForegroundColor Green
    } else {
        Write-Host "  Report not found. Run: .\farmceutica.ps1 report" -ForegroundColor Yellow
    }
}

# --- Main ---
if (-not $Command -or $Help -or $Command -eq "help") {
    Show-Help
    exit 0
}

if (-not $Commands.Contains($Command)) {
    Write-Host "  Unknown command: '$Command'" -ForegroundColor Red
    Write-Host "  Run .\farmceutica.ps1 help for available commands." -ForegroundColor White
    exit 1
}

$cmd = $Commands[$Command]

# Handle built-in commands
if ($cmd.Builtin) {
    switch ($Command) {
        "status"  { Show-Status }
        "metrics" { Show-Metrics }
        "open"    { Open-Report }
    }
    exit 0
}

# Execute script command
$scriptPath = "./$($cmd.Script)"
if (-not (Test-Path $scriptPath)) {
    Write-Host "  Script not found: $($cmd.Script)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Running: $Command ($($cmd.Desc))" -ForegroundColor Cyan
Write-Host "  Script:  $($cmd.Script)" -ForegroundColor DarkGray
Write-Host ""

$startTime = Get-Date
$extraArgs = @()
if ($cmd.Args) { $extraArgs = $cmd.Args }
if ($DryRun -and $Command -eq "run") { $extraArgs += "-DryRun" }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath @extraArgs

$duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
Write-Host ""
Write-Host "  Done in ${duration}s" -ForegroundColor Green
