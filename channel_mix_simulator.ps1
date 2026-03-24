<# ================================================================
   FarmCeutica Channel Mix Revenue Simulator
   Input:  farmceutica_master_skus.json + channel_scenarios.json
   Output: channel_mix_results.json
   Simulates revenue, gross profit, and net margin across configurable
   channel mix scenarios with per-SKU unit volume assumptions.
   ================================================================ #>

param(
    [string]$MasterFile    = "./farmceutica_master_skus.json",
    [string]$ScenariosFile = "./channel_scenarios.json",
    [string]$OutputFile    = "./channel_mix_results.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json

# --- Default Scenarios (if no external file) ---
$DefaultScenarios = @(
    @{
        Name = "DTC Heavy"
        Description = "80% DTC, 15% Wholesale, 5% Distributor - direct-to-consumer focused"
        Mix = @{ DTC = 0.80; Wholesale = 0.15; Distributor = 0.05 }
    },
    @{
        Name = "Balanced"
        Description = "50% DTC, 30% Wholesale, 20% Distributor - diversified channel strategy"
        Mix = @{ DTC = 0.50; Wholesale = 0.30; Distributor = 0.20 }
    },
    @{
        Name = "Wholesale Push"
        Description = "25% DTC, 55% Wholesale, 20% Distributor - practitioner/retail expansion"
        Mix = @{ DTC = 0.25; Wholesale = 0.55; Distributor = 0.20 }
    },
    @{
        Name = "Distributor Scale"
        Description = "20% DTC, 30% Wholesale, 50% Distributor - mass market distribution"
        Mix = @{ DTC = 0.20; Wholesale = 0.30; Distributor = 0.50 }
    },
    @{
        Name = "Pure DTC"
        Description = "100% DTC, 0% Wholesale, 0% Distributor - maximum margin, no channel partners"
        Mix = @{ DTC = 1.00; Wholesale = 0.00; Distributor = 0.00 }
    }
)

# --- Monthly unit volume assumptions by category ---
$CategoryVolumes = @{
    Base     = 800
    Advanced = 400
    Women    = 300
    Children = 250
    SNP      = 150
    Mushroom = 350
    Testing  = 60
}

# --- Channel cost rates (from waterfall calculator) ---
$ChannelCosts = @{
    DTC = @{
        Fulfillment = 0.08; PaymentProcessing = 0.035; PlatformFees = 0.05
        MarketingCAC = 0.15; ReturnsChargebacks = 0.04; ChannelOverhead = 0.03
    }
    Wholesale = @{
        Fulfillment = 0.03; PaymentProcessing = 0.015; PlatformFees = 0.00
        MarketingCAC = 0.02; ReturnsChargebacks = 0.02; ChannelOverhead = 0.05
    }
    Distributor = @{
        Fulfillment = 0.02; PaymentProcessing = 0.01; PlatformFees = 0.00
        MarketingCAC = 0.00; ReturnsChargebacks = 0.01; ChannelOverhead = 0.03
    }
}

# Load external scenarios if available
if (Test-Path $ScenariosFile) {
    $ext = Get-Content $ScenariosFile | ConvertFrom-Json
    if ($ext.Scenarios) {
        $DefaultScenarios = @()
        foreach ($s in $ext.Scenarios) {
            $mix = @{}
            $s.Mix.PSObject.Properties | ForEach-Object { $mix[$_.Name] = [decimal]$_.Value }
            $DefaultScenarios += @{ Name = $s.Name; Description = $s.Description; Mix = $mix }
        }
    }
    if ($ext.CategoryVolumes) {
        $ext.CategoryVolumes.PSObject.Properties | ForEach-Object {
            $CategoryVolumes[$_.Name] = [int]$_.Value
        }
    }
}

# --- Simulate Each Scenario ---
$ScenarioResults = @()

foreach ($scenario in $DefaultScenarios) {
    $mix = $scenario.Mix
    $skuDetails = @()
    $scenarioTotals = @{
        TotalRevenue = [decimal]0; TotalCOGS = [decimal]0; TotalGrossProfit = [decimal]0
        TotalVariableCosts = [decimal]0; TotalNetProfit = [decimal]0; TotalUnits = 0
        ByChannel = @{
            DTC = @{ Revenue = [decimal]0; Units = 0; GrossProfit = [decimal]0; NetProfit = [decimal]0 }
            Wholesale = @{ Revenue = [decimal]0; Units = 0; GrossProfit = [decimal]0; NetProfit = [decimal]0 }
            Distributor = @{ Revenue = [decimal]0; Units = 0; GrossProfit = [decimal]0; NetProfit = [decimal]0 }
        }
        ByCategory = @{}
    }

    foreach ($sku in $Master) {
        $monthlyUnits = $CategoryVolumes[$sku.Category]
        if (-not $monthlyUnits) { $monthlyUnits = 200 }
        $cogs = [decimal]$sku.COGS

        $skuRevenue = [decimal]0; $skuCOGS = [decimal]0; $skuGross = [decimal]0
        $skuVarCosts = [decimal]0; $skuNet = [decimal]0
        $channelBreakdown = @{}

        foreach ($chanName in @("DTC", "Wholesale", "Distributor")) {
            $pct = [decimal]$mix[$chanName]
            $units = [math]::Round($monthlyUnits * $pct)
            if ($units -eq 0 -and $pct -gt 0) { $units = 1 }

            $price = switch ($chanName) {
                "DTC"         { [decimal]$sku.MSRP }
                "Wholesale"   { [decimal]$sku.Wholesale }
                "Distributor" { [decimal]$sku.Distributor }
            }

            $rev = [math]::Round($units * $price, 2)
            $cogsTot = [math]::Round($units * $cogs, 2)
            $gross = [math]::Round($rev - $cogsTot, 2)

            # Variable costs
            $rates = $ChannelCosts[$chanName]
            $varCost = [decimal]0
            foreach ($key in $rates.Keys) {
                $varCost += [math]::Round($rev * $rates[$key], 2)
            }
            $net = [math]::Round($gross - $varCost, 2)

            $channelBreakdown[$chanName] = [PSCustomObject]@{
                Units = $units; Revenue = $rev; COGS = $cogsTot
                GrossProfit = $gross; VariableCosts = [math]::Round($varCost, 2); NetProfit = $net
            }

            $skuRevenue += $rev; $skuCOGS += $cogsTot; $skuGross += $gross
            $skuVarCosts += $varCost; $skuNet += $net

            $scenarioTotals.ByChannel[$chanName].Revenue += $rev
            $scenarioTotals.ByChannel[$chanName].Units += $units
            $scenarioTotals.ByChannel[$chanName].GrossProfit += $gross
            $scenarioTotals.ByChannel[$chanName].NetProfit += $net
        }

        $totalUnits = ($channelBreakdown.Values | ForEach-Object { $_.Units } | Measure-Object -Sum).Sum
        $netMarginPct = if ($skuRevenue -gt 0) { [math]::Round(($skuNet / $skuRevenue) * 100, 1) } else { 0 }

        $skuDetails += [PSCustomObject]@{
            SKU = $sku.SKU; Name = $sku.Name; Category = $sku.Category
            MonthlyUnits = $totalUnits
            Revenue = [math]::Round($skuRevenue, 2)
            COGS = [math]::Round($skuCOGS, 2)
            GrossProfit = [math]::Round($skuGross, 2)
            VariableCosts = [math]::Round($skuVarCosts, 2)
            NetProfit = [math]::Round($skuNet, 2)
            NetMarginPct = $netMarginPct
            Channels = $channelBreakdown
        }

        $scenarioTotals.TotalRevenue += $skuRevenue
        $scenarioTotals.TotalCOGS += $skuCOGS
        $scenarioTotals.TotalGrossProfit += $skuGross
        $scenarioTotals.TotalVariableCosts += $skuVarCosts
        $scenarioTotals.TotalNetProfit += $skuNet
        $scenarioTotals.TotalUnits += $totalUnits

        # Category accumulator
        if (-not $scenarioTotals.ByCategory[$sku.Category]) {
            $scenarioTotals.ByCategory[$sku.Category] = @{
                Revenue = [decimal]0; COGS = [decimal]0; NetProfit = [decimal]0; Units = 0; SKUCount = 0
            }
        }
        $scenarioTotals.ByCategory[$sku.Category].Revenue += $skuRevenue
        $scenarioTotals.ByCategory[$sku.Category].COGS += $skuCOGS
        $scenarioTotals.ByCategory[$sku.Category].NetProfit += $skuNet
        $scenarioTotals.ByCategory[$sku.Category].Units += $totalUnits
        $scenarioTotals.ByCategory[$sku.Category].SKUCount += 1
    }

    # Build category summary
    $catSummary = @()
    foreach ($cat in ($scenarioTotals.ByCategory.Keys | Sort-Object)) {
        $c = $scenarioTotals.ByCategory[$cat]
        $catSummary += [PSCustomObject]@{
            Category = $cat
            SKUCount = $c.SKUCount
            MonthlyUnits = $c.Units
            Revenue = [math]::Round($c.Revenue, 2)
            COGS = [math]::Round($c.COGS, 2)
            NetProfit = [math]::Round($c.NetProfit, 2)
            NetMarginPct = if ($c.Revenue -gt 0) { [math]::Round(($c.NetProfit / $c.Revenue) * 100, 1) } else { 0 }
            RevenueShare = [math]::Round(($c.Revenue / $scenarioTotals.TotalRevenue) * 100, 1)
        }
    }

    # Build channel summary
    $chanSummary = @{}
    foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
        $cd = $scenarioTotals.ByChannel[$ch]
        $chanSummary[$ch] = [PSCustomObject]@{
            Units = $cd.Units
            Revenue = [math]::Round($cd.Revenue, 2)
            GrossProfit = [math]::Round($cd.GrossProfit, 2)
            NetProfit = [math]::Round($cd.NetProfit, 2)
            NetMarginPct = if ($cd.Revenue -gt 0) { [math]::Round(($cd.NetProfit / $cd.Revenue) * 100, 1) } else { 0 }
            RevenueShare = [math]::Round(($cd.Revenue / $scenarioTotals.TotalRevenue) * 100, 1)
        }
    }

    $blendedMargin = if ($scenarioTotals.TotalRevenue -gt 0) {
        [math]::Round(($scenarioTotals.TotalNetProfit / $scenarioTotals.TotalRevenue) * 100, 1)
    } else { 0 }

    $annualRevenue = [math]::Round($scenarioTotals.TotalRevenue * 12, 2)
    $annualNetProfit = [math]::Round($scenarioTotals.TotalNetProfit * 12, 2)

    # Top/bottom performers
    $sorted = $skuDetails | Sort-Object NetProfit -Descending
    $top5 = $sorted | Select-Object -First 5 | ForEach-Object {
        [PSCustomObject]@{ SKU = $_.SKU; Name = $_.Name; NetProfit = $_.NetProfit; NetMarginPct = $_.NetMarginPct }
    }
    $bottom5 = $sorted | Select-Object -Last 5 | ForEach-Object {
        [PSCustomObject]@{ SKU = $_.SKU; Name = $_.Name; NetProfit = $_.NetProfit; NetMarginPct = $_.NetMarginPct }
    }

    $ScenarioResults += [PSCustomObject]@{
        Scenario = $scenario.Name
        Description = $scenario.Description
        Mix = $mix
        Summary = [PSCustomObject]@{
            MonthlyUnits = $scenarioTotals.TotalUnits
            MonthlyRevenue = [math]::Round($scenarioTotals.TotalRevenue, 2)
            MonthlyCOGS = [math]::Round($scenarioTotals.TotalCOGS, 2)
            MonthlyGrossProfit = [math]::Round($scenarioTotals.TotalGrossProfit, 2)
            MonthlyVariableCosts = [math]::Round($scenarioTotals.TotalVariableCosts, 2)
            MonthlyNetProfit = [math]::Round($scenarioTotals.TotalNetProfit, 2)
            BlendedNetMarginPct = $blendedMargin
            AnnualRevenue = $annualRevenue
            AnnualNetProfit = $annualNetProfit
        }
        ChannelSummary = $chanSummary
        CategorySummary = $catSummary
        Top5Performers = $top5
        Bottom5Performers = $bottom5
        SKUDetails = $skuDetails
    }
}

