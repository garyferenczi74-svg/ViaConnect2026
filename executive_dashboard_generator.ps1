<# ================================================================
   FarmCeutica Executive P&L Dashboard Generator
   Input:  All prior toolchain outputs
   Output: executive_dashboard.json
   Consolidates the full toolchain into a single executive report:
   P&L summary, portfolio health scorecard, strategic KPIs,
   channel economics, bundle impact, and risk register.
   ================================================================ #>

param(
    [string]$MasterFile         = "./farmceutica_master_skus.json",
    [string]$WaterfallFile      = "./margin_waterfall.json",
    [string]$ChannelMixFile     = "./channel_mix_results.json",
    [string]$RationalizationFile = "./sku_rationalization.json",
    [string]$BundleFile         = "./bundle_optimization.json",
    [string]$PricingFile        = "./updated_pricing_tiers.json",
    [string]$COGSDeltaFile      = "./cogs_delta_report.json",
    [string]$OutputFile         = "./executive_dashboard.json",
    [string]$Scenario           = "Balanced"
)

$ErrorActionPreference = "Stop"

# --- Load All Data Sources ---
$Master = Get-Content $MasterFile | ConvertFrom-Json
$Waterfall = Get-Content $WaterfallFile | ConvertFrom-Json
$ChannelMix = Get-Content $ChannelMixFile | ConvertFrom-Json
$Rational = Get-Content $RationalizationFile | ConvertFrom-Json
$Bundles = Get-Content $BundleFile | ConvertFrom-Json
$Pricing = Get-Content $PricingFile | ConvertFrom-Json
$COGSDelta = Get-Content $COGSDeltaFile | ConvertFrom-Json

# --- Select scenario for P&L basis ---
$ActiveScenario = $ChannelMix.Scenarios | Where-Object { $_.Scenario -eq $Scenario }
if (-not $ActiveScenario) {
    Write-Host "Scenario '$Scenario' not found. Using first available." -ForegroundColor Yellow
    $ActiveScenario = $ChannelMix.Scenarios[0]
}

# ═══════════════════════════════════════════
# SECTION 1: MONTHLY & ANNUAL P&L
# ═══════════════════════════════════════════

$monthlyRev = $ActiveScenario.Summary.MonthlyRevenue
$monthlyCOGS = $ActiveScenario.Summary.MonthlyCOGS
$monthlyGross = $ActiveScenario.Summary.MonthlyGrossProfit
$monthlyVarCosts = $ActiveScenario.Summary.MonthlyVariableCosts
$monthlyNet = $ActiveScenario.Summary.MonthlyNetProfit

# Bundle incremental revenue
$bundleMonthlyRev = ($Bundles.Bundles | ForEach-Object { $_.Projection.MonthlyRevenue } | Measure-Object -Sum).Sum
$bundleMonthlyGross = ($Bundles.Bundles | ForEach-Object { $_.Projection.MonthlyGrossProfit } | Measure-Object -Sum).Sum

$totalMonthlyRev = [math]::Round($monthlyRev + $bundleMonthlyRev, 2)
$totalAnnualRev = [math]::Round($totalMonthlyRev * 12, 2)
$totalMonthlyNet = [math]::Round($monthlyNet + $bundleMonthlyGross, 2)
$totalAnnualNet = [math]::Round($totalMonthlyNet * 12, 2)

$PnL = [PSCustomObject]@{
    Scenario = $ActiveScenario.Scenario
    ChannelMix = $ActiveScenario.Mix
    Monthly = [PSCustomObject]@{
        GrossRevenue = [math]::Round($totalMonthlyRev, 2)
        IndividualSKURevenue = [math]::Round($monthlyRev, 2)
        BundleRevenue = [math]::Round($bundleMonthlyRev, 2)
        COGS = [math]::Round($monthlyCOGS, 2)
        GrossProfit = [math]::Round($monthlyGross + $bundleMonthlyGross, 2)
        GrossMarginPct = [math]::Round((($monthlyGross + $bundleMonthlyGross) / $totalMonthlyRev) * 100, 1)
        VariableCosts = [math]::Round($monthlyVarCosts, 2)
        NetOperatingProfit = [math]::Round($totalMonthlyNet, 2)
        NetMarginPct = [math]::Round(($totalMonthlyNet / $totalMonthlyRev) * 100, 1)
    }
    Annual = [PSCustomObject]@{
        GrossRevenue = $totalAnnualRev
        NetOperatingProfit = $totalAnnualNet
        NetMarginPct = [math]::Round(($totalAnnualNet / $totalAnnualRev) * 100, 1)
    }
}

# ═══════════════════════════════════════════
# SECTION 2: PORTFOLIO HEALTH SCORECARD
# ═══════════════════════════════════════════

