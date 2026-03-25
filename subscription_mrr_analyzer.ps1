<# ================================================================
   FarmCeutica Subscription & MRR Analyzer
   Input:  farmceutica_master_skus.json, sku_rationalization.json
   Output: subscription_mrr_analysis.json
   Models MRR/ARR across subscription tiers, projects churn impact,
   calculates cohort LTV, and optimizes subscription pricing with
   discount strategies for the DTC channel.
   ================================================================ #>

param(
    [string]$MasterFile    = "./farmceutica_master_skus.json",
    [string]$RationalFile  = "./sku_rationalization.json",
    [string]$OutputFile    = "./subscription_mrr_analysis.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json
$Rational = Get-Content $RationalFile | ConvertFrom-Json

# --- Subscription Tier Definitions ---
$SubTiers = @(
    @{
        Name = "One-Time"; Code = "OTP"; DiscountPct = 0
        ChurnRate = 1.0; Description = "Single purchase, no subscription"
        AvgOrdersPerYear = 1.5; ShareOfCustomers = 0.30
    },
    @{
        Name = "Subscribe Monthly"; Code = "SUB1"; DiscountPct = 0.15
        ChurnRate = 0.12; Description = "Monthly autoship, 15% off"
        AvgOrdersPerYear = 10; ShareOfCustomers = 0.35
    },
    @{
        Name = "Subscribe Quarterly"; Code = "SUB3"; DiscountPct = 0.20
        ChurnRate = 0.08; Description = "Every 3 months, 20% off"
        AvgOrdersPerYear = 4; ShareOfCustomers = 0.20
    },
    @{
        Name = "Annual Wellness Plan"; Code = "ANN"; DiscountPct = 0.25
        ChurnRate = 0.05; Description = "Annual commitment, 25% off, priority shipping"
        AvgOrdersPerYear = 12; ShareOfCustomers = 0.10
    },
    @{
        Name = "Practitioner Protocol"; Code = "PRAC"; DiscountPct = 0.30
        ChurnRate = 0.03; Description = "Practitioner-managed protocol, 30% off, compliance tracking"
        AvgOrdersPerYear = 12; ShareOfCustomers = 0.05
    }
)

# --- Customer Base Assumptions ---
$CustomerBase = @{
    TotalActiveCustomers = 8500
    MonthlyNewCustomers = 650
    MonthlyGrowthRate = 0.04    # 4% month-over-month customer growth
    AvgProductsPerCustomer = 2.3
    SubscriptionConversionRate = 0.70  # 70% of customers subscribe
}

# --- Tier lookup for rationalization ---
$TierLookup = @{}
foreach ($s in $Rational.SKUs) { $TierLookup[$s.SKU] = $s.Tier }

# --- Category subscription affinity (how likely each category is to be subscribed) ---
$SubAffinity = @{
    Base = 0.85; Advanced = 0.80; Women = 0.75; Children = 0.70
    SNP = 0.90; Mushroom = 0.75; Testing = 0.10
}

# --- Per-SKU Subscription Economics ---
$SKUResults = @()

foreach ($sku in $Master) {
    $cat = $sku.Category
    $msrp = [decimal]$sku.MSRP
    $cogs = [decimal]$sku.COGS
    $tier = $TierLookup[$sku.SKU]
    $affinity = [decimal]$SubAffinity[$cat]

    $tierEconomics = @()

    foreach ($t in $SubTiers) {
        $subPrice = [math]::Round($msrp * (1 - $t.DiscountPct), 2)
        $margin = [math]::Round($subPrice - $cogs, 2)
        $marginPct = if ($subPrice -gt 0) { [math]::Round(($margin / $subPrice) * 100, 1) } else { 0 }

        # Expected lifetime months before churn (for subscribers)
        $monthlyChurn = [decimal]$t.ChurnRate
        $lifetimeMonths = if ($monthlyChurn -gt 0 -and $monthlyChurn -lt 1) { [math]::Round(1 / $monthlyChurn, 0) } elseif ($monthlyChurn -ge 1) { 1 } else { 120 }

        # Revenue per customer over lifetime
        $ordersPerMonth = $t.AvgOrdersPerYear / 12
        $ltRevenue = [math]::Round($subPrice * $ordersPerMonth * $lifetimeMonths, 2)
        $ltProfit = [math]::Round($margin * $ordersPerMonth * $lifetimeMonths, 2)

        # Monthly revenue contribution per subscriber
        $mrrPerSub = [math]::Round($subPrice * $ordersPerMonth, 2)

        $tierEconomics += [PSCustomObject]@{
            Tier = $t.Name
            Code = $t.Code
            SubscriptionPrice = $subPrice
            DiscountPct = "$([math]::Round($t.DiscountPct * 100))%"
            MarginPerUnit = $margin
            MarginPct = $marginPct
            MonthlyChurnRate = "$([math]::Round($monthlyChurn * 100, 1))%"
            ExpectedLifetimeMonths = $lifetimeMonths
            LifetimeRevenue = $ltRevenue
            LifetimeProfit = $ltProfit
            MRRPerSubscriber = $mrrPerSub
        }
    }

    # Best tier for this SKU (highest lifetime profit, excluding one-time)
    $bestSub = $tierEconomics | Where-Object { $_.Code -ne "OTP" } | Sort-Object LifetimeProfit -Descending | Select-Object -First 1

    $SKUResults += [PSCustomObject]@{
        SKU = $sku.SKU
        Name = $sku.Name
        Category = $cat
        RatTier = $tier
        MSRP = $msrp
        COGS = $cogs
        SubscriptionAffinity = "$([math]::Round($affinity * 100))%"
        BestSubscriptionTier = $bestSub.Tier
        BestLifetimeProfit = $bestSub.LifetimeProfit
        TierEconomics = $tierEconomics
    }
}

# --- Portfolio MRR Model ---
$totalCustomers = $CustomerBase.TotalActiveCustomers
$avgProducts = $CustomerBase.AvgProductsPerCustomer
$subConversion = $CustomerBase.SubscriptionConversionRate

# Calculate blended MRR across all tiers and SKUs
$portfolioMRR = [decimal]0
$portfolioSubscribers = 0
$tierMRRBreakdown = @()

foreach ($t in $SubTiers) {
    $tierCustomers = [math]::Round($totalCustomers * $t.ShareOfCustomers)
    $tierSubscribers = [math]::Round($tierCustomers * $avgProducts)

    # Blended MRR for this tier (weighted avg across SKU MSRPs)
    $avgMSRP = [math]::Round(($Master | ForEach-Object { [decimal]$_.MSRP } | Measure-Object -Average).Average, 2)
    $subPrice = [math]::Round($avgMSRP * (1 - $t.DiscountPct), 2)
    $ordersPerMonth = $t.AvgOrdersPerYear / 12
    $tierMRR = [math]::Round($tierSubscribers * $subPrice * $ordersPerMonth, 2)

    $portfolioMRR += $tierMRR
    $portfolioSubscribers += $tierSubscribers

    $tierMRRBreakdown += [PSCustomObject]@{
        Tier = $t.Name
        Customers = $tierCustomers
        Subscriptions = $tierSubscribers
        AvgSubPrice = $subPrice
        MonthlyChurn = "$([math]::Round($t.ChurnRate * 100, 1))%"
        MRR = $tierMRR
        ARR = [math]::Round($tierMRR * 12, 2)
        ShareOfMRR = 0  # calculated below
    }
}

# Calculate MRR shares
foreach ($t in $tierMRRBreakdown) {
    $t.ShareOfMRR = if ($portfolioMRR -gt 0) { "$([math]::Round(($t.MRR / $portfolioMRR) * 100, 1))%" } else { "0%" }
}

# --- 12-Month MRR Projection ---
$MRRProjection = @()
$projCustomers = $totalCustomers
$projMRR = $portfolioMRR

for ($m = 1; $m -le 12; $m++) {
    # New customers
    $newCustomers = [math]::Round($CustomerBase.MonthlyNewCustomers * [math]::Pow(1 + $CustomerBase.MonthlyGrowthRate, $m - 1))

    # Blended churn (weighted by tier shares)
    $blendedChurn = 0
    foreach ($t in $SubTiers) {
        $blendedChurn += $t.ChurnRate * $t.ShareOfCustomers
    }
    $churnedCustomers = [math]::Round($projCustomers * $blendedChurn)

    $projCustomers = $projCustomers + $newCustomers - $churnedCustomers
    $netNew = $newCustomers - $churnedCustomers

    # MRR grows with customer base
    $growthFactor = $projCustomers / $totalCustomers
    $projMRR = [math]::Round($portfolioMRR * $growthFactor, 2)

    $MRRProjection += [PSCustomObject]@{
        Month = $m
        ActiveCustomers = $projCustomers
        NewCustomers = $newCustomers
        ChurnedCustomers = $churnedCustomers
        NetNewCustomers = $netNew
        MRR = $projMRR
        ARR = [math]::Round($projMRR * 12, 2)
        MoMGrowth = if ($m -gt 1) { "$([math]::Round((($projMRR - $MRRProjection[$m-2].MRR) / $MRRProjection[$m-2].MRR) * 100, 1))%" } else { "-" }
    }
}

$month12MRR = $MRRProjection[11].MRR
$mrrGrowthPct = [math]::Round((($month12MRR - $portfolioMRR) / $portfolioMRR) * 100, 1)

# --- Churn Revenue Impact Analysis ---
$churnImpact = @()
foreach ($rate in @(0.03, 0.05, 0.08, 0.10, 0.15, 0.20)) {
    $monthlyLost = [math]::Round($portfolioMRR * $rate, 2)
    $annualLost = [math]::Round($monthlyLost * 12, 2)
    $churnImpact += [PSCustomObject]@{
        ChurnRate = "$([math]::Round($rate * 100))%"
        MonthlyRevenueLost = $monthlyLost
        AnnualRevenueLost = $annualLost
        CustomersLostPerMonth = [math]::Round($portfolioSubscribers * $rate)
    }
}

# --- Subscription Optimization Recommendations ---
$catSubscriptionPotential = $SKUResults | Group-Object Category | ForEach-Object {
    $avgAffinity = ($_.Group | ForEach-Object { [decimal]($_.SubscriptionAffinity -replace '%','') } | Measure-Object -Average).Average
    $avgLifetimeProfit = ($_.Group | ForEach-Object { $_.BestLifetimeProfit } | Measure-Object -Average).Average
    $topSKU = $_.Group | Sort-Object BestLifetimeProfit -Descending | Select-Object -First 1
    [PSCustomObject]@{
        Category = $_.Name
        SKUCount = $_.Count
        AvgSubAffinity = "$([math]::Round($avgAffinity))%"
        AvgLifetimeProfit = [math]::Round($avgLifetimeProfit, 2)
        TopSKU = "$($topSKU.SKU) $($topSKU.Name)"
        TopLifetimeProfit = $topSKU.BestLifetimeProfit
    }
}

# Top 10 SKUs by subscription lifetime profit
$top10Sub = $SKUResults | Sort-Object BestLifetimeProfit -Descending | Select-Object -First 10 | ForEach-Object {
    [PSCustomObject]@{
        SKU = $_.SKU; Name = $_.Name; Category = $_.Category; RatTier = $_.RatTier
        MSRP = $_.MSRP; BestTier = $_.BestSubscriptionTier
        LifetimeProfit = $_.BestLifetimeProfit
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    CustomerAssumptions = $CustomerBase
    SubscriptionTiers = ($SubTiers | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.Name; Code = $_.Code; Discount = "$([math]::Round($_.DiscountPct * 100))%"
            MonthlyChurn = "$([math]::Round($_.ChurnRate * 100, 1))%"
            OrdersPerYear = $_.AvgOrdersPerYear; CustomerShare = "$([math]::Round($_.ShareOfCustomers * 100))%"
        }
    })
    CurrentState = [PSCustomObject]@{
        TotalActiveCustomers = $totalCustomers
        TotalSubscriptions = $portfolioSubscribers
        CurrentMRR = $portfolioMRR
        CurrentARR = [math]::Round($portfolioMRR * 12, 2)
        TierBreakdown = $tierMRRBreakdown
    }
    MRRProjection12Month = [PSCustomObject]@{
        Month1MRR = $portfolioMRR
        Month12MRR = $month12MRR
        GrowthPct = "$mrrGrowthPct%"
        Month12ARR = [math]::Round($month12MRR * 12, 2)
        Monthly = $MRRProjection
    }
    ChurnImpactAnalysis = $churnImpact
    CategoryPotential = $catSubscriptionPotential
    Top10SubscriptionSKUs = $top10Sub
    SKUDetails = $SKUResults
}

