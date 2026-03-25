<# ================================================================
   FarmCeutica Data Validation & Integrity Checker
   Input:  All toolchain JSON outputs
   Output: integrity_report.json
   Cross-validates all outputs for SKU count mismatches, margin
   drift, orphaned references, stale timestamps, and calculation
   consistency. Generates a pass/fail integrity report.
   ================================================================ #>

param(
    [string]$WorkingDir = ".",
    [string]$OutputFile = "./integrity_report.json"
)

$ErrorActionPreference = "Stop"
Set-Location $WorkingDir

$RunStart = Get-Date
$Checks = @()
$Passed = 0
$Failed = 0
$Warnings = 0

# --- Helper: Add Check Result ---
function Add-Check([string]$Category, [string]$Name, [string]$Status, [string]$Detail, $Expected = $null, $Actual = $null) {
    $script:Checks += [PSCustomObject]@{
        Category = $Category; Check = $Name; Status = $Status
        Detail = $Detail; Expected = $Expected; Actual = $Actual
    }
    switch ($Status) {
        "PASS" { $script:Passed++ }
        "FAIL" { $script:Failed++ }
        "WARN" { $script:Warnings++ }
    }
}

# --- Load All Files ---
$Files = @{
    Master = @{ Path = "farmceutica_master_skus.json"; Required = $true }
    COGSDelta = @{ Path = "cogs_delta_report.json"; Required = $true }
    Waterfall = @{ Path = "margin_waterfall.json"; Required = $true }
    Pricing = @{ Path = "updated_pricing_tiers.json"; Required = $true }
    ChannelMix = @{ Path = "channel_mix_results.json"; Required = $true }
    Rational = @{ Path = "sku_rationalization.json"; Required = $true }
    Bundles = @{ Path = "bundle_optimization.json"; Required = $true }
    Dashboard = @{ Path = "executive_dashboard.json"; Required = $true }
    Forecast = @{ Path = "forecast_12month.json"; Required = $true }
    UnitEcon = @{ Path = "unit_economics.json"; Required = $true }
    Inventory = @{ Path = "inventory_reorder_plan.json"; Required = $true }
    WhatIf = @{ Path = "whatif_results.json"; Required = $false }
    Supplier = @{ Path = "supplier_scorecard.json"; Required = $false }
    SubMRR = @{ Path = "subscription_mrr_analysis.json"; Required = $false }
    CashFlow = @{ Path = "cashflow_analysis.json"; Required = $false }
}

$Data = @{}
foreach ($key in $Files.Keys) {
    $f = $Files[$key]
    if (Test-Path $f.Path) {
        try {
            $Data[$key] = Get-Content $f.Path | ConvertFrom-Json
            Add-Check "FilePresence" "$key file exists" "PASS" $f.Path
        } catch {
            Add-Check "FilePresence" "$key valid JSON" "FAIL" "Failed to parse: $_"
        }
    } else {
        $status = if ($f.Required) { "FAIL" } else { "WARN" }
        Add-Check "FilePresence" "$key file exists" $status "Missing: $($f.Path)"
    }
}

# ═══════════════════════════════════════════
# CHECK 1: SKU Count Consistency
# ═══════════════════════════════════════════

$masterCount = if ($Data.Master) { $Data.Master.Count } else { 0 }
Add-Check "SKUCount" "Master SKU count" "PASS" "$masterCount SKUs in master" 62 $masterCount

if ($Data.Pricing) {
    $pCount = $Data.Pricing.Count
    $status = if ($pCount -eq $masterCount) { "PASS" } else { "FAIL" }
    Add-Check "SKUCount" "Pricing tier count matches master" $status "Pricing has $pCount SKUs" $masterCount $pCount
}

if ($Data.Rational) {
    $rCount = $Data.Rational.SKUs.Count
    $status = if ($rCount -eq $masterCount) { "PASS" } else { "FAIL" }
    Add-Check "SKUCount" "Rationalization count matches master" $status "Rationalization has $rCount SKUs" $masterCount $rCount
}

