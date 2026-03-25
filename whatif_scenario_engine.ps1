<# ================================================================
   FarmCeutica Scenario What-If Engine
   Input:  farmceutica_master_skus.json + whatif_scenarios.json
   Output: whatif_results.json
   Models portfolio-wide impact of hypothetical changes across
   pricing, COGS, channel mix, SKU additions/removals, and
   volume shifts. Compares each scenario against the baseline.
   ================================================================ #>

param(
    [string]$MasterFile    = "./farmceutica_master_skus.json",
    [string]$ScenariosFile = "./whatif_scenarios.json",
    [string]$OutputFile    = "./whatif_results.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json

# --- Baseline Channel Mix (Balanced) ---
$BaselineMix = @{ DTC = 0.50; Wholesale = 0.30; Distributor = 0.20 }
$BaselineVolumes = @{
    Base = 800; Advanced = 400; Women = 300; Children = 250
    SNP = 150; Mushroom = 350; Testing = 60
}
$ChannelCosts = @{
    DTC = 0.385; Wholesale = 0.135; Distributor = 0.07
}

# --- Built-in What-If Scenarios ---
$DefaultScenarios = @(
    @{
        Name = "COGS +15% Across Board"
        Type = "COGS_SHIFT"
        Description = "Raw material costs increase 15% due to supply chain disruption"
        Adjustments = @{ COGSMultiplier = 1.15; ApplyTo = "ALL" }
    },
    @{
        Name = "COGS +25% SNP Only"
        Type = "COGS_SHIFT"
        Description = "Specialty SNP ingredient costs spike 25%"
        Adjustments = @{ COGSMultiplier = 1.25; ApplyTo = "SNP" }
    },
    @{
        Name = "Drop All Testing SKUs"
        Type = "SKU_REMOVAL"
        Description = "Discontinue entire Testing category (6 SKUs)"
        Adjustments = @{ RemoveCategories = @("Testing") }
    },
    @{
        Name = "Drop Sunset + Watch SKUs"
        Type = "SKU_REMOVAL"
        Description = "Remove EpiGenDX (Sunset) and 4 Watch-tier SKUs"
        Adjustments = @{ RemoveSKUs = @("57", "58", "59", "60", "62") }
    },
    @{
        Name = "MSRP +10% All Products"
        Type = "PRICE_CHANGE"
        Description = "Across-the-board 10% price increase"
        Adjustments = @{ MSRPMultiplier = 1.10; ApplyTo = "ALL" }
    },
    @{
        Name = "MSRP +20% Testing Only"
        Type = "PRICE_CHANGE"
        Description = "Aggressive repricing of Testing category"
        Adjustments = @{ MSRPMultiplier = 1.20; ApplyTo = "Testing" }
    },
    @{
        Name = "Pivot to 90% DTC"
        Type = "CHANNEL_SHIFT"
        Description = "Shift heavily to direct-to-consumer, minimize wholesale/distributor"
        Adjustments = @{ Mix = @{ DTC = 0.90; Wholesale = 0.08; Distributor = 0.02 } }
    },
    @{
        Name = "Wholesale Expansion"
        Type = "CHANNEL_SHIFT"
        Description = "Expand into practitioner wholesale channel aggressively"
        Adjustments = @{ Mix = @{ DTC = 0.35; Wholesale = 0.50; Distributor = 0.15 } }
    },
    @{
        Name = "Volume +50% Star SKUs"
        Type = "VOLUME_SHIFT"
        Description = "Double down on marketing for Star-tier products"
        Adjustments = @{ VolumeMultiplier = 1.50; ApplyTo = "Star" }
    },
    @{
        Name = "Recession: Volume -30%"
        Type = "VOLUME_SHIFT"
        Description = "Economic downturn reduces demand 30% across all products"
        Adjustments = @{ VolumeMultiplier = 0.70; ApplyTo = "ALL" }
    },
    @{
        Name = "Best Case Combo"
        Type = "COMBINED"
        Description = "Price +8%, COGS -5%, volume +20%, shift to 70% DTC"
        Adjustments = @{
            MSRPMultiplier = 1.08; COGSMultiplier = 0.95
            VolumeMultiplier = 1.20; ApplyTo = "ALL"
            Mix = @{ DTC = 0.70; Wholesale = 0.20; Distributor = 0.10 }
        }
    },
    @{
        Name = "Worst Case Combo"
        Type = "COMBINED"
        Description = "COGS +20%, volume -25%, forced into distributor-heavy mix"
        Adjustments = @{
            COGSMultiplier = 1.20; VolumeMultiplier = 0.75; ApplyTo = "ALL"
            Mix = @{ DTC = 0.25; Wholesale = 0.25; Distributor = 0.50 }
        }
    }
)

# --- Load external scenarios if present ---
if (Test-Path $ScenariosFile) {
    $ext = Get-Content $ScenariosFile | ConvertFrom-Json
    if ($ext.Scenarios) {
        foreach ($s in $ext.Scenarios) {
            $adj = @{}
            $s.Adjustments.PSObject.Properties | ForEach-Object {
                if ($_.Value -is [PSCustomObject]) {
                    $inner = @{}; $_.Value.PSObject.Properties | ForEach-Object { $inner[$_.Name] = $_.Value }
                    $adj[$_.Name] = $inner
                } else { $adj[$_.Name] = $_.Value }
            }
            $DefaultScenarios += @{ Name = $s.Name; Type = $s.Type; Description = $s.Description; Adjustments = $adj }
        }
    }
}

# --- Star SKU lookup (for volume targeting) ---
$StarSKUs = @{}
$RatFile = "./sku_rationalization.json"
if (Test-Path $RatFile) {
    $ratData = Get-Content $RatFile | ConvertFrom-Json
    foreach ($s in $ratData.SKUs) { $StarSKUs[$s.SKU] = $s.Tier }
}

# --- Calculate Baseline ---
function Calc-Portfolio($skus, $mix, $volumes, $label) {
    $totalRev = [decimal]0; $totalCOGS = [decimal]0; $totalNet = [decimal]0
    $totalUnits = 0; $catResults = @{}

    foreach ($sku in $skus) {
        $cat = $sku.Category
        $monthlyUnits = if ($volumes[$cat]) { [int]$volumes[$cat] } else { 200 }
        $cogs = [decimal]$sku._COGS
        $msrp = [decimal]$sku._MSRP
        $ws = [math]::Round($msrp * 0.50, 2)
        $dist = [math]::Round($msrp * 0.30, 2)

        $skuRev = [decimal]0; $skuCOGS = [decimal]0; $skuNet = [decimal]0
        foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
            $pct = [decimal]$mix[$ch]
            $units = [math]::Round($monthlyUnits * $pct)
            $price = switch ($ch) { "DTC" { $msrp } "Wholesale" { $ws } "Distributor" { $dist } }
            $rev = $units * $price
            $cogsTot = $units * $cogs
            $varCost = $rev * $ChannelCosts[$ch]
            $net = $rev - $cogsTot - $varCost
            $skuRev += $rev; $skuCOGS += $cogsTot; $skuNet += $net
            $totalUnits += $units
        }
        $totalRev += $skuRev; $totalCOGS += $skuCOGS; $totalNet += $skuNet

        if (-not $catResults[$cat]) { $catResults[$cat] = @{ Rev = [decimal]0; Net = [decimal]0; SKUs = 0 } }
        $catResults[$cat].Rev += $skuRev; $catResults[$cat].Net += $skuNet; $catResults[$cat].SKUs++
    }

    $grossMargin = if ($totalRev -gt 0) { [math]::Round((($totalRev - $totalCOGS) / $totalRev) * 100, 1) } else { 0 }
    $netMargin = if ($totalRev -gt 0) { [math]::Round(($totalNet / $totalRev) * 100, 1) } else { 0 }

    $catSummary = @()
    foreach ($key in ($catResults.Keys | Sort-Object)) {
        $c = $catResults[$key]
        $catSummary += [PSCustomObject]@{
            Category = $key; SKUs = $c.SKUs
            MonthlyRevenue = [math]::Round($c.Rev, 2)
            MonthlyNetProfit = [math]::Round($c.Net, 2)
        }
    }

    return [PSCustomObject]@{
        Label = $label; SKUCount = $skus.Count; MonthlyUnits = $totalUnits
        MonthlyRevenue = [math]::Round($totalRev, 2)
        MonthlyCOGS = [math]::Round($totalCOGS, 2)
        MonthlyNetProfit = [math]::Round($totalNet, 2)
        GrossMarginPct = $grossMargin; NetMarginPct = $netMargin
        AnnualRevenue = [math]::Round($totalRev * 12, 2)
        AnnualNetProfit = [math]::Round($totalNet * 12, 2)
        Categories = $catSummary
    }
}