$output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
$mrrFmt = '{0:N0}' -f $portfolioMRR
$arrFmt = '{0:N0}' -f ($portfolioMRR * 12)
$m12Fmt = '{0:N0}' -f $month12MRR
$m12ARR = '{0:N0}' -f ($month12MRR * 12)
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SUBSCRIPTION & MRR ANALYZER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Current MRR:  `$$mrrFmt" -ForegroundColor Green
Write-Host "  Current ARR:  `$$arrFmt" -ForegroundColor Green
Write-Host "  Subscribers:  $portfolioSubscribers across $totalCustomers customers" -ForegroundColor White
Write-Host ""
Write-Host "  12-Month Projection" -ForegroundColor Cyan
Write-Host "    M12 MRR:    `$$m12Fmt ($mrrGrowthPct% growth)" -ForegroundColor Green
Write-Host "    M12 ARR:    `$$m12ARR" -ForegroundColor Green
Write-Host "    M12 Customers: $($MRRProjection[11].ActiveCustomers)" -ForegroundColor White
Write-Host ""
Write-Host "  --- MRR by Tier ---" -ForegroundColor Cyan
foreach ($t in $tierMRRBreakdown) {
    $tFmt = '{0:N0}' -f $t.MRR
    Write-Host "    $($t.Tier.PadRight(25)) `$$tFmt/mo ($($t.ShareOfMRR))" -ForegroundColor White
}
Write-Host ""
Write-Host "  Top 3 Subscription SKUs (Lifetime Profit)" -ForegroundColor Cyan
foreach ($s in ($top10Sub | Select-Object -First 3)) {
    $ltFmt = '{0:N0}' -f $s.LifetimeProfit
    Write-Host "    $($s.SKU) $($s.Name.PadRight(30)) `$$ltFmt ($($s.BestTier))" -ForegroundColor White
}
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
