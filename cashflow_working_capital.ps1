<# ================================================================
   FarmCeutica Cash Flow & Working Capital Analyzer
   Input:  forecast_12month.json, inventory_reorder_plan.json,
           supplier_scorecard.json, subscription_mrr_analysis.json
   Output: cashflow_analysis.json
   Models monthly cash position by combining revenue collection,
   inventory purchases, supplier payment terms, OpEx, and
   subscription timing into a 12-month cash flow forecast.
   ================================================================ #>

param(
    [string]$ForecastFile     = "./forecast_12month.json",
    [string]$InventoryFile    = "./inventory_reorder_plan.json",
    [string]$SupplierFile     = "./supplier_scorecard.json",
    [string]$SubscriptionFile = "./subscription_mrr_analysis.json",
    [string]$OutputFile       = "./cashflow_analysis.json"
)

$ErrorActionPreference = "Stop"

$Forecast = Get-Content $ForecastFile | ConvertFrom-Json
$Inventory = Get-Content $InventoryFile | ConvertFrom-Json
$Suppliers = Get-Content $SupplierFile | ConvertFrom-Json
$Subs = Get-Content $SubscriptionFile | ConvertFrom-Json

# --- Operating Assumptions ---
$OpAssumptions = @{
    # Starting cash position
    OpeningCash = 500000

    # Revenue collection timing - ALL channels Net 30
    DTC_CollectionDays = 30         # Net 30 payment terms
    Wholesale_CollectionDays = 30   # Net 30 invoicing
    Distributor_CollectionDays = 30 # Net 30 invoicing

    # Launch timing
    LaunchMonth = 4                 # Month 4 of forecast = June 2026
    PreLaunchMonths = 3             # Mar, Apr, May = pre-launch (no revenue)

    # Channel revenue split (from Balanced scenario)
    DTC_RevShare = 0.704
    WS_RevShare = 0.211
    Dist_RevShare = 0.084

    # Subscription prepayment advantage
    # Annual/quarterly subs pay upfront, improving cash position
    SubPrepaymentBoost = 0.05  # 5% of monthly revenue arrives early from prepaid subs

    # Supplier payment timing (weighted avg from scorecard)
    AvgSupplierPaymentDays = 35

    # Monthly fixed operating expenses
    MonthlyOpEx = @{
        Payroll = 85000
        Rent_Warehouse = 12000
        Insurance = 4500
        Software_SaaS = 8500
        Legal_Compliance = 6000
        Marketing_Fixed = 35000
        Accounting = 5000
        Utilities = 3000
        Miscellaneous = 6000
    }

    # Variable OpEx as % of revenue
    VariableOpExPct = 0.05   # 5% for customer support, returns processing, etc.

    # Tax provisions
    EstimatedTaxRate = 0.22  # 22% quarterly estimated tax
    QuarterlyTaxMonths = @(3, 6, 9, 12)

    # Capital expenditure schedule
    CapEx = @(
        @{ Month = 2; Amount = 25000; Description = "Warehouse equipment upgrade" }
        @{ Month = 5; Amount = 15000; Description = "Label compliance system" }
        @{ Month = 8; Amount = 40000; Description = "New product line tooling" }
    )

    # Line of credit
    CreditLineLimit = 250000
    CreditLineRate = 0.08   # 8% APR
}

# --- Calculate Monthly Fixed OpEx Total ---
$monthlyFixedOpEx = [decimal]0
foreach ($key in $OpAssumptions.MonthlyOpEx.Keys) {
    $monthlyFixedOpEx += [decimal]$OpAssumptions.MonthlyOpEx[$key]
}

# --- Weighted Average Supplier Payment Days ---
$totalSupplierSpend = [decimal]$Suppliers.ProcurementSummary.TotalAnnualSpend
$weightedPayDays = 0
foreach ($s in $Suppliers.Suppliers) {
    $weight = if ($totalSupplierSpend -gt 0) { [decimal]$s.AnnualSpend / $totalSupplierSpend } else { 0 }
    $weightedPayDays += [decimal]$s.LeadTimeDays * $weight  # Use lead time as proxy for payment cycle
}
$avgPayDays = [math]::Round($weightedPayDays, 0)

# --- Monthly Inventory Investment ---
$monthlyInventorySpend = [math]::Round([decimal]$Inventory.PortfolioSummary.TotalAvgInventoryValue / 6, 2)  # Replenish ~1/6 of inventory monthly