# --- Prepare working copies with mutable fields ---
function Clone-SKUs($source) {
    $clones = @()
    foreach ($s in $source) {
        $c = $s.PSObject.Copy()
        $c | Add-Member -NotePropertyName _MSRP -NotePropertyValue ([decimal]$s.MSRP) -Force
        $c | Add-Member -NotePropertyName _COGS -NotePropertyValue ([decimal]$s.COGS) -Force
        $clones += $c
    }
    return $clones
}

# --- Compute Baseline ---
$baselineSKUs = Clone-SKUs $Master
$Baseline = Calc-Portfolio $baselineSKUs $BaselineMix $BaselineVolumes "Baseline (Balanced)"

# --- Run Each Scenario ---
$ScenarioResults = @()

foreach ($scenario in $DefaultScenarios) {
    $adj = $scenario.Adjustments
    $workingSKUs = Clone-SKUs $Master
    $workingMix = @{}; foreach ($k in @($BaselineMix.Keys)) { $workingMix[$k] = $BaselineMix[$k] }
    $workingVols = @{}; foreach ($k in @($BaselineVolumes.Keys)) { $workingVols[$k] = $BaselineVolumes[$k] }

    # Apply COGS multiplier
    if ($adj.COGSMultiplier) {
        $mult = [decimal]$adj.COGSMultiplier
        $target = if ($adj.ApplyTo -and $adj.ApplyTo -ne "ALL" -and $adj.ApplyTo -ne "Star") { $adj.ApplyTo } else { $null }
        foreach ($s in $workingSKUs) {
            $apply = if (-not $target) { $true } else { $s.Category -eq $target }
            if ($apply) { $s._COGS = [math]::Round($s._COGS * $mult, 2) }
        }
    }

    # Apply MSRP multiplier
    if ($adj.MSRPMultiplier) {
        $mult = [decimal]$adj.MSRPMultiplier
        $target = if ($adj.ApplyTo -and $adj.ApplyTo -ne "ALL" -and $adj.ApplyTo -ne "Star") { $adj.ApplyTo } else { $null }
        foreach ($s in $workingSKUs) {
            $apply = if (-not $target) { $true } else { $s.Category -eq $target }
            if ($apply) { $s._MSRP = [math]::Round($s._MSRP * $mult, 2) }
        }
    }

    # Remove categories
    if ($adj.RemoveCategories) {
        $workingSKUs = $workingSKUs | Where-Object { $_.Category -notin $adj.RemoveCategories }
    }

    # Remove specific SKUs
    if ($adj.RemoveSKUs) {
        $workingSKUs = $workingSKUs | Where-Object { $_.SKU -notin $adj.RemoveSKUs }
    }

    # Channel mix override
    if ($adj.Mix) {
        if ($adj.Mix -is [hashtable]) { foreach ($mk in @($adj.Mix.Keys)) { $workingMix[$mk] = [decimal]$adj.Mix[$mk] } }
        else { $adj.Mix.PSObject.Properties | ForEach-Object { $workingMix[$_.Name] = [decimal]$_.Value } }
    }

    # Volume multiplier
    if ($adj.VolumeMultiplier) {
        $mult = [decimal]$adj.VolumeMultiplier
        $applyTo = $adj.ApplyTo
        if ($applyTo -eq "ALL") {
            foreach ($vk in @($workingVols.Keys)) { $workingVols[$vk] = [math]::Round($workingVols[$vk] * $mult) }
        } elseif ($applyTo -eq "Star") {
            # Boost only star SKU categories proportionally - simplified: boost all cats that have stars
            $starCats = @()
            foreach ($s in $workingSKUs) { if ($StarSKUs[$s.SKU] -eq "Star" -and $s.Category -notin $starCats) { $starCats += $s.Category } }
            foreach ($cat in $starCats) { $workingVols[$cat] = [math]::Round($workingVols[$cat] * $mult) }
        } elseif ($workingVols.ContainsKey($applyTo)) {
            $workingVols[$applyTo] = [math]::Round($workingVols[$applyTo] * $mult)
        }
    }

    $result = Calc-Portfolio $workingSKUs $workingMix $workingVols $scenario.Name

    # Delta vs baseline
    $revDelta = [math]::Round($result.AnnualRevenue - $Baseline.AnnualRevenue, 2)
    $netDelta = [math]::Round($result.AnnualNetProfit - $Baseline.AnnualNetProfit, 2)
    $revDeltaPct = if ($Baseline.AnnualRevenue -gt 0) { [math]::Round(($revDelta / $Baseline.AnnualRevenue) * 100, 1) } else { 0 }
    $netDeltaPct = if ($Baseline.AnnualNetProfit -gt 0) { [math]::Round(($netDelta / $Baseline.AnnualNetProfit) * 100, 1) } else { 0 }
    $marginDelta = [math]::Round($result.NetMarginPct - $Baseline.NetMarginPct, 1)

    $impact = if ($netDelta -gt 0 -and $marginDelta -ge 0) { "POSITIVE" }
              elseif ($netDelta -lt 0 -and $marginDelta -lt 0) { "NEGATIVE" }
              else { "MIXED" }

    $ScenarioResults += [PSCustomObject]@{
        Scenario = $scenario.Name
        Type = $scenario.Type
        Description = $scenario.Description
        Impact = $impact
        Result = $result
        VsBaseline = [PSCustomObject]@{
            RevenueChange = $revDelta
            RevenueChangePct = "$revDeltaPct%"
            NetProfitChange = $netDelta
            NetProfitChangePct = "$netDeltaPct%"
            MarginChange = "${marginDelta}pp"
        }
    }
}