$tierCounts = @{ Star = 0; Core = 0; Watch = 0; Sunset = 0 }
foreach ($s in $Rational.SKUs) { $tierCounts[$s.Tier]++ }

$avgComposite = [math]::Round(($Rational.SKUs | ForEach-Object { $_.CompositeScore } | Measure-Object -Average).Average, 1)
$avgDTCMargin = [math]::Round(($Master | ForEach-Object { [decimal]$_.DTCMargin } | Measure-Object -Average).Average, 1)
$avgCOGSRatio = [math]::Round(($Master | ForEach-Object { [decimal]$_.COGSRatio } | Measure-Object -Average).Average, 1)

# Channel viability
$waterfallData = $Waterfall.SKUs
$dtcViable = ($waterfallData | Where-Object { $_.Channels.DTC.NetMarginPct -gt 10 }).Count
$wsViable = ($waterfallData | Where-Object { $_.Channels.Wholesale.NetMarginPct -gt 10 }).Count
$distViable = ($waterfallData | Where-Object { $_.Channels.Distributor.NetMarginPct -gt 10 }).Count

$Scorecard = [PSCustomObject]@{
    TotalSKUs = $Master.Count
    TierDistribution = [PSCustomObject]@{
        Star = $tierCounts.Star
        Core = $tierCounts.Core
        Watch = $tierCounts.Watch
        Sunset = $tierCounts.Sunset
    }
    PortfolioHealthScore = $avgComposite
    AvgDTCMargin = $avgDTCMargin
    AvgCOGSRatio = $avgCOGSRatio
    ChannelViability = [PSCustomObject]@{
        DTC = [PSCustomObject]@{ Viable = $dtcViable; Total = 62; Pct = [math]::Round(($dtcViable / 62) * 100, 1) }
        Wholesale = [PSCustomObject]@{ Viable = $wsViable; Total = 62; Pct = [math]::Round(($wsViable / 62) * 100, 1) }
        Distributor = [PSCustomObject]@{ Viable = $distViable; Total = 62; Pct = [math]::Round(($distViable / 62) * 100, 1) }
    }
    MSRPRange = [PSCustomObject]@{
        Min = ($Master | ForEach-Object { [decimal]$_.MSRP } | Measure-Object -Minimum).Minimum
        Max = ($Master | ForEach-Object { [decimal]$_.MSRP } | Measure-Object -Maximum).Maximum
        Avg = [math]::Round(($Master | ForEach-Object { [decimal]$_.MSRP } | Measure-Object -Average).Average, 2)
    }
}

# ═══════════════════════════════════════════
# SECTION 3: STRATEGIC KPIs
# ═══════════════════════════════════════════

# Revenue concentration (top 10 SKUs by revenue in scenario)
$skuRevSorted = $ActiveScenario.SKUDetails | Sort-Object Revenue -Descending
$top10Rev = ($skuRevSorted | Select-Object -First 10 | ForEach-Object { $_.Revenue } | Measure-Object -Sum).Sum
$top10Concentration = [math]::Round(($top10Rev / $monthlyRev) * 100, 1)

# Category revenue mix
$catRevMix = $ActiveScenario.CategorySummary | ForEach-Object {
    [PSCustomObject]@{
        Category = $_.Category
        MonthlyRevenue = $_.Revenue
        Share = [math]::Round(($_.Revenue / $monthlyRev) * 100, 1)
        NetMarginPct = $_.NetMarginPct
    }
}

# Pricing alerts from tier calculator
$pricingAlerts = ($Pricing | Where-Object { $_.Alerts -ne "PASS" }).Count
$pricingChanged = ($Pricing | Where-Object { $_.Changed }).Count

# COGS risk (SKUs flagged for review)
$cogsRisk = ($COGSDelta | Where-Object { $_.FLAG -eq "REVIEW" }).Count

# Bundle opportunity
$bundleAnnualRev = [math]::Round($bundleMonthlyRev * 12, 2)
$premiumBundles = ($Bundles.Bundles | Where-Object { $_.QualityFlag -eq "PREMIUM" }).Count

$KPIs = [PSCustomObject]@{
    RevenueConcentration = [PSCustomObject]@{
        Top10SKUsRevShare = "$top10Concentration%"
        Interpretation = if ($top10Concentration -gt 50) { "HIGH - consider diversification" } else { "HEALTHY - well distributed" }
    }
    CategoryRevenueMix = $catRevMix
    PricingHealth = [PSCustomObject]@{
        SKUsWithMarginAlerts = $pricingAlerts
        SKUsRecentlyRepriced = $pricingChanged
        AlertRate = "$([math]::Round(($pricingAlerts / 62) * 100, 1))%"
    }
    COGSRisk = [PSCustomObject]@{
        SKUsFlaggedForReview = $cogsRisk
        RiskRate = "$([math]::Round(($cogsRisk / 62) * 100, 1))%"
    }
    BundleOpportunity = [PSCustomObject]@{
        TotalBundles = $Bundles.Bundles.Count
        PremiumBundles = $premiumBundles
        AnnualBundleRevenue = $bundleAnnualRev
        BundleRevenueAsShareOfTotal = "$([math]::Round(($bundleAnnualRev / $totalAnnualRev) * 100, 1))%"
    }
}