# --- Build 12-Month Cash Flow ---
$CashFlow = @()
$runningCash = [decimal]$OpAssumptions.OpeningCash
$cumulativeNetCash = [decimal]0
$receivablesBalance = [decimal]0
$payablesBalance = [decimal]0
$creditDrawn = [decimal]0
$cumulativeTaxProvision = [decimal]0
$lowestCash = [decimal]::MaxValue
$lowestMonth = 0

for ($m = 1; $m -le 12; $m++) {
    $fMonth = $Forecast.MonthlyForecast[$m - 1]
    $totalRevenue = [decimal]$fMonth.Revenue.Total

    # --- INFLOWS ---
    # ALL channels: Net 30 payment terms - collect prior month's revenue
    # Pre-launch months and month 1 post-launch collect nothing (no prior sales)

    $priorMonthRevenue = if ($m -gt 1) { [decimal]$Forecast.MonthlyForecast[$m - 2].Revenue.Total } else { 0 }

    # DTC collected from prior month (Net 30)
    $dtcCollection = [math]::Round($priorMonthRevenue * $OpAssumptions.DTC_RevShare, 2)

    # Wholesale collected from prior month (Net 30)
    $wsCollection = [math]::Round($priorMonthRevenue * $OpAssumptions.WS_RevShare, 2)

    # Distributor collected from prior month (Net 30)
    $distCollection = [math]::Round($priorMonthRevenue * $OpAssumptions.Dist_RevShare, 2)

    # Subscription prepayment boost (only on current month revenue if post-launch)
    $subPrepay = [math]::Round($totalRevenue * $OpAssumptions.SubPrepaymentBoost, 2)

    $totalInflows = [math]::Round($dtcCollection + $wsCollection + $distCollection + $subPrepay, 2)

    # Update receivables (current month's revenue is outstanding until next month)
    $newReceivables = [math]::Round($totalRevenue, 2)
    $collectedReceivables = [math]::Round($priorMonthRevenue, 2)
    $receivablesBalance = [math]::Round($receivablesBalance + $newReceivables - $collectedReceivables, 2)

    # --- OUTFLOWS ---

    # COGS / Inventory purchases
    $cogsCash = [math]::Round([decimal]$fMonth.Costs.COGS, 2)
    $inventoryPurchase = [math]::Round($monthlyInventorySpend * (1 + ($m - 1) * 0.02), 2)  # Grow with demand

    # Fixed OpEx
    $fixedOpEx = $monthlyFixedOpEx

    # Variable OpEx
    $variableOpEx = [math]::Round($totalRevenue * $OpAssumptions.VariableOpExPct, 2)

    # CapEx
    $capex = [decimal]0
    $capexDesc = ""
    foreach ($ce in $OpAssumptions.CapEx) {
        if ($ce.Month -eq $m) {
            $capex += [decimal]$ce.Amount
            $capexDesc = $ce.Description
        }
    }

    # Quarterly tax payments
    $taxPayment = [decimal]0
    $monthlyProfit = $totalInflows - $cogsCash - $fixedOpEx - $variableOpEx
    $cumulativeTaxProvision += [math]::Round($monthlyProfit * $OpAssumptions.EstimatedTaxRate, 2)
    if ($m -in $OpAssumptions.QuarterlyTaxMonths) {
        $taxPayment = [math]::Max(0, [math]::Round($cumulativeTaxProvision, 2))
        $cumulativeTaxProvision = 0
    }

    $totalOutflows = [math]::Round($cogsCash + $inventoryPurchase + $fixedOpEx + $variableOpEx + $capex + $taxPayment, 2)

    # --- NET CASH FLOW ---
    $netCashFlow = [math]::Round($totalInflows - $totalOutflows, 2)

    # --- CREDIT LINE ---
    $projectedCash = $runningCash + $netCashFlow
    $creditAction = ""
    if ($projectedCash -lt 50000 -and $creditDrawn -lt $OpAssumptions.CreditLineLimit) {
        $drawAmount = [math]::Min(100000, $OpAssumptions.CreditLineLimit - $creditDrawn)
        $creditDrawn += $drawAmount
        $projectedCash += $drawAmount
        $creditAction = "DRAW `$$drawAmount"
    } elseif ($projectedCash -gt 200000 -and $creditDrawn -gt 0) {
        $repayAmount = [math]::Min($creditDrawn, [math]::Round($projectedCash - 150000))
        $creditDrawn -= $repayAmount
        $projectedCash -= $repayAmount
        $creditAction = "REPAY `$$repayAmount"
    }

    # Interest on credit line
    $creditInterest = [math]::Round($creditDrawn * ($OpAssumptions.CreditLineRate / 12), 2)
    $projectedCash -= $creditInterest

    $runningCash = [math]::Round($projectedCash, 2)
    $cumulativeNetCash += $netCashFlow

    if ($runningCash -lt $lowestCash) { $lowestCash = $runningCash; $lowestMonth = $m }

    # Cash position health
    $monthsRunway = if ($totalOutflows -gt 0) { [math]::Round($runningCash / $totalOutflows, 1) } else { 99 }
    $healthFlag = if ($runningCash -lt 0) { "CRITICAL" }
                  elseif ($monthsRunway -lt 1) { "WARNING" }
                  elseif ($monthsRunway -lt 3) { "TIGHT" }
                  else { "HEALTHY" }

    $CashFlow += [PSCustomObject]@{
        Month = $m
        Label = $fMonth.Label
        Inflows = [PSCustomObject]@{
            DTCCollection = $dtcCollection
            WholesaleCollection = $wsCollection
            DistributorCollection = $distCollection
            SubscriptionPrepay = $subPrepay
            Total = $totalInflows
        }
        Outflows = [PSCustomObject]@{
            COGS = $cogsCash
            InventoryPurchases = $inventoryPurchase
            FixedOpEx = $fixedOpEx
            VariableOpEx = $variableOpEx
            CapEx = $capex
            TaxPayment = $taxPayment
            Total = $totalOutflows
        }
        NetCashFlow = $netCashFlow
        CreditLine = [PSCustomObject]@{
            Balance = $creditDrawn
            Interest = $creditInterest
            Action = $creditAction
        }
        CashPosition = $runningCash
        ReceivablesBalance = [math]::Round($receivablesBalance, 2)
        CumulativeNetCash = [math]::Round($cumulativeNetCash, 2)
        MonthsRunway = $monthsRunway
        HealthFlag = $healthFlag
        CapExNote = $capexDesc
    }
}