# --- Comparison Matrix ---
$matrix = @()
$matrix += [PSCustomObject]@{
    Scenario = "BASELINE"; Impact = "-"
    AnnualRevenue = $Baseline.AnnualRevenue; AnnualNetProfit = $Baseline.AnnualNetProfit
    NetMarginPct = "$($Baseline.NetMarginPct)%"; SKUs = $Baseline.SKUCount
    RevDelta = "-"; NetDelta = "-"
}
foreach ($s in $ScenarioResults) {
    $matrix += [PSCustomObject]@{
        Scenario = $s.Scenario; Impact = $s.Impact
        AnnualRevenue = $s.Result.AnnualRevenue; AnnualNetProfit = $s.Result.AnnualNetProfit
        NetMarginPct = "$($s.Result.NetMarginPct)%"; SKUs = $s.Result.SKUCount
        RevDelta = $s.VsBaseline.RevenueChangePct; NetDelta = $s.VsBaseline.NetProfitChangePct
    }
}

# Best and worst scenarios
$best = $ScenarioResults | Sort-Object { [decimal]$_.Result.AnnualNetProfit } -Descending | Select-Object -First 1
$worst = $ScenarioResults | Sort-Object { [decimal]$_.Result.AnnualNetProfit } | Select-Object -First 1

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    ScenariosModeled = $ScenarioResults.Count
    Baseline = $Baseline
    ComparisonMatrix = $matrix
    BestCase = [PSCustomObject]@{
        Scenario = $best.Scenario; AnnualNetProfit = $best.Result.AnnualNetProfit
        NetMarginPct = $best.Result.NetMarginPct; UpsideVsBaseline = $best.VsBaseline.NetProfitChangePct
    }
    WorstCase = [PSCustomObject]@{
        Scenario = $worst.Scenario; AnnualNetProfit = $worst.Result.AnnualNetProfit
        NetMarginPct = $worst.Result.NetMarginPct; DownsideVsBaseline = $worst.VsBaseline.NetProfitChangePct
    }
    Scenarios = $ScenarioResults
}