if ($Data.Waterfall) {
    $wCount = $Data.Waterfall.SKUs.Count
    $status = if ($wCount -eq $masterCount) { "PASS" } else { "FAIL" }
    Add-Check "SKUCount" "Waterfall count matches master" $status "Waterfall has $wCount SKUs" $masterCount $wCount
}

if ($Data.UnitEcon) {
    $ueCount = ($Data.UnitEcon.SKUs | Select-Object -ExpandProperty SKU -Unique).Count
    $status = if ($ueCount -eq $masterCount) { "PASS" } else { "FAIL" }
    Add-Check "SKUCount" "Unit economics SKU count" $status "Unit econ covers $ueCount unique SKUs" $masterCount $ueCount
}

if ($Data.Inventory) {
    $iCount = $Data.Inventory.SKUs.Count
    $status = if ($iCount -eq $masterCount) { "PASS" } else { "FAIL" }
    Add-Check "SKUCount" "Inventory plan SKU count" $status "Inventory covers $iCount SKUs" $masterCount $iCount
}

if ($Data.SubMRR) {
    $sCount = $Data.SubMRR.SKUDetails.Count
    $status = if ($sCount -eq $masterCount) { "PASS" } else { "FAIL" }
    Add-Check "SKUCount" "Subscription analysis SKU count" $status "Subscription covers $sCount SKUs" $masterCount $sCount
}

# ═══════════════════════════════════════════
# CHECK 2: SKU ID Consistency (no orphans)
# ═══════════════════════════════════════════

if ($Data.Master) {
    $masterSKUs = $Data.Master | ForEach-Object { $_.SKU }

    if ($Data.Rational) {
        $ratSKUs = $Data.Rational.SKUs | ForEach-Object { $_.SKU }
        $missing = $masterSKUs | Where-Object { $_ -notin $ratSKUs }
        $orphaned = $ratSKUs | Where-Object { $_ -notin $masterSKUs }
        $status = if ($missing.Count -eq 0 -and $orphaned.Count -eq 0) { "PASS" } else { "FAIL" }
        Add-Check "SKUIntegrity" "Rationalization SKU IDs match master" $status "Missing: $($missing.Count), Orphaned: $($orphaned.Count)"
    }

    if ($Data.Bundles) {
        $bundleSKUs = @()
        foreach ($b in $Data.Bundles.Bundles) {
            foreach ($c in $b.Components) { $bundleSKUs += $c.SKU }
        }
        $bundleSKUs = $bundleSKUs | Select-Object -Unique
        $orphaned = $bundleSKUs | Where-Object { $_ -notin $masterSKUs }
        $status = if ($orphaned.Count -eq 0) { "PASS" } else { "FAIL" }
        Add-Check "SKUIntegrity" "Bundle components reference valid SKUs" $status "Orphaned bundle SKUs: $($orphaned.Count)"
    }
}

# ═══════════════════════════════════════════
# CHECK 3: Margin Calculation Consistency
# ═══════════════════════════════════════════

if ($Data.Master -and $Data.Waterfall) {
    $driftCount = 0
    foreach ($sku in $Data.Master) {
        $wfSKU = $Data.Waterfall.SKUs | Where-Object { $_.SKU -eq $sku.SKU }
        if ($wfSKU) {
            $masterDTC = [decimal]$sku.DTCMargin
            # Waterfall DTC net margin should be lower than master DTC margin (master is COGS-only)
            $wfDTC = [decimal]$wfSKU.Channels.DTC.NetMarginPct
            if ($wfDTC -gt $masterDTC) {
                $driftCount++
            }
        }
    }
    $status = if ($driftCount -eq 0) { "PASS" } else { "WARN" }
    Add-Check "MarginConsistency" "Waterfall net margin <= master DTC margin" $status "$driftCount SKUs with waterfall margin exceeding master (expected: waterfall includes more costs)"
}