# --- Working Capital Metrics ---
$avgMonthlyRev = ($CashFlow | ForEach-Object { $_.Inflows.Total } | Measure-Object -Average).Average
$avgReceivables = ($CashFlow | ForEach-Object { $_.ReceivablesBalance } | Measure-Object -Average).Average
$dso = if ($avgMonthlyRev -gt 0) { [math]::Round(($avgReceivables / $avgMonthlyRev) * 30, 1) } else { 0 }
$cashConversionCycle = [math]::Round($dso + ($monthlyInventorySpend / $avgMonthlyRev * 30) - $avgPayDays, 1)

$endingCash = $CashFlow[11].CashPosition
$totalInflows12 = ($CashFlow | ForEach-Object { $_.Inflows.Total } | Measure-Object -Sum).Sum
$totalOutflows12 = ($CashFlow | ForEach-Object { $_.Outflows.Total } | Measure-Object -Sum).Sum
$totalCapEx12 = ($CashFlow | ForEach-Object { $_.Outflows.CapEx } | Measure-Object -Sum).Sum
$totalTax12 = ($CashFlow | ForEach-Object { $_.Outflows.TaxPayment } | Measure-Object -Sum).Sum
$freeCashFlow = [math]::Round($totalInflows12 - $totalOutflows12, 2)