$output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  WHAT-IF SCENARIO ENGINE" -ForegroundColor Cyan
Write-Host "  $($ScenarioResults.Count) scenarios vs baseline" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
$baseFmt = '{0:N0}' -f $Baseline.AnnualNetProfit
Write-Host "  Baseline: `$$baseFmt net profit ($($Baseline.NetMarginPct)% margin)" -ForegroundColor White
Write-Host ""
foreach ($s in $ScenarioResults) {
    $netFmt = '{0:N0}' -f $s.Result.AnnualNetProfit
    $color = switch ($s.Impact) { "POSITIVE" { "Green" } "NEGATIVE" { "Red" } default { "Yellow" } }
    $arrow = switch ($s.Impact) { "POSITIVE" { "+" } "NEGATIVE" { "" } default { "~" } }
    Write-Host "  $($s.Scenario.PadRight(30)) `$$netFmt  ${arrow}$($s.VsBaseline.NetProfitChangePct)  [$($s.Impact)]" -ForegroundColor $color
}
Write-Host ""
Write-Host "  Best:  $($best.Scenario) ($($best.VsBaseline.NetProfitChangePct) net profit)" -ForegroundColor Green
Write-Host "  Worst: $($worst.Scenario) ($($worst.VsBaseline.NetProfitChangePct) net profit)" -ForegroundColor Red
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
