<# ================================================================
   FarmCeutica Margin Waterfall Calculator
   Input:  farmceutica_master_skus.json + optional waterfall_assumptions.json
   Output: margin_waterfall.json
   Decomposes margin at each pricing tier (DTC, Wholesale, Distributor)
   into component cost layers — COGS, fulfillment, payment processing,
   platform fees, marketing/CAC, returns, and channel overhead.
   ================================================================ #>

param(
    [string]$MasterFile      = "./farmceutica_master_skus.json",
    [string]$AssumptionsFile = "./waterfall_assumptions.json",
    [string]$OutputFile      = "./margin_waterfall.json",
    [decimal]$AlertThreshold = 10.0
)

$ErrorActionPreference = "Stop"

# ─── Stage 1: Load Data & Build Assumptions ───

$Master = Get-Content $MasterFile | ConvertFrom-Json

# Default cost assumptions (% of channel revenue)
$DefaultAssumptions = @{
    DTC = @{
        Fulfillment        = 0.08
        PaymentProcessing  = 0.035
        PlatformFees       = 0.05
        MarketingCAC       = 0.15
        ReturnsChargebacks = 0.04
        ChannelOverhead    = 0.03
    }
    Wholesale = @{
        Fulfillment        = 0.03
        PaymentProcessing  = 0.015
        PlatformFees       = 0.00
        MarketingCAC       = 0.02
        ReturnsChargebacks = 0.02
        ChannelOverhead    = 0.05
    }
    Distributor = @{
        Fulfillment        = 0.02
        PaymentProcessing  = 0.01
        PlatformFees       = 0.00
        MarketingCAC       = 0.00
        ReturnsChargebacks = 0.01
        ChannelOverhead    = 0.03
    }
}

# Category-level overrides (Testing has different cost profile)
$CategoryOverrides = @{
    Testing = @{
        DTC = @{
            Fulfillment        = 0.05
            MarketingCAC       = 0.10
            ReturnsChargebacks = 0.02
        }
    }
}

# Load external assumptions file if it exists, merging over defaults
if (Test-Path $AssumptionsFile) {
    $extAssumptions = Get-Content $AssumptionsFile | ConvertFrom-Json
    if ($extAssumptions.Global) {
        foreach ($channel in @("DTC", "Wholesale", "Distributor")) {
            $chanObj = $extAssumptions.Global | Select-Object -ExpandProperty $channel -ErrorAction SilentlyContinue
            if ($chanObj) {
                $chanObj.PSObject.Properties | ForEach-Object {
                    $DefaultAssumptions[$channel][$_.Name] = [decimal]$_.Value
                }
            }
        }
    }
    if ($extAssumptions.CategoryOverrides) {
        $extAssumptions.CategoryOverrides.PSObject.Properties | ForEach-Object {
            $catName = $_.Name
            if (-not $CategoryOverrides[$catName]) { $CategoryOverrides[$catName] = @{} }
            $_.Value.PSObject.Properties | ForEach-Object {
                $chanName = $_.Name
                if (-not $CategoryOverrides[$catName][$chanName]) { $CategoryOverrides[$catName][$chanName] = @{} }
                $_.Value.PSObject.Properties | ForEach-Object {
                    $CategoryOverrides[$catName][$chanName][$_.Name] = [decimal]$_.Value
                }
            }
        }
    }
}

# Resolve assumptions per category: merge overrides onto global defaults
function Get-ResolvedRates([string]$Category, [string]$Channel) {
    $rates = @{}
    foreach ($key in $DefaultAssumptions[$Channel].Keys) {
        $rates[$key] = $DefaultAssumptions[$Channel][$key]
    }
    if ($CategoryOverrides[$Category] -and $CategoryOverrides[$Category][$Channel]) {
        foreach ($key in $CategoryOverrides[$Category][$Channel].Keys) {
            $rates[$key] = $CategoryOverrides[$Category][$Channel][$key]
        }
    }
    return $rates
}

# ─── Stage 2 & 3: Per-SKU Waterfall Calculation ───

$LayerOrder = @("COGS", "Fulfillment", "PaymentProcessing", "PlatformFees", "MarketingCAC", "ReturnsChargebacks", "ChannelOverhead")

$SKUResults = @()
$AllAlerts = @()