# --- Stress Test: What if revenue drops 30%? ---
$stressRevenue = 0.70
$stressCash = [decimal]$OpAssumptions.OpeningCash
$stressMonthsBefore = 0
for ($m = 1; $m -le 12; $m++) {
    $baseIn = [decimal]$CashFlow[$m-1].Inflows.Total
    $baseOut = [decimal]$CashFlow[$m-1].Outflows.Total
    $stressCash += [math]::Round($baseIn * $stressRevenue - $baseOut, 2)
    if ($stressCash -gt 0 -and $stressMonthsBefore -eq 0) { $stressMonthsBefore = $m }
    if ($stressCash -le 0 -and $stressMonthsBefore -gt 0) { $stressMonthsBefore = $m; break }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    Assumptions = [PSCustomObject]@{
        OpeningCash = $OpAssumptions.OpeningCash
        MonthlyFixedOpEx = $monthlyFixedOpEx
        VariableOpExPct = "$([math]::Round($OpAssumptions.VariableOpExPct * 100))%"
        EstimatedTaxRate = "$([math]::Round($OpAssumptions.EstimatedTaxRate * 100))%"
        CreditLineLimit = $OpAssumptions.CreditLineLimit
        CreditLineRate = "$([math]::Round($OpAssumptions.CreditLineRate * 100))%"
        OpExBreakdown = $OpAssumptions.MonthlyOpEx
    }
    AnnualSummary = [PSCustomObject]@{
        OpeningCash = $OpAssumptions.OpeningCash
        EndingCash = [math]::Round($endingCash, 2)
        TotalInflows = [math]::Round($totalInflows12, 2)
        TotalOutflows = [math]::Round($totalOutflows12, 2)
        FreeCashFlow = $freeCashFlow
        TotalCapEx = $totalCapEx12
        TotalTaxPaid = [math]::Round($totalTax12, 2)
        CreditLineEndBalance = $CashFlow[11].CreditLine.Balance
        LowestCashPoint = [PSCustomObject]@{
            Month = $lowestMonth; Cash = [math]::Round($lowestCash, 2)
        }
    }
    WorkingCapitalMetrics = [PSCustomObject]@{
        DSO = "$dso days"
        CashConversionCycle = "$cashConversionCycle days"
        AvgMonthlyReceivables = [math]::Round($avgReceivables, 2)
        MonthlyInventoryInvestment = $monthlyInventorySpend
        AvgSupplierPaymentDays = $avgPayDays
    }
    StressTest = [PSCustomObject]@{
        Scenario = "Revenue -30%"
        MonthsBeforeCashNegative = $stressMonthsBefore
        Interpretation = if ($stressMonthsBefore -ge 12) { "Survives 12 months at -30% revenue" } else { "Cash runs out in month $stressMonthsBefore at -30% revenue" }
    }
    MonthlyCashFlow = $CashFlow
}

$output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
$openFmt = '{0:N0}' -f $OpAssumptions.OpeningCash
$endFmt = '{0:N0}' -f $endingCash
$fcfFmt = '{0:N0}' -f $freeCashFlow
$lowFmt = '{0:N0}' -f $lowestCash
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CASH FLOW & WORKING CAPITAL ANALYZER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Opening Cash:     `$$openFmt" -ForegroundColor White
Write-Host "  Ending Cash (M12): `$$endFmt" -ForegroundColor Green
Write-Host "  Free Cash Flow:   `$$fcfFmt" -ForegroundColor Green
Write-Host "  Lowest Point:     `$$lowFmt (Month $lowestMonth)" -ForegroundColor $(if ($lowestCash -lt 0) { "Red" } elseif ($lowestCash -lt 100000) { "Yellow" } else { "White" })
Write-Host ""
Write-Host "  Working Capital" -ForegroundColor Cyan
Write-Host "    DSO:                  $dso days" -ForegroundColor White
Write-Host "    Cash Conversion:      $cashConversionCycle days" -ForegroundColor White
Write-Host "    Monthly Fixed OpEx:   `$$("{0:N0}" -f $monthlyFixedOpEx)" -ForegroundColor White
Write-Host ""
Write-Host "  Stress Test (-30% Rev): $($output.StressTest.Interpretation)" -ForegroundColor $(if ($stressMonthsBefore -ge 12) { "Green" } else { "Red" })
Write-Host ""
Write-Host "  --- Monthly Cash Position ---" -ForegroundColor Cyan
foreach ($cf in $CashFlow) {
    $posFmt = '{0:N0}' -f $cf.CashPosition
    $color = switch ($cf.HealthFlag) { "CRITICAL" { "Red" } "WARNING" { "Red" } "TIGHT" { "Yellow" } default { "Green" } }
    $extra = if ($cf.CapExNote) { " [CapEx: $($cf.CapExNote)]" } else { "" }
    Write-Host "    $($cf.Label.PadRight(10)) `$$posFmt ($($cf.HealthFlag))$extra" -ForegroundColor $color
}
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
