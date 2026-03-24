<# ================================================================
   FarmCeutica Breakeven & Unit Economics Analyzer
   Input:  farmceutica_master_skus.json, margin_waterfall.json,
           sku_rationalization.json
   Output: unit_economics.json
   Calculates per-SKU breakeven volumes, CAC payback periods,
   contribution margin, customer LTV, and unit-level profitability
   across all three channels.
   ================================================================ #>

param(
    [string]$MasterFile         = "./farmceutica_master_skus.json",
    [string]$WaterfallFile      = "./margin_waterfall.json",
    [string]$RationalizationFile = "./sku_rationalization.json",
    [string]$OutputFile         = "./unit_economics.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json
$Waterfall = Get-Content $WaterfallFile | ConvertFrom-Json
$Rational = Get-Content $RationalizationFile | ConvertFrom-Json

# --- Assumptions ---
$Assumptions = @{
    # Customer acquisition cost by channel
    CAC = @{
        DTC         = 45.00   # Paid social/search average
        Wholesale   = 12.00   # Broker/rep cost per new account amortized
        Distributor = 5.00    # Minimal - distributor does the selling
    }
    # Average orders per customer per year by channel
    OrderFrequency = @{
        DTC         = 6.0     # Subscription-driven, bimonthly
        Wholesale   = 12.0    # Monthly reorders from practitioners
        Distributor = 12.0    # Monthly shelf replenishment
    }
    # Customer retention rate (annual)
    RetentionRate = @{
        DTC         = 0.55    # 55% year-over-year
        Wholesale   = 0.75    # Sticky practitioner relationships
        Distributor = 0.80    # Contract-based
    }
    # Average customer lifespan in years (derived from retention)
    # Lifespan = 1 / (1 - retention)
    # Fixed monthly overhead allocated per SKU
    FixedOverheadPerSKU = 850   # Warehouse, insurance, regulatory per SKU/month
    # Units per order assumption
    UnitsPerOrder = @{
        DTC         = 1.2
        Wholesale   = 24      # Case quantities
        Distributor = 48      # Pallet quantities
    }
}

# --- Build Waterfall Lookup ---
$WFLookup = @{}
foreach ($s in $Waterfall.SKUs) {
    $WFLookup[$s.SKU] = @{}
    foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
        $wf = $s.Channels.$ch
        $WFLookup[$s.SKU][$ch] = @{
            Revenue = [decimal]$wf.Revenue
            NetMargin = [decimal]$wf.NetMargin
            NetMarginPct = [decimal]$wf.NetMarginPct
            Waterfall = $wf.Waterfall
        }
    }
}

# --- Tier Lookup ---
$TierLookup = @{}
foreach ($s in $Rational.SKUs) { $TierLookup[$s.SKU] = $s.Tier }

# --- Calculate Unit Economics Per SKU ---
$Results = @()