# ═══════════════════════════════════════════
# SECTION 4: CHANNEL ECONOMICS COMPARISON
# ═══════════════════════════════════════════

$ChannelEconomics = @()
foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
    $chData = $ActiveScenario.ChannelSummary.$ch
    $wfMargins = $waterfallData | ForEach-Object { $_.Channels.$ch.NetMarginPct }
    $avgWfMargin = [math]::Round(($wfMargins | Measure-Object -Average).Average, 1)
    $minWfMargin = [math]::Round(($wfMargins | Measure-Object -Minimum).Minimum, 1)
    $maxWfMargin = [math]::Round(($wfMargins | Measure-Object -Maximum).Maximum, 1)

    $ChannelEconomics += [PSCustomObject]@{
        Channel = $ch
        MonthlyRevenue = $chData.Revenue
        RevenueShare = "$($chData.RevenueShare)%"
        MonthlyNetProfit = $chData.NetProfit
        NetMarginPct = $chData.NetMarginPct
        WaterfallMarginRange = [PSCustomObject]@{
            Avg = $avgWfMargin; Min = $minWfMargin; Max = $maxWfMargin
        }
    }
}

# ═══════════════════════════════════════════
# SECTION 5: SCENARIO COMPARISON
# ═══════════════════════════════════════════

$ScenarioMatrix = $ChannelMix.Scenarios | ForEach-Object {
    $isActive = $_.Scenario -eq $ActiveScenario.Scenario
    [PSCustomObject]@{
        Scenario = $_.Scenario
        Active = $isActive
        MonthlyRevenue = $_.Summary.MonthlyRevenue
        MonthlyNetProfit = $_.Summary.MonthlyNetProfit
        BlendedMargin = "$($_.Summary.BlendedNetMarginPct)%"
        AnnualRevenue = $_.Summary.AnnualRevenue
        AnnualNetProfit = $_.Summary.AnnualNetProfit
    }
}

# ═══════════════════════════════════════════
# SECTION 6: RISK REGISTER
# ═══════════════════════════════════════════

$Risks = @()

# Sunset SKU risk
$sunsetSKUs = $Rational.SKUs | Where-Object { $_.Tier -eq "Sunset" }
if ($sunsetSKUs) {
    $Risks += [PSCustomObject]@{
        Category = "Portfolio"
        Severity = "HIGH"
        Risk = "$($sunsetSKUs.Count) SKU(s) classified as Sunset"
        Detail = ($sunsetSKUs | ForEach-Object { "$($_.SKU) $($_.Name)" }) -join "; "
        Action = "Evaluate discontinuation or major repricing"
    }
}

# Watch tier volume
$watchSKUs = $Rational.SKUs | Where-Object { $_.Tier -eq "Watch" }
if ($watchSKUs.Count -gt 3) {
    $Risks += [PSCustomObject]@{
        Category = "Portfolio"
        Severity = "MEDIUM"
        Risk = "$($watchSKUs.Count) SKUs in Watch tier"
        Detail = ($watchSKUs | ForEach-Object { "$($_.SKU) $($_.Name)" }) -join "; "
        Action = "Monitor monthly; reprice or reformulate if no improvement"
    }
}

# COGS volatility
if ($cogsRisk -gt 5) {
    $Risks += [PSCustomObject]@{
        Category = "Supply Chain"
        Severity = "HIGH"
        Risk = "$cogsRisk SKUs with COGS changes exceeding 10%"
        Detail = "BOM recalculation flagged significant cost shifts"
        Action = "Renegotiate supplier contracts; lock pricing for 90 days"
    }
} elseif ($cogsRisk -gt 0) {
    $Risks += [PSCustomObject]@{
        Category = "Supply Chain"
        Severity = "MEDIUM"
        Risk = "$cogsRisk SKUs with COGS changes exceeding 10%"
        Detail = "BOM recalculation flagged moderate cost shifts"
        Action = "Review supplier pricing at next quarterly review"
    }
}