foreach ($sku in $Master) {
    $channels = @{}
    $lowestPct = [decimal]::MaxValue
    $lowestChan = ""

    foreach ($chanDef in @(
        @{ Name = "DTC";         Revenue = [decimal]$sku.MSRP },
        @{ Name = "Wholesale";   Revenue = [decimal]$sku.Wholesale },
        @{ Name = "Distributor"; Revenue = [decimal]$sku.Distributor }
    )) {
        $chanName = $chanDef.Name
        $revenue = $chanDef.Revenue
        $rates = Get-ResolvedRates -Category $sku.Category -Channel $chanName
        $cogs = [decimal]$sku.COGS

        $waterfall = @()
        $totalDeducted = [decimal]0

        foreach ($layer in $LayerOrder) {
            if ($layer -eq "COGS") {
                $amount = $cogs
            } else {
                $amount = [math]::Round($revenue * $rates[$layer], 2)
            }
            $totalDeducted += $amount
            $cumMargin = [math]::Round($revenue - $totalDeducted, 2)
            $marginPct = if ($revenue -gt 0) { [math]::Round(($cumMargin / $revenue) * 100, 1) } else { 0 }

            $waterfall += [PSCustomObject]@{
                Layer            = $layer
                Amount           = $amount
                CumulativeMargin = $cumMargin
                MarginPct        = $marginPct
            }
        }

        $netMargin = [math]::Round($revenue - $totalDeducted, 2)
        $netMarginPct = if ($revenue -gt 0) { [math]::Round(($netMargin / $revenue) * 100, 1) } else { 0 }

        $channels[$chanName] = [PSCustomObject]@{
            Revenue       = $revenue
            Waterfall     = $waterfall
            NetMargin     = $netMargin
            NetMarginPct  = $netMarginPct
        }

        if ($netMarginPct -lt $lowestPct) {
            $lowestPct = $netMarginPct
            $lowestChan = $chanName
        }

        if ($netMarginPct -lt $AlertThreshold) {
            $AllAlerts += [PSCustomObject]@{
                SKU           = $sku.SKU
                Name          = $sku.Name
                Category      = $sku.Category
                Channel       = $chanName
                Revenue       = $revenue
                NetMargin     = $netMargin
                NetMarginPct  = $netMarginPct
            }
        }
    }

    $flag = if ($lowestPct -lt $AlertThreshold) { "ALERT" } else { "OK" }

    $SKUResults += [PSCustomObject]@{
        SKU                = $sku.SKU
        Name               = $sku.Name
        Category           = $sku.Category
        Channels           = $channels
        LowestNetMarginPct = $lowestPct
        LowestChannel      = $lowestChan
        FLAG               = $flag
    }
}

# ─── Stage 4: Category Rollup Summary ───

$Categories = $SKUResults | Group-Object -Property Category
$CategorySummary = @()

foreach ($group in $Categories) {
    $catSummary = @{ Category = $group.Name; SKUCount = $group.Count; FlaggedCount = ($group.Group | Where-Object { $_.FLAG -eq "ALERT" }).Count }

    foreach ($chanName in @("DTC", "Wholesale", "Distributor")) {
        $margins = $group.Group | ForEach-Object { $_.Channels.$chanName.NetMarginPct }
        $revenues = $group.Group | ForEach-Object { $_.Channels.$chanName.Revenue }
        $minPct = ($margins | Measure-Object -Minimum).Minimum
        $minSKU = ($group.Group | Sort-Object { $_.Channels.$chanName.NetMarginPct } | Select-Object -First 1).SKU

        $catSummary[$chanName] = [PSCustomObject]@{
            AvgRevenue      = [math]::Round(($revenues | Measure-Object -Average).Average, 2)
            AvgNetMarginPct = [math]::Round(($margins | Measure-Object -Average).Average, 1)
            MinNetMarginPct = $minPct
            MinSKU          = $minSKU
        }
    }

    $CategorySummary += [PSCustomObject]$catSummary
}

# ─── Stage 5: Assemble & Write Output ───

# Build serializable assumptions object
$assumptionsOutput = @{}
foreach ($chan in @("DTC", "Wholesale", "Distributor")) {
    $assumptionsOutput[$chan] = @{}
    foreach ($key in $DefaultAssumptions[$chan].Keys) {
        $assumptionsOutput[$chan][$key] = $DefaultAssumptions[$chan][$key]
    }
}

$output = [PSCustomObject]@{
    GeneratedAt     = (Get-Date -Format "o")
    AlertThreshold  = $AlertThreshold
    Assumptions     = $assumptionsOutput
    SKUs            = $SKUResults
    CategorySummary = $CategorySummary
    Alerts          = $AllAlerts
}

$output | ConvertTo-Json -Depth 8 | Set-Content $OutputFile -Encoding UTF8

$alertCount = $AllAlerts.Count
$flaggedSKUs = ($SKUResults | Where-Object { $_.FLAG -eq "ALERT" }).Count
Write-Host "Margin waterfall calculated for $($SKUResults.Count) SKUs across 3 channels." -ForegroundColor Green
Write-Host "Alerts: $flaggedSKUs SKUs ($alertCount channel-level) below $AlertThreshold% net margin." -ForegroundColor Yellow
Write-Host "Output: $OutputFile" -ForegroundColor Cyan
