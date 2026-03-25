<# ================================================================
   FarmCeutica Automated Alert & Notification Engine
   Input:  All toolchain JSON outputs
   Output: alerts.json
   Monitors all KPIs against configurable thresholds and generates
   prioritized action alerts. The operational watchdog for the
   entire 23-script toolchain.
   ================================================================ #>

param(
    [string]$WorkingDir = ".",
    [string]$OutputFile = "./alerts.json"
)

$ErrorActionPreference = "Stop"
Set-Location $WorkingDir

$Alerts = @()
$CheckCount = 0

function Add-Alert([string]$Severity, [string]$Category, [string]$Title, [string]$Detail, [string]$Action) {
    $script:Alerts += [PSCustomObject]@{
        Severity = $Severity; Category = $Category
        Title = $Title; Detail = $Detail; Action = $Action
        Timestamp = (Get-Date -Format "o")
    }
}

# ═══════════════════════════════════════════
# REVENUE & MARGIN ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./executive_dashboard.json") {
    $dash = Get-Content "./executive_dashboard.json" | ConvertFrom-Json
    $CheckCount += 5

    $netMargin = [decimal]$dash.ProfitAndLoss.Annual.NetMarginPct
    if ($netMargin -lt 30) {
        Add-Alert "CRITICAL" "Revenue" "Net margin below 30%" "Current: $netMargin%" "Review pricing strategy and cost structure immediately"
    } elseif ($netMargin -lt 40) {
        Add-Alert "WARNING" "Revenue" "Net margin below 40%" "Current: $netMargin%" "Monitor cost trends; consider price adjustments"
    }

    $healthScore = [decimal]$dash.PortfolioScorecard.PortfolioHealthScore
    if ($healthScore -lt 50) {
        Add-Alert "CRITICAL" "Portfolio" "Portfolio health score below 50" "Current: $healthScore/100" "Urgent portfolio review required"
    } elseif ($healthScore -lt 65) {
        Add-Alert "WARNING" "Portfolio" "Portfolio health score below 65" "Current: $healthScore/100" "Schedule portfolio optimization review"
    }

    $sunsetCount = [int]$dash.PortfolioScorecard.TierDistribution.Sunset
    if ($sunsetCount -gt 0) {
        Add-Alert "WARNING" "Portfolio" "$sunsetCount SKU(s) in Sunset tier" "Products failing viability thresholds" "Evaluate discontinuation within 30 days"
    }

    $watchCount = [int]$dash.PortfolioScorecard.TierDistribution.Watch
    if ($watchCount -gt 5) {
        Add-Alert "WARNING" "Portfolio" "$watchCount SKUs in Watch tier" "Growing number of underperformers" "Review repricing and reformulation options"
    }

    $riskCount = $dash.RiskRegister.Count
    $highRisks = ($dash.RiskRegister | Where-Object { $_.Severity -eq "HIGH" }).Count
    if ($highRisks -gt 2) {
        Add-Alert "CRITICAL" "Risk" "$highRisks HIGH severity risks active" "Multiple critical risks require attention" "Convene risk review meeting this week"
    } elseif ($highRisks -gt 0) {
        Add-Alert "WARNING" "Risk" "$highRisks HIGH severity risk(s) active" "Risk register has unresolved high items" "Address in next operational review"
    }
}

# ═══════════════════════════════════════════
# SUBSCRIPTION & MRR ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./subscription_mrr_analysis.json") {
    $subs = Get-Content "./subscription_mrr_analysis.json" | ConvertFrom-Json
    $CheckCount += 3

    $mrr = [decimal]$subs.CurrentState.CurrentMRR
    if ($mrr -lt 500000) {
        Add-Alert "CRITICAL" "Subscription" "MRR below $500K" "Current MRR: `$$('{0:N0}' -f $mrr)" "Accelerate subscription conversion campaigns"
    }

    # Check if monthly subscribers dominate (healthy)
    $monthlyShare = ($subs.CurrentState.TierBreakdown | Where-Object { $_.Tier -eq "Subscribe Monthly" }).ShareOfMRR
    $monthlyPct = if ($monthlyShare) { [decimal]($monthlyShare -replace '%','') } else { 0 }
    if ($monthlyPct -gt 70) {
        Add-Alert "INFO" "Subscription" "Monthly subscriptions are $monthlyPct% of MRR" "Heavy concentration in monthly tier" "Incentivize quarterly/annual upgrades for stability"
    }

    $customers = [int]$subs.CustomerAssumptions.TotalActiveCustomers
    if ($customers -lt 5000) {
        Add-Alert "WARNING" "Growth" "Active customers below 5,000" "Current: $customers" "Increase acquisition spend on top-performing channels"
    }
}