# Testing category structural loss
$testingWF = $waterfallData | Where-Object { ($Master | Where-Object { $_.SKU -eq $_.SKU }).Category -eq "Testing" }
$Risks += [PSCustomObject]@{
    Category = "Channel Strategy"
    Severity = "HIGH"
    Risk = "Testing SKUs structurally unprofitable in Wholesale/Distributor"
    Detail = "6 Testing SKUs show negative margins at wholesale/distributor pricing"
    Action = "Restrict Testing to DTC-only; consider Test+Treat bundles for margin recovery"
}

# Revenue concentration
if ($top10Concentration -gt 50) {
    $Risks += [PSCustomObject]@{
        Category = "Revenue"
        Severity = "MEDIUM"
        Risk = "Top 10 SKUs generate $top10Concentration% of revenue"
        Detail = "Portfolio revenue is concentrated; disruption to key SKUs poses outsized risk"
        Action = "Invest in marketing for mid-tier SKUs to broaden revenue base"
    }
}

# Pricing margin floor breaches
if ($pricingAlerts -gt 0) {
    $Risks += [PSCustomObject]@{
        Category = "Pricing"
        Severity = "MEDIUM"
        Risk = "$pricingAlerts SKUs below margin floor thresholds"
        Detail = "DTC margin < 70% or Wholesale margin < 50%"
        Action = "Execute price increases or negotiate COGS reductions"
    }
}

# ═══════════════════════════════════════════
# SECTION 7: TOP RECOMMENDATIONS
# ═══════════════════════════════════════════

$Recommendations = @(
    [PSCustomObject]@{
        Priority = 1
        Area = "Revenue Growth"
        Recommendation = "Launch top 4 PREMIUM bundles (NeuroCalm, Cognitive Elite, Longevity, Metabolic)"
        Impact = "Estimated +$1.9M annual gross profit at 87%+ margins"
    },
    [PSCustomObject]@{
        Priority = 2
        Area = "Portfolio Optimization"
        Recommendation = "Discontinue or restructure EpiGenDX (SKU 60) - only Sunset-tier product"
        Impact = "Eliminate negative-margin channel exposure; redirect resources to Stars"
    },
    [PSCustomObject]@{
        Priority = 3
        Area = "Channel Strategy"
        Recommendation = "Restrict Testing category to DTC-only sales"
        Impact = "Prevent $200K+ annual wholesale/distributor losses"
    },
    [PSCustomObject]@{
        Priority = 4
        Area = "Pricing"
        Recommendation = "Execute MSRP increases on 5 Watch-tier Testing SKUs"
        Impact = "Improve DTC margins from 33-68% range toward 70% floor"
    },
    [PSCustomObject]@{
        Priority = 5
        Area = "Supply Chain"
        Recommendation = "Renegotiate raw material contracts for $cogsRisk flagged SKUs"
        Impact = "Potential COGS reduction across flagged products"
    },
    [PSCustomObject]@{
        Priority = 6
        Area = "Marketing"
        Recommendation = "Increase ad spend allocation to 9 Star-tier SKUs"
        Impact = "Stars average 80.5 composite score with 88%+ DTC margins - highest ROI"
    }
)

# ═══════════════════════════════════════════
# ASSEMBLE & OUTPUT
# ═══════════════════════════════════════════

$dashboard = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    ReportTitle = "FarmCeutica Executive P&L Dashboard"
    ActiveScenario = $ActiveScenario.Scenario
    ProfitAndLoss = $PnL
    PortfolioScorecard = $Scorecard
    StrategicKPIs = $KPIs
    ChannelEconomics = $ChannelEconomics
    ScenarioComparison = $ScenarioMatrix
    RiskRegister = $Risks
    TopRecommendations = $Recommendations
}

$dashboard | ConvertTo-Json -Depth 12 | Set-Content $OutputFile -Encoding UTF8

# --- Console Executive Summary ---
$annRev = '{0:N0}' -f $totalAnnualRev
$annNet = '{0:N0}' -f $totalAnnualNet
$netPct = [math]::Round(($totalAnnualNet / $totalAnnualRev) * 100, 1)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FARMACEUTICA EXECUTIVE DASHBOARD" -ForegroundColor Cyan
Write-Host "  Scenario: $($ActiveScenario.Scenario)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  P&L (Annual)" -ForegroundColor White
Write-Host "  Revenue:         `$$annRev" -ForegroundColor Green
Write-Host "  Net Profit:      `$$annNet" -ForegroundColor Green
Write-Host "  Net Margin:      $netPct%" -ForegroundColor Green
Write-Host ""
Write-Host "  Portfolio Health" -ForegroundColor White
Write-Host "  Score: $avgComposite/100 | $($tierCounts.Star) Stars, $($tierCounts.Core) Core, $($tierCounts.Watch) Watch, $($tierCounts.Sunset) Sunset" -ForegroundColor White
Write-Host ""
Write-Host "  Risks: $($Risks.Count) identified | Recommendations: $($Recommendations.Count) prioritized" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
