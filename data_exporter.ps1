<# ================================================================
   FarmCeutica Data Export & CSV Generator
   Input:  All toolchain JSON outputs
   Output: exports/ directory with clean CSVs
   Generates Excel/Sheets-ready CSV files from all key datasets
   for non-technical stakeholders and BI tool import.
   ================================================================ #>

param(
    [string]$WorkingDir = ".",
    [string]$ExportDir  = "./exports"
)

$ErrorActionPreference = "Stop"
Set-Location $WorkingDir

# Create export directory
if (-not (Test-Path $ExportDir)) { New-Item -ItemType Directory -Path $ExportDir | Out-Null }

$ExportCount = 0
$TotalRows = 0

function Write-ExportCSV([string]$Name, $Rows) {
    $path = "$ExportDir/$Name.csv"
    $Rows | Export-Csv -Path $path -NoTypeInformation -Encoding UTF8
    $rows = $Rows.Count
    $script:ExportCount++
    $script:TotalRows += $rows
    Write-Host "    $Name.csv ($rows rows)" -ForegroundColor White
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DATA EXPORTER" -ForegroundColor Cyan
Write-Host "  Output: $ExportDir/" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Master SKU Catalog ───
if (Test-Path "./farmceutica_master_skus.json") {
    $master = Get-Content "./farmceutica_master_skus.json" | ConvertFrom-Json
    $export = $master | ForEach-Object {
        [PSCustomObject]@{
            SKU=$_.SKU; Name=$_.Name; Category=$_.Category
            MSRP=$_.MSRP; COGS=$_.COGS; DTCMargin="$($_.DTCMargin)%"
            Wholesale=$_.Wholesale; Distributor=$_.Distributor
            WSMargin="$($_.WSMargin)%"; DistMargin="$($_.DistMargin)%"
            COGSRatio="$($_.COGSRatio)%"
        }
    }
    Write-Host "  Catalog" -ForegroundColor Cyan
    Write-ExportCSV "master_sku_catalog" $export
}

# ─── 2. SKU Rationalization ───
if (Test-Path "./sku_rationalization.json") {
    $rat = Get-Content "./sku_rationalization.json" | ConvertFrom-Json
    $export = $rat.SKUs | ForEach-Object {
        [PSCustomObject]@{
            SKU=$_.SKU; Name=$_.Name; Category=$_.Category; Tier=$_.Tier
            CompositeScore=$_.CompositeScore; DTCMargin="$($_.DTCMargin)%"
            ViableChannels=$_.ViableChannels
            Actions=($_.Actions -join "; ")
        }
    }
    Write-Host "  Strategy" -ForegroundColor Cyan
    Write-ExportCSV "sku_rationalization" $export
}

# ─── 3. Margin Waterfall (flattened) ───
if (Test-Path "./margin_waterfall.json") {
    $wf = Get-Content "./margin_waterfall.json" | ConvertFrom-Json
    $export = @()
    foreach ($s in $wf.SKUs) {
        foreach ($ch in @("DTC","Wholesale","Distributor")) {
            $c = $s.Channels.$ch
            $export += [PSCustomObject]@{
                SKU=$s.SKU; Name=$s.Name; Channel=$ch
                Revenue=$c.Revenue; NetMargin=$c.NetMargin
                NetMarginPct="$($c.NetMarginPct)%"
            }
        }
    }
    Write-ExportCSV "margin_waterfall" $export
}

# ─── 4. Pricing Tiers ───
if (Test-Path "./updated_pricing_tiers.json") {
    $pricing = Get-Content "./updated_pricing_tiers.json" | ConvertFrom-Json
    $export = $pricing | ForEach-Object {
        [PSCustomObject]@{
            SKU=$_.SKU; Name=$_.Name; Category=$_.Category
            MSRP=$_.MSRP; COGS=$_.COGS; Wholesale=$_.Wholesale; Distributor=$_.Distributor
            DTCMargin=$_.DTCMargin; WSMargin=$_.WSMargin
            Changed=$_.Changed; Alerts=$_.Alerts
        }
    }
    Write-ExportCSV "pricing_tiers" $export
}

# ─── 5. Channel Mix Scenarios ───
if (Test-Path "./channel_mix_results.json") {
    $cm = Get-Content "./channel_mix_results.json" | ConvertFrom-Json
    $export = $cm.Scenarios | ForEach-Object {
        [PSCustomObject]@{
            Scenario=$_.Scenario
            MonthlyRevenue=$_.Summary.MonthlyRevenue
            MonthlyNetProfit=$_.Summary.MonthlyNetProfit
            BlendedMargin="$($_.Summary.BlendedNetMarginPct)%"
            AnnualRevenue=$_.Summary.AnnualRevenue
            AnnualNetProfit=$_.Summary.AnnualNetProfit
        }
    }
    Write-Host "  Revenue" -ForegroundColor Cyan
    Write-ExportCSV "channel_mix_scenarios" $export
}

# ─── 6. Bundles ───
if (Test-Path "./bundle_optimization.json") {
    $bundles = Get-Content "./bundle_optimization.json" | ConvertFrom-Json
    $export = $bundles.Bundles | ForEach-Object {
        [PSCustomObject]@{
            Bundle=$_.BundleName; Strategy=$_.Strategy; Quality=$_.QualityFlag
            SKUCount=$_.SKUCount; BundlePrice=$_.Pricing.BundlePrice
            CustomerSavings=$_.Pricing.CustomerSavings; DTCMargin="$($_.Pricing.BundleDTCMargin)%"
            AnnualRevenue=$_.Projection.AnnualBundleRevenue
            AnnualGrossProfit=$_.Projection.AnnualGrossProfit
            TargetAudience=$_.TargetAudience
        }
    }
    Write-ExportCSV "bundles" $export
}

# ─── 7. Forecast ───
if (Test-Path "./forecast_12month.json") {
    $fc = Get-Content "./forecast_12month.json" | ConvertFrom-Json
    $export = $fc.MonthlyForecast | ForEach-Object {
        [PSCustomObject]@{
            Month=$_.Label; Revenue=$_.Revenue.Total
            SKURevenue=$_.Revenue.IndividualSKUs; BundleRevenue=$_.Revenue.Bundles
            COGS=$_.Costs.COGS; GrossProfit=$_.GrossProfit
            NetProfit=$_.NetProfit; NetMargin="$($_.NetMarginPct)%"
            CumulativeRevenue=$_.CumulativeRevenue
        }
    }
    Write-Host "  Finance" -ForegroundColor Cyan
    Write-ExportCSV "forecast_12month" $export
}

# ─── 8. Unit Economics ───
if (Test-Path "./unit_economics.json") {
    $ue = Get-Content "./unit_economics.json" | ConvertFrom-Json
    $export = @()
    foreach ($s in $ue.SKUs) {
        foreach ($ch in @("DTC","Wholesale","Distributor")) {
            $c = $s.Channels.$ch
            $export += [PSCustomObject]@{
                SKU=$s.SKU; Name=$s.Name; Channel=$ch
                Price=$c.Price; ContributionMargin=$c.ContributionMargin
                LTV=$c.LTV; LTVtoCAC=$c.LTVtoCACRatio
                CACPaybackMonths=$c.CACPaybackMonths
                BreakevenUnits=$c.BreakevenUnitsPerMonth; Flag=$c.Flag
            }
        }
    }
    Write-ExportCSV "unit_economics" $export
}

# ─── 9. Inventory ───
if (Test-Path "./inventory_reorder_plan.json") {
    $inv = Get-Content "./inventory_reorder_plan.json" | ConvertFrom-Json
    $export = $inv.SKUs | ForEach-Object {
        [PSCustomObject]@{
            SKU=$_.SKU; Name=$_.Name; Category=$_.Category
            AvgMonthlyDemand=$_.Demand.AvgMonthlyUnits; SafetyStock=$_.InventoryLevels.SafetyStock
            ReorderPoint=$_.InventoryLevels.ReorderPoint; EOQ=$_.InventoryLevels.EOQ
            WeeksOfSupply=$_.InventoryLevels.WeeksOfSupply; InventoryValue=$_.Financials.AvgInventoryValue
            InventoryTurns=$_.Financials.InventoryTurns; StockoutRisk=$_.Risk.StockoutRisk
            POUrgency=$_.NextPO.Urgency; OrderQty=$_.NextPO.OrderQuantity; OrderValue=$_.NextPO.OrderValue
        }
    }
    Write-Host "  Operations" -ForegroundColor Cyan
    Write-ExportCSV "inventory_reorder" $export
}

# ─── 10. Suppliers ───
if (Test-Path "./supplier_scorecard.json") {
    $suppliers = Get-Content "./supplier_scorecard.json" | ConvertFrom-Json
    $export = $suppliers.Suppliers | ForEach-Object {
        [PSCustomObject]@{
            Supplier=$_.Supplier; Region=$_.Region; LeadTimeDays=$_.LeadTimeDays
            Ingredients=$_.IngredientCount; SKUs=$_.SKUCount
            AnnualSpend=$_.AnnualSpend; SpendShare="$($_.SpendSharePct)%"
            CompositeScore=$_.CompositeScore; RiskTier=$_.RiskTier
            Recommendations=($_.Recommendations -join "; ")
        }
    }
    Write-ExportCSV "supplier_scorecard" $export
}

# ─── 11. Subscriptions ───
if (Test-Path "./subscription_mrr_analysis.json") {
    $subs = Get-Content "./subscription_mrr_analysis.json" | ConvertFrom-Json
    $export = $subs.CurrentState.TierBreakdown | ForEach-Object {
        [PSCustomObject]@{
            Tier=$_.Tier; Customers=$_.Customers; Subscriptions=$_.Subscriptions
            AvgPrice=$_.AvgSubPrice; MRR=$_.MRR; ARR=$_.ARR
            MonthlyChurn=$_.MonthlyChurn; ShareOfMRR=$_.ShareOfMRR
        }
    }
    Write-ExportCSV "subscription_tiers" $export
}

# ─── 12. Cash Flow ───
if (Test-Path "./cashflow_analysis.json") {
    $cf = Get-Content "./cashflow_analysis.json" | ConvertFrom-Json
    $export = $cf.MonthlyCashFlow | ForEach-Object {
        [PSCustomObject]@{
            Month=$_.Label; Inflows=$_.Inflows.Total; Outflows=$_.Outflows.Total
            NetCashFlow=$_.NetCashFlow; CashPosition=$_.CashPosition
            Receivables=$_.ReceivablesBalance; CreditLine=$_.CreditLine.Balance
            Runway=$_.MonthsRunway; Health=$_.HealthFlag
        }
    }
    Write-ExportCSV "cashflow_monthly" $export
}

# ─── 13. What-If Scenarios ───
if (Test-Path "./whatif_results.json") {
    $wi = Get-Content "./whatif_results.json" | ConvertFrom-Json
    $export = @()
    $export += [PSCustomObject]@{
        Scenario="BASELINE"; Type="-"; Impact="-"
        AnnualRevenue=$wi.Baseline.AnnualRevenue; AnnualNetProfit=$wi.Baseline.AnnualNetProfit
        NetMargin="$($wi.Baseline.NetMarginPct)%"; SKUs=$wi.Baseline.SKUCount
        RevDelta="-"; NetDelta="-"
    }
    foreach ($s in $wi.Scenarios) {
        $export += [PSCustomObject]@{
            Scenario=$s.Scenario; Type=$s.Type; Impact=$s.Impact
            AnnualRevenue=$s.Result.AnnualRevenue; AnnualNetProfit=$s.Result.AnnualNetProfit
            NetMargin="$($s.Result.NetMarginPct)%"; SKUs=$s.Result.SKUCount
            RevDelta=$s.VsBaseline.RevenueChangePct; NetDelta=$s.VsBaseline.NetProfitChangePct
        }
    }
    Write-ExportCSV "whatif_scenarios" $export
}

# ─── 14. Promotions ───
if (Test-Path "./promotion_roi_analysis.json") {
    $promos = Get-Content "./promotion_roi_analysis.json" | ConvertFrom-Json
    $export = $promos.Promotions | ForEach-Object {
        [PSCustomObject]@{
            Promotion=$_.Promotion; Code=$_.Code; Type=$_.Type
            Discount=$_.Discount; Duration=$_.Duration; AppliesTo=$_.AppliesTo
            GPDelta=$_.Economics.GrossProfitDelta; ROI="$($_.ROI)%"
            VolumeLift=$_.VolumeImpact.VolumeLift
            NewCustomers=$_.Acquisition.NetNewCustomers; Rating=$_.Rating
        }
    }
    Write-ExportCSV "promotion_roi" $export
}

# ─── 15. Board Metrics ───
if (Test-Path "./board_metrics.json") {
    $board = Get-Content "./board_metrics.json" | ConvertFrom-Json
    $export = @()
    $board.BoardMetrics.PSObject.Properties | ForEach-Object {
        $m = $_.Value
        $export += [PSCustomObject]@{
            Metric = ($_.Name -replace "_"," "); Value = $m.Display
            Definition = $m.Definition
            Benchmark = if ($m.Benchmark) { $m.Benchmark } else { "-" }
        }
    }
    Write-ExportCSV "board_metrics" $export
}

# ─── 16. Alerts ───
if (Test-Path "./alerts.json") {
    $alerts = Get-Content "./alerts.json" | ConvertFrom-Json
    $export = $alerts.Alerts | ForEach-Object {
        [PSCustomObject]@{
            Severity=$_.Severity; Category=$_.Category; Title=$_.Title
            Detail=$_.Detail; Action=$_.Action
        }
    }
    Write-ExportCSV "active_alerts" $export
}

# ─── 17. Commissions ───
if (Test-Path "./commission_payout_analysis.json") {
    $comm = Get-Content "./commission_payout_analysis.json" | ConvertFrom-Json
    $export = $comm.PartnerTiers | ForEach-Object {
        [PSCustomObject]@{
            Tier=$_.Tier; Type=$_.Type; Partners=$_.Partners
            AvgPayoutPerPartner=$_.PerPartner.TotalPayout
            MonthlyRevenue=$_.TierTotals.MonthlyRevenue
            MonthlyPayouts=$_.TierTotals.MonthlyPayouts
            GrossMargin=$_.TierTotals.GrossMarginAfterComm
            AnnualRevenue=$_.TierTotals.AnnualRevenue
            Satisfaction=$_.PartnerSatisfaction
        }
    }
    Write-ExportCSV "commission_payouts" $export
}

Write-Host ""
Write-Host "  ════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Exported: $ExportCount files | $TotalRows total rows" -ForegroundColor Green
Write-Host "  Location: $ExportDir/" -ForegroundColor Cyan
Write-Host ""