# ═══════════════════════════════════════════
# CASH FLOW ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./cashflow_analysis.json") {
    $cf = Get-Content "./cashflow_analysis.json" | ConvertFrom-Json
    $CheckCount += 4

    $endingCash = [decimal]$cf.AnnualSummary.EndingCash
    $fcf = [decimal]$cf.AnnualSummary.FreeCashFlow

    if ($fcf -lt 0) {
        Add-Alert "CRITICAL" "Cash Flow" "Negative free cash flow" "FCF: `$$('{0:N0}' -f $fcf)" "Cut non-essential OpEx; review capital allocation"
    }

    $lowestCash = [decimal]$cf.AnnualSummary.LowestCashPoint.Cash
    if ($lowestCash -lt 100000) {
        Add-Alert "CRITICAL" "Cash Flow" "Projected cash drops below $100K" "Lowest point: `$$('{0:N0}' -f $lowestCash) in Month $($cf.AnnualSummary.LowestCashPoint.Month)" "Arrange credit facility or defer CapEx"
    }

    $criticalMonths = ($cf.MonthlyCashFlow | Where-Object { $_.HealthFlag -eq "CRITICAL" }).Count
    $warningMonths = ($cf.MonthlyCashFlow | Where-Object { $_.HealthFlag -eq "WARNING" }).Count
    if ($criticalMonths -gt 0) {
        Add-Alert "CRITICAL" "Cash Flow" "$criticalMonths month(s) at CRITICAL cash level" "Insufficient cash to cover operations" "Immediate cash management intervention required"
    } elseif ($warningMonths -gt 0) {
        Add-Alert "WARNING" "Cash Flow" "$warningMonths month(s) at WARNING cash level" "Cash runway is tight in some periods" "Build cash reserves ahead of tight months"
    }

    $stressMonths = [int]$cf.StressTest.MonthsBeforeCashNegative
    if ($stressMonths -lt 6) {
        Add-Alert "WARNING" "Cash Flow" "Stress test: cash runs out in $stressMonths months at -30% revenue" "Insufficient buffer for downturn" "Build 6-month operating reserve"
    }
}

# ═══════════════════════════════════════════
# INVENTORY ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./inventory_reorder_plan.json") {
    $inv = Get-Content "./inventory_reorder_plan.json" | ConvertFrom-Json
    $CheckCount += 3

    $urgentPOs = ($inv.SKUs | Where-Object { $_.NextPO.Urgency -eq "URGENT" }).Count
    if ($urgentPOs -gt 0) {
        $urgentNames = ($inv.SKUs | Where-Object { $_.NextPO.Urgency -eq "URGENT" } | ForEach-Object { "$($_.SKU) $($_.Name)" }) -join "; "
        Add-Alert "CRITICAL" "Inventory" "$urgentPOs SKU(s) need URGENT reorder" $urgentNames "Place purchase orders today"
    }

    $soonPOs = ($inv.SKUs | Where-Object { $_.NextPO.Urgency -eq "SOON" }).Count
    if ($soonPOs -gt 5) {
        Add-Alert "WARNING" "Inventory" "$soonPOs SKUs need reorder SOON" "Multiple products approaching reorder point" "Batch PO review within 5 business days"
    }

    $highStockout = ($inv.SKUs | Where-Object { $_.Risk.StockoutRisk -eq "HIGH" }).Count
    if ($highStockout -gt 10) {
        Add-Alert "WARNING" "Inventory" "$highStockout SKUs at HIGH stockout risk" "Demand variability or lead time concerns" "Review safety stock levels for high-risk SKUs"
    }
}