# --- Scenario Comparison Matrix ---
$comparison = $ScenarioResults | ForEach-Object {
    [PSCustomObject]@{
        Scenario = $_.Scenario
        MonthlyRevenue = $_.Summary.MonthlyRevenue
        MonthlyNetProfit = $_.Summary.MonthlyNetProfit
        BlendedMargin = "$($_.Summary.BlendedNetMarginPct)%"
        AnnualRevenue = $_.Summary.AnnualRevenue
        AnnualNetProfit = $_.Summary.AnnualNetProfit
        DTCShare = "$($_.ChannelSummary.DTC.RevenueShare)%"
        WSShare = "$($_.ChannelSummary.Wholesale.RevenueShare)%"
        DistShare = "$($_.ChannelSummary.Distributor.RevenueShare)%"
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    CategoryVolumes = $CategoryVolumes
    ChannelCostRates = $ChannelCosts
    ScenarioComparison = $comparison
    Scenarios = $ScenarioResults
}

$output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile -Encoding UTF8

Write-Host "Simulated $($ScenarioResults.Count) scenarios across 62 SKUs." -ForegroundColor Green
Write-Host "─── Scenario Comparison ───" -ForegroundColor Cyan
foreach ($c in $comparison) {
    $rev = '{0:N0}' -f $c.AnnualRevenue
    $net = '{0:N0}' -f $c.AnnualNetProfit
    Write-Host "  $($c.Scenario.PadRight(20)) | Annual Rev: `$$rev | Net: `$$net | Margin: $($c.BlendedMargin)" -ForegroundColor White
}
Write-Host "Output: $OutputFile" -ForegroundColor Cyan