foreach ($sku in $Master) {
    $skuId = $sku.SKU
    $cogs = [decimal]$sku.COGS
    $tier = $TierLookup[$skuId]
    $channelEcon = @{}

    foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
        $price = switch ($ch) {
            "DTC"         { [decimal]$sku.MSRP }
            "Wholesale"   { [decimal]$sku.Wholesale }
            "Distributor" { [decimal]$sku.Distributor }
        }

        $cac = [decimal]$Assumptions.CAC[$ch]
        $orderFreq = [decimal]$Assumptions.OrderFrequency[$ch]
        $retention = [decimal]$Assumptions.RetentionRate[$ch]
        $unitsPerOrder = [decimal]$Assumptions.UnitsPerOrder[$ch]
        $customerLifespan = if ($retention -lt 1) { [math]::Round(1 / (1 - $retention), 1) } else { 10 }

        # Contribution margin per unit (price - COGS - variable costs from waterfall)
        $wfData = $WFLookup[$skuId][$ch]
        $varCostPerUnit = [decimal]0
        if ($wfData -and $wfData.Waterfall) {
            foreach ($layer in $wfData.Waterfall) {
                if ($layer.Layer -ne "COGS") {
                    $varCostPerUnit += [decimal]$layer.Amount
                }
            }
        }
        $contributionMargin = [math]::Round($price - $cogs - $varCostPerUnit, 2)
        $contributionMarginPct = if ($price -gt 0) { [math]::Round(($contributionMargin / $price) * 100, 1) } else { 0 }

        # Revenue per order
        $revenuePerOrder = [math]::Round($price * $unitsPerOrder, 2)
        $profitPerOrder = [math]::Round($contributionMargin * $unitsPerOrder, 2)

        # Annual revenue per customer
        $annualRevenuePerCustomer = [math]::Round($revenuePerOrder * $orderFreq, 2)
        $annualProfitPerCustomer = [math]::Round($profitPerOrder * $orderFreq, 2)

        # Customer Lifetime Value
        $ltv = [math]::Round($annualProfitPerCustomer * $customerLifespan, 2)
        $ltvToCAC = if ($cac -gt 0) { [math]::Round($ltv / $cac, 1) } else { 999 }

        # CAC Payback (months)
        $monthlyProfit = $annualProfitPerCustomer / 12
        $cacPaybackMonths = if ($monthlyProfit -gt 0) { [math]::Round($cac / $monthlyProfit, 1) } else { 999 }

        # Breakeven units per month (to cover fixed overhead)
        $breakevenUnits = if ($contributionMargin -gt 0) {
            [math]::Ceiling($Assumptions.FixedOverheadPerSKU / $contributionMargin)
        } else { 999999 }

        # Breakeven revenue
        $breakevenRevenue = [math]::Round($breakevenUnits * $price, 2)

        # Unit economics health flag
        $flag = if ($contributionMargin -le 0) { "NEGATIVE_MARGIN" }
                elseif ($cacPaybackMonths -gt 12) { "SLOW_PAYBACK" }
                elseif ($ltvToCAC -lt 3) { "LOW_LTV_CAC" }
                elseif ($ltvToCAC -ge 5 -and $cacPaybackMonths -le 3) { "EXCELLENT" }
                elseif ($ltvToCAC -ge 3) { "HEALTHY" }
                else { "MARGINAL" }

        $channelEcon[$ch] = [PSCustomObject]@{
            Price = $price
            COGS = $cogs
            VariableCostsPerUnit = [math]::Round($varCostPerUnit, 2)
            ContributionMargin = $contributionMargin
            ContributionMarginPct = $contributionMarginPct
            CAC = $cac
            OrderFrequency = $orderFreq
            UnitsPerOrder = $unitsPerOrder
            RevenuePerOrder = $revenuePerOrder
            ProfitPerOrder = $profitPerOrder
            AnnualRevenuePerCustomer = $annualRevenuePerCustomer
            AnnualProfitPerCustomer = $annualProfitPerCustomer
            CustomerLifespanYears = $customerLifespan
            LTV = $ltv
            LTVtoCACRatio = $ltvToCAC
            CACPaybackMonths = $cacPaybackMonths
            BreakevenUnitsPerMonth = $breakevenUnits
            BreakevenRevenue = $breakevenRevenue
            Flag = $flag
        }
    }

    # Best channel for this SKU
    $bestChannel = ($channelEcon.Keys | Sort-Object { $channelEcon[$_].LTVtoCACRatio } -Descending | Select-Object -First 1)

    $Results += [PSCustomObject]@{
        SKU = $skuId
        Name = $sku.Name
        Category = $sku.Category
        Tier = $tier
        MSRP = [decimal]$sku.MSRP
        COGS = $cogs
        BestChannel = $bestChannel
        BestLTVtoCAC = $channelEcon[$bestChannel].LTVtoCACRatio
        Channels = $channelEcon
    }
}

# --- Portfolio Unit Economics Summary ---
$flagCounts = @{ EXCELLENT = 0; HEALTHY = 0; MARGINAL = 0; LOW_LTV_CAC = 0; SLOW_PAYBACK = 0; NEGATIVE_MARGIN = 0 }
foreach ($r in $Results) {
    foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
        $f = $r.Channels[$ch].Flag
        if ($flagCounts.ContainsKey($f)) { $flagCounts[$f]++ }
    }
}

# Channel-level averages
$channelAvgs = @{}
foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
    $cms = $Results | ForEach-Object { $_.Channels[$ch].ContributionMarginPct }
    $ltvs = $Results | ForEach-Object { $_.Channels[$ch].LTV }
    $ratios = $Results | ForEach-Object { $_.Channels[$ch].LTVtoCACRatio }
    $paybacks = $Results | Where-Object { $_.Channels[$ch].CACPaybackMonths -lt 999 } | ForEach-Object { $_.Channels[$ch].CACPaybackMonths }
    $channelAvgs[$ch] = [PSCustomObject]@{
        AvgContributionMarginPct = [math]::Round(($cms | Measure-Object -Average).Average, 1)
        AvgLTV = [math]::Round(($ltvs | Measure-Object -Average).Average, 2)
        AvgLTVtoCAC = [math]::Round(($ratios | Measure-Object -Average).Average, 1)
        AvgCACPaybackMonths = [math]::Round(($paybacks | Measure-Object -Average).Average, 1)
        MedianCACPaybackMonths = [math]::Round(($paybacks | Sort-Object)[[math]::Floor($paybacks.Count / 2)], 1)
    }
}