# ═══════════════════════════════════════════
# SUPPLIER ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./supplier_scorecard.json") {
    $suppliers = Get-Content "./supplier_scorecard.json" | ConvertFrom-Json
    $CheckCount += 2

    $highRiskSuppliers = ($suppliers.Suppliers | Where-Object { $_.RiskTier -in @("HIGH","ELEVATED") })
    if ($highRiskSuppliers.Count -gt 0) {
        $names = ($highRiskSuppliers | ForEach-Object { "$($_.Supplier) ($($_.RiskTier))" }) -join "; "
        Add-Alert "WARNING" "Supply Chain" "$($highRiskSuppliers.Count) supplier(s) at elevated risk" $names "Qualify alternate suppliers within 60 days"
    }

    $hhi = [decimal]$suppliers.ProcurementSummary.HHI
    if ($hhi -gt 2500) {
        Add-Alert "WARNING" "Supply Chain" "Supplier concentration HHI above 2500" "HHI: $hhi - highly concentrated" "Diversify procurement across additional vendors"
    }
}

# ═══════════════════════════════════════════
# COHORT & RETENTION ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./cohort_retention_analysis.json") {
    $cohort = Get-Content "./cohort_retention_analysis.json" | ConvertFrom-Json
    $CheckCount += 2

    $ltvCAC = [decimal]$cohort.KeyMetrics.LTVtoCACRatio
    if ($ltvCAC -lt 3) {
        Add-Alert "CRITICAL" "Unit Economics" "LTV:CAC below 3x" "Current: ${ltvCAC}x" "Reduce CAC or improve retention to restore economics"
    } elseif ($ltvCAC -lt 5) {
        Add-Alert "WARNING" "Unit Economics" "LTV:CAC below 5x" "Current: ${ltvCAC}x" "Optimize acquisition channels; invest in retention"
    }

    $m1Ret = [decimal]($cohort.KeyMetrics.M1Retention -replace '%','')
    if ($m1Ret -lt 50) {
        Add-Alert "CRITICAL" "Retention" "M1 retention below 50%" "Current: $m1Ret%" "Investigate onboarding experience and first-order satisfaction"
    } elseif ($m1Ret -lt 60) {
        Add-Alert "WARNING" "Retention" "M1 retention below 60%" "Current: $m1Ret%" "Improve welcome sequence and first-month engagement"
    }
}

# ═══════════════════════════════════════════
# DATA INTEGRITY ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./integrity_report.json") {
    $integrity = Get-Content "./integrity_report.json" | ConvertFrom-Json
    $CheckCount += 2

    if ([int]$integrity.Summary.Failed -gt 0) {
        Add-Alert "CRITICAL" "Data Quality" "$($integrity.Summary.Failed) integrity check(s) FAILED" "Pipeline data may be inconsistent" "Run: .\farmceutica.ps1 validate and fix failures before using data"
    }

    if ([int]$integrity.Summary.Warnings -gt 3) {
        Add-Alert "WARNING" "Data Quality" "$($integrity.Summary.Warnings) integrity warnings" "Data quality concerns detected" "Review warning details in integrity report"
    }
}

# ═══════════════════════════════════════════
# PRICING & MARGIN ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./updated_pricing_tiers.json") {
    $pricing = Get-Content "./updated_pricing_tiers.json" | ConvertFrom-Json
    $CheckCount += 1

    $marginAlerts = ($pricing | Where-Object { $_.Alerts -ne "PASS" }).Count
    if ($marginAlerts -gt 3) {
        Add-Alert "WARNING" "Pricing" "$marginAlerts SKUs below margin floor" "Products failing DTC >70% or WS >50% thresholds" "Prioritize repricing for worst offenders"
    }
}