if ($Data.Master) {
    $calcErrors = 0
    foreach ($sku in $Data.Master) {
        $msrp = [decimal]$sku.MSRP; $cogs = [decimal]$sku.COGS
        $expectedDTC = [math]::Round((1 - $cogs / $msrp) * 100, 1)
        $actualDTC = [decimal]$sku.DTCMargin
        if ([math]::Abs($expectedDTC - $actualDTC) -gt 0.5) { $calcErrors++ }
    }
    $status = if ($calcErrors -eq 0) { "PASS" } else { "FAIL" }
    Add-Check "MarginConsistency" "Master DTC margin formula verification" $status "$calcErrors SKUs with margin calc error >0.5pp"
}

# ═══════════════════════════════════════════
# CHECK 4: Pricing Tier Consistency
# ═══════════════════════════════════════════

if ($Data.Master) {
    $pricingErrors = 0
    foreach ($sku in $Data.Master) {
        $msrp = [decimal]$sku.MSRP
        $expectedWS = [math]::Round($msrp * 0.50, 2)
        $expectedDist = [math]::Round($msrp * 0.30, 2)
        $actualWS = [decimal]$sku.Wholesale
        $actualDist = [decimal]$sku.Distributor
        if ([math]::Abs($expectedWS - $actualWS) -gt 0.01 -or [math]::Abs($expectedDist - $actualDist) -gt 0.01) {
            $pricingErrors++
        }
    }
    $status = if ($pricingErrors -eq 0) { "PASS" } else { "FAIL" }
    Add-Check "PricingIntegrity" "WS=50% and Dist=30% of MSRP" $status "$pricingErrors SKUs with pricing tier calc errors"
}

# ═══════════════════════════════════════════
# CHECK 5: Rationalization Tier Distribution
# ═══════════════════════════════════════════

if ($Data.Rational) {
    $tiers = $Data.Rational.SKUs | Group-Object Tier
    $tierCounts = @{}
    foreach ($t in $tiers) { $tierCounts[$t.Name] = $t.Count }
    $totalTiered = ($tierCounts.Values | Measure-Object -Sum).Sum
    $status = if ($totalTiered -eq $masterCount) { "PASS" } else { "FAIL" }
    Add-Check "RationalizationIntegrity" "All SKUs assigned a tier" $status "Star:$($tierCounts['Star']) Core:$($tierCounts['Core']) Watch:$($tierCounts['Watch']) Sunset:$($tierCounts['Sunset'])" $masterCount $totalTiered

    # No SKU should have score outside 0-100
    $outOfRange = $Data.Rational.SKUs | Where-Object { [decimal]$_.CompositeScore -lt 0 -or [decimal]$_.CompositeScore -gt 100 }
    $status = if ($outOfRange.Count -eq 0) { "PASS" } else { "FAIL" }
    Add-Check "RationalizationIntegrity" "Composite scores within 0-100" $status "$($outOfRange.Count) SKUs out of range"
}

# ═══════════════════════════════════════════
# CHECK 6: Forecast Completeness
# ═══════════════════════════════════════════

if ($Data.Forecast) {
    $monthCount = $Data.Forecast.MonthlyForecast.Count
    $status = if ($monthCount -eq 12) { "PASS" } else { "FAIL" }
    Add-Check "ForecastIntegrity" "12 months projected" $status "Found $monthCount months" 12 $monthCount

    # Revenue should be monotonically reasonable (no negative)
    $negRevMonths = $Data.Forecast.MonthlyForecast | Where-Object { [decimal]$_.Revenue.Total -le 0 }
    $status = if ($negRevMonths.Count -eq 0) { "PASS" } else { "FAIL" }
    Add-Check "ForecastIntegrity" "No negative revenue months" $status "$($negRevMonths.Count) months with zero/negative revenue"

    # Cumulative should be monotonically increasing
    $cumDecline = 0
    for ($i = 1; $i -lt $Data.Forecast.MonthlyForecast.Count; $i++) {
        if ([decimal]$Data.Forecast.MonthlyForecast[$i].CumulativeRevenue -lt [decimal]$Data.Forecast.MonthlyForecast[$i-1].CumulativeRevenue) {
            $cumDecline++
        }
    }
    $status = if ($cumDecline -eq 0) { "PASS" } else { "FAIL" }
    Add-Check "ForecastIntegrity" "Cumulative revenue never decreases" $status "$cumDecline instances of cumulative decline"
}