# Category averages (DTC focus)
$categoryAvgs = $Results | Group-Object Category | ForEach-Object {
    $dtcLtvs = $_.Group | ForEach-Object { $_.Channels.DTC.LTV }
    $dtcCMs = $_.Group | ForEach-Object { $_.Channels.DTC.ContributionMarginPct }
    $dtcPaybacks = $_.Group | ForEach-Object { $_.Channels.DTC.CACPaybackMonths }
    [PSCustomObject]@{
        Category = $_.Name
        SKUCount = $_.Count
        AvgDTCContributionMargin = [math]::Round(($dtcCMs | Measure-Object -Average).Average, 1)
        AvgDTCLTV = [math]::Round(($dtcLtvs | Measure-Object -Average).Average, 2)
        AvgDTCCACPayback = [math]::Round(($dtcPaybacks | Measure-Object -Average).Average, 1)
    }
}

# Top/bottom by LTV:CAC
$sortedByLTV = $Results | Sort-Object { $_.Channels.DTC.LTVtoCACRatio } -Descending
$top10LTV = $sortedByLTV | Select-Object -First 10 | ForEach-Object {
    [PSCustomObject]@{
        SKU = $_.SKU; Name = $_.Name; Tier = $_.Tier
        DTCLTV = $_.Channels.DTC.LTV
        DTCLTVtoCAC = $_.Channels.DTC.LTVtoCACRatio
        DTCPayback = $_.Channels.DTC.CACPaybackMonths
    }
}
$bottom5LTV = $sortedByLTV | Select-Object -Last 5 | ForEach-Object {
    [PSCustomObject]@{
        SKU = $_.SKU; Name = $_.Name; Tier = $_.Tier
        DTCLTV = $_.Channels.DTC.LTV
        DTCLTVtoCAC = $_.Channels.DTC.LTVtoCACRatio
        DTCPayback = $_.Channels.DTC.CACPaybackMonths
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    Assumptions = [PSCustomObject]@{
        CAC = $Assumptions.CAC
        OrderFrequency = $Assumptions.OrderFrequency
        RetentionRate = $Assumptions.RetentionRate
        UnitsPerOrder = $Assumptions.UnitsPerOrder
        FixedOverheadPerSKU = $Assumptions.FixedOverheadPerSKU
    }
    PortfolioSummary = [PSCustomObject]@{
        TotalSKUs = $Results.Count
        HealthDistribution = $flagCounts
        ChannelAverages = $channelAvgs
        CategoryAverages = $categoryAvgs
        Top10ByDTCLTV = $top10LTV
        Bottom5ByDTCLTV = $bottom5LTV
    }
    SKUs = $Results
}

$output | ConvertTo-Json -Depth 12 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BREAKEVEN & UNIT ECONOMICS ANALYZER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Health Distribution (186 SKU-channel combos)" -ForegroundColor White
Write-Host "    EXCELLENT:        $($flagCounts.EXCELLENT)" -ForegroundColor Green
Write-Host "    HEALTHY:          $($flagCounts.HEALTHY)" -ForegroundColor Green
Write-Host "    LOW_LTV_CAC:      $($flagCounts.LOW_LTV_CAC)" -ForegroundColor Yellow
Write-Host "    SLOW_PAYBACK:     $($flagCounts.SLOW_PAYBACK)" -ForegroundColor Yellow
Write-Host "    NEGATIVE_MARGIN:  $($flagCounts.NEGATIVE_MARGIN)" -ForegroundColor Red
Write-Host ""
Write-Host "  Channel Avg LTV:CAC" -ForegroundColor Cyan
foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
    $a = $channelAvgs[$ch]
    Write-Host "    $($ch.PadRight(14)) LTV:CAC $($a.AvgLTVtoCAC)x | Payback $($a.AvgCACPaybackMonths)mo | CM $($a.AvgContributionMarginPct)%" -ForegroundColor White
}
Write-Host ""
Write-Host "  Top 3 DTC LTV:CAC" -ForegroundColor Cyan
foreach ($t in ($top10LTV | Select-Object -First 3)) {
    Write-Host "    $($t.SKU) $($t.Name.PadRight(30)) $($t.DTCLTVtoCAC)x | `$$($t.DTCLTV) LTV" -ForegroundColor White
}
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
