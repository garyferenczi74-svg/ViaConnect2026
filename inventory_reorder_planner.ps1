<# ================================================================
   FarmCeutica Inventory & Reorder Planner
   Input:  farmceutica_master_skus.json, forecast_12month.json,
           channel_mix_results.json
   Output: inventory_reorder_plan.json
   Calculates optimal stock levels, reorder points, safety stock,
   economic order quantities, and generates purchase order
   recommendations per SKU based on forecast demand.
   ================================================================ #>

param(
    [string]$MasterFile    = "./farmceutica_master_skus.json",
    [string]$ForecastFile  = "./forecast_12month.json",
    [string]$ChannelFile   = "./channel_mix_results.json",
    [string]$OutputFile    = "./inventory_reorder_plan.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json
$Forecast = Get-Content $ForecastFile | ConvertFrom-Json
$ChannelMix = Get-Content $ChannelFile | ConvertFrom-Json

# --- Supply Chain Assumptions ---
$SupplyChain = @{
    LeadTimeDays = @{
        Base     = 21   # 3 weeks domestic supplement mfg
        Advanced = 28   # 4 weeks complex formulations
        Women    = 28
        Children = 21
        SNP      = 35   # 5 weeks specialty ingredients
        Mushroom = 28   # 4 weeks extract processing
        Testing  = 7    # 1 week kit assembly
    }
    # Service level target (% of demand met from stock)
    ServiceLevel = 0.95   # 95% fill rate
    # Z-score for 95% service level
    ZScore95 = 1.65
    # Demand variability (coefficient of variation)
    DemandCV = @{
        Base = 0.15; Advanced = 0.20; Women = 0.25; Children = 0.20
        SNP = 0.30; Mushroom = 0.15; Testing = 0.35
    }
    # Holding cost as % of COGS per year
    HoldingCostPct = 0.25
    # Fixed ordering cost per PO
    OrderingCost = 350
    # Shelf life in months
    ShelfLife = @{
        Base = 24; Advanced = 24; Women = 24; Children = 18
        SNP = 24; Mushroom = 18; Testing = 12
    }
    # Minimum order quantities
    MOQ = @{
        Base = 500; Advanced = 250; Women = 250; Children = 500
        SNP = 200; Mushroom = 500; Testing = 50
    }
    # Days per month
    DaysPerMonth = 30
}

# --- Category volume assumptions from channel mix (Balanced scenario) ---
$ActiveScenario = $ChannelMix.Scenarios | Where-Object { $_.Scenario -eq "Balanced" }
$CategoryVolumes = @{}
foreach ($cat in $ActiveScenario.CategorySummary) {
    $skuCount = ($Master | Where-Object { $_.Category -eq $cat.Category }).Count
    if ($skuCount -gt 0) {
        $CategoryVolumes[$cat.Category] = [math]::Round([decimal]$cat.Revenue / $skuCount / 100)
    }
}

# --- Seasonality peak factor (max index from forecast) ---
$peakSeason = ($Forecast.MonthlyForecast | ForEach-Object { [decimal]$_.SeasonalityIndex } | Measure-Object -Maximum).Maximum

# --- Calculate Per-SKU Inventory Plan ---
$Results = @()
$totalInventoryValue = [decimal]0
$totalAnnualHoldingCost = [decimal]0
$totalPOCount = 0

foreach ($sku in $Master) {
    $cat = $sku.Category
    $cogs = [decimal]$sku.COGS
    $msrp = [decimal]$sku.MSRP

    # Monthly demand (units) - estimated from category volume
    $baseMonthlyDemand = if ($CategoryVolumes[$cat]) { [int]$CategoryVolumes[$cat] } else { 100 }

    # Forecast-adjusted demand (apply average growth over 12 months)
    $growthFactor = 1.18  # ~18% avg growth from forecast (midpoint of 12mo)
    $avgMonthlyDemand = [math]::Round($baseMonthlyDemand * $growthFactor)
    $peakMonthlyDemand = [math]::Round($avgMonthlyDemand * $peakSeason)
    $annualDemand = $avgMonthlyDemand * 12

    # Lead time
    $leadTimeDays = $SupplyChain.LeadTimeDays[$cat]
    $leadTimeMonths = [math]::Round($leadTimeDays / $SupplyChain.DaysPerMonth, 2)

    # Demand during lead time
    $dailyDemand = [math]::Round($avgMonthlyDemand / $SupplyChain.DaysPerMonth, 1)
    $leadTimeDemand = [math]::Ceiling($dailyDemand * $leadTimeDays)

    # Safety stock = Z * sigma_demand * sqrt(lead_time_in_months)
    $demandCV = [decimal]$SupplyChain.DemandCV[$cat]
    $demandStdDev = $avgMonthlyDemand * $demandCV
    $safetyStock = [math]::Ceiling($SupplyChain.ZScore95 * $demandStdDev * [math]::Sqrt($leadTimeMonths))

    # Reorder point = lead time demand + safety stock
    $reorderPoint = $leadTimeDemand + $safetyStock

    # Economic Order Quantity (EOQ)
    $annualHoldingCostPerUnit = $cogs * $SupplyChain.HoldingCostPct
    $eoqRaw = if ($annualHoldingCostPerUnit -gt 0) {
        [math]::Sqrt((2 * $annualDemand * $SupplyChain.OrderingCost) / $annualHoldingCostPerUnit)
    } else { $avgMonthlyDemand * 3 }
    # Round up to MOQ
    $moq = [int]$SupplyChain.MOQ[$cat]
    $eoq = [math]::Max($moq, [math]::Ceiling($eoqRaw / $moq) * $moq)

    # Orders per year
    $ordersPerYear = [math]::Ceiling($annualDemand / $eoq)

    # Max stock level
    $maxStock = $eoq + $safetyStock

    # Average inventory
    $avgInventory = [math]::Round($eoq / 2 + $safetyStock)

    # Inventory value
    $avgInventoryValue = [math]::Round($avgInventory * $cogs, 2)
    $totalInventoryValue += $avgInventoryValue

    # Annual holding cost
    $annualHolding = [math]::Round($avgInventoryValue * $SupplyChain.HoldingCostPct, 2)
    $totalAnnualHoldingCost += $annualHolding

    # Annual ordering cost
    $annualOrdering = $ordersPerYear * $SupplyChain.OrderingCost

    # Total inventory cost
    $totalInventoryCost = [math]::Round($annualHolding + $annualOrdering, 2)

    # Inventory turns (annual demand at cost / avg inventory value)
    $inventoryTurns = if ($avgInventoryValue -gt 0) {
        [math]::Round(($annualDemand * $cogs) / $avgInventoryValue, 1)
    } else { 0 }

    # Weeks of supply at average demand
    $weeksOfSupply = if ($dailyDemand -gt 0) {
        [math]::Round($avgInventory / ($dailyDemand * 7), 1)
    } else { 0 }

    # Shelf life risk
    $shelfLifeMonths = [int]$SupplyChain.ShelfLife[$cat]
    $monthsOfStock = if ($avgMonthlyDemand -gt 0) { [math]::Round($maxStock / $avgMonthlyDemand, 1) } else { 999 }
    $shelfLifeRisk = if ($monthsOfStock -gt $shelfLifeMonths * 0.5) { "WATCH" }
                     elseif ($monthsOfStock -gt $shelfLifeMonths * 0.75) { "HIGH" }
                     else { "LOW" }

    # Stockout risk (based on demand variability and lead time)
    $stockoutRisk = if ($demandCV -ge 0.30 -and $leadTimeDays -ge 28) { "HIGH" }
                    elseif ($demandCV -ge 0.25 -or $leadTimeDays -ge 35) { "MEDIUM" }
                    else { "LOW" }

    # Next PO recommendation
    $daysUntilReorder = if ($dailyDemand -gt 0) {
        [math]::Max(0, [math]::Round(($avgInventory - $reorderPoint) / $dailyDemand))
    } else { 999 }
    $nextPOUrgency = if ($daysUntilReorder -le 7) { "URGENT" }
                     elseif ($daysUntilReorder -le 14) { "SOON" }
                     elseif ($daysUntilReorder -le 30) { "PLANNED" }
                     else { "STABLE" }

    $totalPOCount += $ordersPerYear

    $Results += [PSCustomObject]@{
        SKU = $sku.SKU
        Name = $sku.Name
        Category = $cat
        COGS = $cogs
        Demand = [PSCustomObject]@{
            AvgMonthlyUnits = $avgMonthlyDemand
            PeakMonthlyUnits = $peakMonthlyDemand
            AnnualUnits = $annualDemand
            DailyUnits = $dailyDemand
            DemandCV = $demandCV
        }
        SupplyChain = [PSCustomObject]@{
            LeadTimeDays = $leadTimeDays
            MOQ = $moq
            ShelfLifeMonths = $shelfLifeMonths
        }
        InventoryLevels = [PSCustomObject]@{
            SafetyStock = $safetyStock
            ReorderPoint = $reorderPoint
            EOQ = $eoq
            MaxStock = $maxStock
            AvgInventory = $avgInventory
            WeeksOfSupply = $weeksOfSupply
        }
        Financials = [PSCustomObject]@{
            AvgInventoryValue = $avgInventoryValue
            AnnualHoldingCost = $annualHolding
            AnnualOrderingCost = $annualOrdering
            TotalInventoryCost = $totalInventoryCost
            InventoryTurns = $inventoryTurns
            OrdersPerYear = $ordersPerYear
        }
        Risk = [PSCustomObject]@{
            StockoutRisk = $stockoutRisk
            ShelfLifeRisk = $shelfLifeRisk
            MonthsOfStockAtMax = $monthsOfStock
        }
        NextPO = [PSCustomObject]@{
            Urgency = $nextPOUrgency
            DaysUntilReorder = $daysUntilReorder
            OrderQuantity = $eoq
            OrderValue = [math]::Round($eoq * $cogs, 2)
        }
    }
}

# --- Portfolio Inventory Summary ---
$urgencyCounts = $Results | Group-Object { $_.NextPO.Urgency } | ForEach-Object {
    [PSCustomObject]@{ Urgency = $_.Name; Count = $_.Count }
}

$stockoutCounts = $Results | Group-Object { $_.Risk.StockoutRisk } | ForEach-Object {
    [PSCustomObject]@{ Risk = $_.Name; Count = $_.Count }
}

$categorySummary = $Results | Group-Object Category | ForEach-Object {
    $invValue = ($_.Group | ForEach-Object { $_.Financials.AvgInventoryValue } | Measure-Object -Sum).Sum
    $holdCost = ($_.Group | ForEach-Object { $_.Financials.AnnualHoldingCost } | Measure-Object -Sum).Sum
    $avgTurns = ($_.Group | ForEach-Object { $_.Financials.InventoryTurns } | Measure-Object -Average).Average
    [PSCustomObject]@{
        Category = $_.Name
        SKUCount = $_.Count
        AvgInventoryValue = [math]::Round($invValue, 2)
        AnnualHoldingCost = [math]::Round($holdCost, 2)
        AvgInventoryTurns = [math]::Round($avgTurns, 1)
    }
}

# Top 10 by inventory value (capital tied up)
$topByValue = $Results | Sort-Object { $_.Financials.AvgInventoryValue } -Descending |
    Select-Object -First 10 | ForEach-Object {
    [PSCustomObject]@{
        SKU = $_.SKU; Name = $_.Name
        AvgInventoryValue = $_.Financials.AvgInventoryValue
        InventoryTurns = $_.Financials.InventoryTurns
        StockoutRisk = $_.Risk.StockoutRisk
    }
}

# Urgent reorders
$urgentPOs = $Results | Where-Object { $_.NextPO.Urgency -in @("URGENT", "SOON") } | ForEach-Object {
    [PSCustomObject]@{
        SKU = $_.SKU; Name = $_.Name; Urgency = $_.NextPO.Urgency
        DaysUntilReorder = $_.NextPO.DaysUntilReorder
        OrderQty = $_.NextPO.OrderQuantity; OrderValue = $_.NextPO.OrderValue
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    SupplyChainAssumptions = $SupplyChain
    PortfolioSummary = [PSCustomObject]@{
        TotalSKUs = $Results.Count
        TotalAvgInventoryValue = [math]::Round($totalInventoryValue, 2)
        TotalAnnualHoldingCost = [math]::Round($totalAnnualHoldingCost, 2)
        TotalAnnualPOCount = $totalPOCount
        TotalAnnualOrderingCost = $totalPOCount * $SupplyChain.OrderingCost
        POUrgencyDistribution = $urgencyCounts
        StockoutRiskDistribution = $stockoutCounts
        CategorySummary = $categorySummary
        Top10ByInventoryValue = $topByValue
        UrgentReorders = $urgentPOs
    }
    SKUs = $Results
}

$output | ConvertTo-Json -Depth 12 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
$invVal = '{0:N0}' -f $totalInventoryValue
$holdCost = '{0:N0}' -f $totalAnnualHoldingCost
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  INVENTORY & REORDER PLANNER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Portfolio Inventory" -ForegroundColor White
Write-Host "    Avg Value on Hand:  `$$invVal" -ForegroundColor Green
Write-Host "    Annual Holding:     `$$holdCost" -ForegroundColor Green
Write-Host "    Annual POs:         $totalPOCount orders" -ForegroundColor White
Write-Host ""
Write-Host "  PO Urgency" -ForegroundColor Cyan
foreach ($u in $urgencyCounts) {
    $color = switch ($u.Urgency) { "URGENT" { "Red" } "SOON" { "Yellow" } default { "White" } }
    Write-Host "    $($u.Urgency.PadRight(10)) $($u.Count) SKUs" -ForegroundColor $color
}
Write-Host ""
Write-Host "  Stockout Risk" -ForegroundColor Cyan
foreach ($s in $stockoutCounts) {
    $color = switch ($s.Risk) { "HIGH" { "Red" } "MEDIUM" { "Yellow" } default { "Green" } }
    Write-Host "    $($s.Risk.PadRight(10)) $($s.Count) SKUs" -ForegroundColor $color
}
Write-Host ""
if ($urgentPOs) {
    Write-Host "  Urgent/Soon POs: $($urgentPOs.Count) orders needed" -ForegroundColor Yellow
    foreach ($po in ($urgentPOs | Select-Object -First 5)) {
        Write-Host "    $($po.SKU) $($po.Name.PadRight(30)) $($po.Urgency) ($($po.DaysUntilReorder)d) $($po.OrderQty) units `$$($po.OrderValue)" -ForegroundColor White
    }
}
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