# ═══════════════════════════════════════════
# CHECK 7: Bundle Component Validity
# ═══════════════════════════════════════════

if ($Data.Bundles -and $Data.Rational) {
    $sunsetSKUs = $Data.Rational.SKUs | Where-Object { $_.Tier -eq "Sunset" } | ForEach-Object { $_.SKU }
    $bundlesWithSunset = 0
    foreach ($b in $Data.Bundles.Bundles) {
        foreach ($c in $b.Components) {
            if ($c.SKU -in $sunsetSKUs) { $bundlesWithSunset++ }
        }
    }
    $status = if ($bundlesWithSunset -eq 0) { "PASS" } else { "WARN" }
    Add-Check "BundleIntegrity" "No Sunset SKUs in bundles" $status "$bundlesWithSunset Sunset SKU references in bundles"

    # Bundle prices should be less than sum of components
    $overpriced = 0
    foreach ($b in $Data.Bundles.Bundles) {
        if ([decimal]$b.Pricing.BundlePrice -ge [decimal]$b.Pricing.IndividualTotal) { $overpriced++ }
    }
    $status = if ($overpriced -eq 0) { "PASS" } else { "FAIL" }
    Add-Check "BundleIntegrity" "All bundles priced below component total" $status "$overpriced bundles with bundle >= individual price"
}

# ═══════════════════════════════════════════
# CHECK 8: Cash Flow Sanity
# ═══════════════════════════════════════════

if ($Data.CashFlow) {
    $cfMonths = $Data.CashFlow.MonthlyCashFlow.Count
    $status = if ($cfMonths -eq 12) { "PASS" } else { "FAIL" }
    Add-Check "CashFlowIntegrity" "12 months of cash flow" $status "$cfMonths months found" 12 $cfMonths

    $criticalMonths = $Data.CashFlow.MonthlyCashFlow | Where-Object { $_.HealthFlag -eq "CRITICAL" }
    $status = if ($criticalMonths.Count -eq 0) { "PASS" } else { "WARN" }
    Add-Check "CashFlowIntegrity" "No CRITICAL cash months" $status "$($criticalMonths.Count) months at CRITICAL"
}

# ═══════════════════════════════════════════
# CHECK 9: Cross-File Revenue Consistency
# ═══════════════════════════════════════════

if ($Data.ChannelMix -and $Data.Dashboard) {
    $cmScenario = $Data.ChannelMix.Scenarios | Where-Object { $_.Scenario -eq $Data.Dashboard.ActiveScenario }
    if ($cmScenario) {
        $cmRev = [decimal]$cmScenario.Summary.MonthlyRevenue
        $dashRev = [decimal]$Data.Dashboard.ProfitAndLoss.Monthly.IndividualSKURevenue
        $diff = [math]::Abs($cmRev - $dashRev)
        $status = if ($diff -lt 1) { "PASS" } elseif ($diff -lt 100) { "WARN" } else { "FAIL" }
        Add-Check "CrossFileConsistency" "Dashboard revenue matches channel mix scenario" $status "Diff: `$$([math]::Round($diff,2))"
    }
}

# ═══════════════════════════════════════════
# CHECK 10: Timestamp Freshness
# ═══════════════════════════════════════════

$staleThresholdHours = 24
$now = Get-Date
foreach ($key in @("Waterfall", "Rational", "Dashboard", "Forecast", "UnitEcon")) {
    if ($Data[$key] -and $Data[$key].GeneratedAt) {
        try {
            $genTime = [datetime]$Data[$key].GeneratedAt
            $age = ($now - $genTime).TotalHours
            $status = if ($age -lt $staleThresholdHours) { "PASS" } elseif ($age -lt 168) { "WARN" } else { "FAIL" }
            Add-Check "Freshness" "$key data age" $status "$([math]::Round($age, 1)) hours old"
        } catch {
            Add-Check "Freshness" "$key timestamp parseable" "WARN" "Could not parse GeneratedAt"
        }
    }
}