# ═══════════════════════════════════════════
# COGS DRIFT ALERTS
# ═══════════════════════════════════════════

if (Test-Path "./cogs_delta_report.json") {
    $cogsDelta = Get-Content "./cogs_delta_report.json" | ConvertFrom-Json
    $CheckCount += 1

    $reviewCount = ($cogsDelta | Where-Object { $_.FLAG -eq "REVIEW" }).Count
    if ($reviewCount -gt 10) {
        Add-Alert "WARNING" "Costs" "$reviewCount SKUs with >10% COGS change" "Significant raw material cost movement" "Lock supplier pricing; renegotiate top-spend ingredients"
    }
}

# ═══════════════════════════════════════════
# FILE FRESHNESS ALERTS
# ═══════════════════════════════════════════

$criticalFiles = @("executive_dashboard.json", "farmceutica_master_skus.json", "margin_waterfall.json")
$staleHours = 168  # 1 week
$CheckCount += 1

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $age = ((Get-Date) - (Get-Item $file).LastWriteTime).TotalHours
        if ($age -gt $staleHours) {
            Add-Alert "INFO" "Freshness" "$file is over 7 days old" "$([math]::Round($age / 24, 0)) days since last update" "Run: .\farmceutica.ps1 run to refresh pipeline"
        }
    }
}

# ═══════════════════════════════════════════
# SORT & SUMMARIZE
# ═══════════════════════════════════════════

$severityOrder = @{ CRITICAL = 0; WARNING = 1; INFO = 2 }
$Alerts = $Alerts | Sort-Object { $severityOrder[$_.Severity] }

$critical = ($Alerts | Where-Object { $_.Severity -eq "CRITICAL" }).Count
$warning = ($Alerts | Where-Object { $_.Severity -eq "WARNING" }).Count
$info = ($Alerts | Where-Object { $_.Severity -eq "INFO" }).Count

$overallStatus = if ($critical -gt 0) { "RED" } elseif ($warning -gt 3) { "AMBER" } elseif ($warning -gt 0) { "YELLOW" } else { "GREEN" }

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    OverallStatus = $overallStatus
    ChecksPerformed = $CheckCount
    Summary = [PSCustomObject]@{
        Critical = $critical; Warning = $warning; Info = $info; Total = $Alerts.Count
    }
    Alerts = $Alerts
}

$output | ConvertTo-Json -Depth 5 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ALERT ENGINE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
$statusColor = switch ($overallStatus) { "RED" { "Red" } "AMBER" { "Red" } "YELLOW" { "Yellow" } default { "Green" } }
Write-Host "  Status: $overallStatus | $($Alerts.Count) alerts from $CheckCount checks" -ForegroundColor $statusColor
Write-Host "  Critical: $critical | Warning: $warning | Info: $info" -ForegroundColor White
Write-Host ""

if ($critical -gt 0) {
    Write-Host "  --- CRITICAL ---" -ForegroundColor Red
    foreach ($a in ($Alerts | Where-Object { $_.Severity -eq "CRITICAL" })) {
        Write-Host "  [!] $($a.Title)" -ForegroundColor Red
        Write-Host "      $($a.Detail)" -ForegroundColor DarkRed
        Write-Host "      -> $($a.Action)" -ForegroundColor White
    }
    Write-Host ""
}
if ($warning -gt 0) {
    Write-Host "  --- WARNING ---" -ForegroundColor Yellow
    foreach ($a in ($Alerts | Where-Object { $_.Severity -eq "WARNING" })) {
        Write-Host "  [*] $($a.Title)" -ForegroundColor Yellow
        Write-Host "      -> $($a.Action)" -ForegroundColor White
    }
    Write-Host ""
}
if ($info -gt 0) {
    Write-Host "  --- INFO ---" -ForegroundColor DarkGray
    foreach ($a in ($Alerts | Where-Object { $_.Severity -eq "INFO" })) {
        Write-Host "  [i] $($a.Title)" -ForegroundColor DarkGray
    }
    Write-Host ""
}
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