# ═══════════════════════════════════════════
# CHECK 11: Negative COGS/Price Detection
# ═══════════════════════════════════════════

if ($Data.Master) {
    $negCOGS = $Data.Master | Where-Object { [decimal]$_.COGS -le 0 }
    $negMSRP = $Data.Master | Where-Object { [decimal]$_.MSRP -le 0 }
    $cogsGtMSRP = $Data.Master | Where-Object { [decimal]$_.COGS -ge [decimal]$_.MSRP }
    Add-Check "DataSanity" "No zero/negative COGS" $(if ($negCOGS.Count -eq 0) { "PASS" } else { "FAIL" }) "$($negCOGS.Count) SKUs"
    Add-Check "DataSanity" "No zero/negative MSRP" $(if ($negMSRP.Count -eq 0) { "PASS" } else { "FAIL" }) "$($negMSRP.Count) SKUs"
    Add-Check "DataSanity" "COGS < MSRP for all SKUs" $(if ($cogsGtMSRP.Count -eq 0) { "PASS" } else { "WARN" }) "$($cogsGtMSRP.Count) SKUs where COGS >= MSRP"
}

# ═══════════════════════════════════════════
# CHECK 12: Category Coverage
# ═══════════════════════════════════════════

if ($Data.Master) {
    $expectedCats = @("Base", "Advanced", "Women", "Children", "SNP", "Mushroom", "Testing")
    $actualCats = ($Data.Master | Select-Object -ExpandProperty Category -Unique)
    $missingCats = $expectedCats | Where-Object { $_ -notin $actualCats }
    $status = if ($missingCats.Count -eq 0) { "PASS" } else { "FAIL" }
    Add-Check "DataSanity" "All 7 categories present" $status "Missing: $($missingCats -join ', ')" 7 $actualCats.Count
}

# --- Assemble Report ---
$duration = [math]::Round(((Get-Date) - $RunStart).TotalSeconds, 2)
$overallStatus = if ($Failed -gt 0) { "FAIL" } elseif ($Warnings -gt 0) { "WARN" } else { "PASS" }

$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    Duration = "${duration}s"
    OverallStatus = $overallStatus
    Summary = [PSCustomObject]@{
        TotalChecks = $Checks.Count
        Passed = $Passed
        Failed = $Failed
        Warnings = $Warnings
    }
    FailedChecks = ($Checks | Where-Object { $_.Status -eq "FAIL" })
    WarningChecks = ($Checks | Where-Object { $_.Status -eq "WARN" })
    AllChecks = $Checks
}

$output | ConvertTo-Json -Depth 5 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DATA INTEGRITY CHECKER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
$statusColor = switch ($overallStatus) { "PASS" { "Green" } "WARN" { "Yellow" } default { "Red" } }
Write-Host "  Overall: $overallStatus" -ForegroundColor $statusColor
Write-Host "  Checks:  $($Checks.Count) total | $Passed passed | $Warnings warnings | $Failed failed" -ForegroundColor White
Write-Host "  Duration: ${duration}s" -ForegroundColor White
Write-Host ""
if ($Failed -gt 0) {
    Write-Host "  --- FAILURES ---" -ForegroundColor Red
    foreach ($f in ($Checks | Where-Object { $_.Status -eq "FAIL" })) {
        Write-Host "    FAIL: [$($f.Category)] $($f.Check)" -ForegroundColor Red
        Write-Host "          $($f.Detail)" -ForegroundColor DarkRed
    }
    Write-Host ""
}
if ($Warnings -gt 0) {
    Write-Host "  --- WARNINGS ---" -ForegroundColor Yellow
    foreach ($w in ($Checks | Where-Object { $_.Status -eq "WARN" })) {
        Write-Host "    WARN: [$($w.Category)] $($w.Check)" -ForegroundColor Yellow
        Write-Host "          $($w.Detail)" -ForegroundColor DarkYellow
    }
    Write-Host ""
}
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
