<# ================================================================
   FarmCeutica Bundle & Promotion Optimizer
   Input:  farmceutica_master_skus.json, sku_rationalization.json
   Output: bundle_optimization.json
   Designs optimal product bundles from rationalization data, calculates
   bundle pricing with tiered discounts, and projects revenue uplift
   vs unbundled sales.
   ================================================================ #>

param(
    [string]$MasterFile         = "./farmceutica_master_skus.json",
    [string]$RationalizationFile = "./sku_rationalization.json",
    [string]$OutputFile         = "./bundle_optimization.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json
$Rational = Get-Content $RationalizationFile | ConvertFrom-Json

# --- Lookup tables ---
$SKULookup = @{}
foreach ($s in $Master) { $SKULookup[$s.SKU] = $s }

$TierLookup = @{}
$ScoreLookup = @{}
foreach ($s in $Rational.SKUs) {
    $TierLookup[$s.SKU] = $s.Tier
    $ScoreLookup[$s.SKU] = $s.CompositeScore
}

# --- Bundle Discount Tiers ---
$DiscountTiers = @{
    "2-Pack"  = 0.10   # 10% off combined MSRP
    "3-Pack"  = 0.15   # 15% off
    "4-Pack"  = 0.18   # 18% off
    "5-Pack+" = 0.20   # 20% off
}

# --- Monthly Volume Assumptions (bundled vs unbundled) ---
$BundleUplift = 1.25  # 25% volume uplift from bundling
$BaseMonthlyBundleSales = 120  # base monthly bundle units sold

# --- Bundle Strategy Rules ---
# 1. Anchor bundles around Star SKUs
# 2. Cross-category bundles for broader appeal
# 3. Same-category depth bundles for specialists
# 4. Protocol bundles (condition-based groupings)
# 5. Never bundle Sunset SKUs

# --- Define Bundle Templates ---
$BundleTemplates = @(
    # --- STAR ANCHOR BUNDLES ---
    @{
        Name = "NeuroCalm Complete Protocol"
        Strategy = "Star Anchor"
        Description = "Full neurological support stack built around top-scoring NeuroCalm line"
        SKUs = @("06", "14", "23", "15")  # BH4, Calm+, BH4+ Advanced, RELAX+
        TargetAudience = "Anxiety, stress, sleep optimization"
    },
    @{
        Name = "Metabolic Activation Stack"
        Strategy = "Star Anchor"
        Description = "GLP-1 + ketone + electrolyte support for metabolic health"
        SKUs = @("04", "01", "03", "09")  # GLP-1, BHB, Electrolyte, Creatine
        TargetAudience = "Weight management, metabolic optimization, keto"
    },
    @{
        Name = "Cognitive Elite Bundle"
        Strategy = "Star Anchor"
        Description = "Premium nootropic stack for peak mental performance"
        SKUs = @("19", "23", "54")  # FOCUS+, BH4+ Advanced, Lions Mane
        TargetAudience = "Executives, students, cognitive performance"
    },
    @{
        Name = "Longevity Foundation Pack"
        Strategy = "Star Anchor"
        Description = "Anti-aging essentials anchored by telomere and NAD+ support"
        SKUs = @("17", "11", "05", "07")  # Teloprime, NAD+, Magnesium, Omega-3
        TargetAudience = "Anti-aging, healthspan optimization"
    },

    # --- CROSS-CATEGORY BUNDLES ---
    @{
        Name = "Women's Vitality Essentials"
        Strategy = "Cross-Category"
        Description = "Hormonal balance + foundational nutrition for women"
        SKUs = @("25", "05", "07", "02")  # DESIRE+, Magnesium, Omega-3, MethylB
        TargetAudience = "Women 30-55, hormonal health"
    },
    @{
        Name = "Prenatal to Postnatal Journey"
        Strategy = "Cross-Category"
        Description = "Complete maternal support from conception through recovery"
        SKUs = @("26", "27", "28", "02")  # Grow+, Revitalizher, Thrive+, MethylB
        TargetAudience = "Expecting and new mothers"
    },
    @{
        Name = "Family Wellness Pack"
        Strategy = "Cross-Category"
        Description = "Something for every family member - adults and kids"
        SKUs = @("10", "05", "31", "07")  # CATALYST+, Magnesium, Kids Gummies, Omega-3
        TargetAudience = "Families with children"
    },
    @{
        Name = "Detox & Repair Protocol"
        Strategy = "Cross-Category"
        Description = "Comprehensive detoxification and gut restoration"
        SKUs = @("08", "16", "12", "18")  # ToxiBind, Clean+, Balance+, DigestiZorb
        TargetAudience = "Detox protocols, gut health recovery"
    },

    # --- SAME-CATEGORY DEPTH BUNDLES ---
    @{
        Name = "Mushroom Immunity Stack"
        Strategy = "Category Depth"
        Description = "All five functional mushroom varieties for comprehensive immune support"
        SKUs = @("52", "53", "54", "55", "56")  # All mushrooms
        TargetAudience = "Immune support, functional mushroom enthusiasts"
    },
    @{
        Name = "Methylation Master Protocol"
        Strategy = "Category Depth"
        Description = "Core methylation SNP support panel"
        SKUs = @("41", "42", "43", "35")  # MTHFR, MTR, MTRR, BHMT
        TargetAudience = "Patients with methylation SNPs"
    },
    @{
        Name = "Histamine Freedom Protocol"
        Strategy = "Category Depth"
        Description = "Complete histamine management from SNP to symptom relief"
        SKUs = @("24", "38", "18")  # Histamine Relief, DAO+, DigestiZorb
        TargetAudience = "Histamine intolerance, mast cell patients"
    },

    # --- PERFORMANCE BUNDLES ---
    @{
        Name = "Athletic Performance Max"
        Strategy = "Performance"
        Description = "Strength, endurance, and recovery stack for athletes"
        SKUs = @("09", "13", "21", "03")  # Creatine, BLAST+, FLEX+, Electrolyte
        TargetAudience = "Athletes, fitness enthusiasts"
    },
    @{
        Name = "Men's Optimization Stack"
        Strategy = "Performance"
        Description = "Testosterone, nitric oxide, and energy for men"
        SKUs = @("20", "13", "10", "09")  # RISE+, BLAST+, CATALYST+, Creatine
        TargetAudience = "Men 35-60, vitality and performance"
    },

    # --- TEST + SUPPLEMENT COMBOS ---
    @{
        Name = "Methylation Test & Treat"
        Strategy = "Test + Treat"
        Description = "Genetic methylation test with matched supplement protocol"
        SKUs = @("57", "41", "02", "35")  # Meth Test, MTHFR+, MethylB, BHMT+
        TargetAudience = "New patients seeking personalized protocol"
    },
    @{
        Name = "Complete Assessment Package"
        Strategy = "Test + Treat"
        Description = "Full genetic + hormone testing with foundational supplements"
        SKUs = @("61", "05", "07", "02")  # Combo Test, Magnesium, Omega-3, MethylB
        TargetAudience = "Comprehensive health optimization seekers"
    }
)

# --- Calculate Bundle Economics ---
$BundleResults = @()

foreach ($tmpl in $BundleTemplates) {
    $skuCount = $tmpl.SKUs.Count
    $discountKey = switch ($skuCount) {
        2 { "2-Pack" }
        3 { "3-Pack" }
        4 { "4-Pack" }
        default { "5-Pack+" }
    }
    $discountRate = $DiscountTiers[$discountKey]

    # Calculate component totals
    $components = @()
    $totalMSRP = [decimal]0
    $totalCOGS = [decimal]0
    $totalWholesale = [decimal]0
    $avgScore = [decimal]0
    $starCount = 0
    $hasWatch = $false

    foreach ($skuId in $tmpl.SKUs) {
        $s = $SKULookup[$skuId]
        $tier = $TierLookup[$skuId]
        $score = $ScoreLookup[$skuId]
        if ($tier -eq "Star") { $starCount++ }
        if ($tier -eq "Watch") { $hasWatch = $true }

        $components += [PSCustomObject]@{
            SKU = $skuId
            Name = $s.Name
            MSRP = [decimal]$s.MSRP
            COGS = [decimal]$s.COGS
            Tier = $tier
            Score = $score
        }
        $totalMSRP += [decimal]$s.MSRP
        $totalCOGS += [decimal]$s.COGS
        $totalWholesale += [decimal]$s.Wholesale
        $avgScore += $score
    }
    $avgScore = [math]::Round($avgScore / $skuCount, 1)

    # Bundle pricing
    $bundlePrice = [math]::Round($totalMSRP * (1 - $discountRate), 2)
    $savings = [math]::Round($totalMSRP - $bundlePrice, 2)
    $bundleMargin = [math]::Round((($bundlePrice - $totalCOGS) / $bundlePrice) * 100, 1)
    $bundleWSPrice = [math]::Round($bundlePrice * 0.50, 2)
    $bundleWSMargin = [math]::Round((($bundleWSPrice - $totalCOGS) / $bundleWSPrice) * 100, 1)

    # Revenue projection
    $monthlyUnits = [math]::Round($BaseMonthlyBundleSales * ($avgScore / 70))  # scale by quality
    $monthlyRevenue = [math]::Round($monthlyUnits * $bundlePrice, 2)
    $monthlyCOGS = [math]::Round($monthlyUnits * $totalCOGS, 2)
    $monthlyGross = [math]::Round($monthlyRevenue - $monthlyCOGS, 2)

    # Compare to unbundled (same units but at full MSRP, reduced volume)
    $unbundledUnits = [math]::Round($monthlyUnits / $BundleUplift)
    $unbundledRevenue = [math]::Round($unbundledUnits * $totalMSRP, 2)
    $unbundledGross = [math]::Round($unbundledUnits * ($totalMSRP - $totalCOGS), 2)

    $revenueUplift = [math]::Round($monthlyRevenue - $unbundledRevenue, 2)
    $grossUplift = [math]::Round($monthlyGross - $unbundledGross, 2)
    $revenueUpliftPct = if ($unbundledRevenue -gt 0) { [math]::Round(($revenueUplift / $unbundledRevenue) * 100, 1) } else { 0 }

    # Bundle quality flag
    $qualityFlag = if ($starCount -ge 2 -and -not $hasWatch) { "PREMIUM" }
                   elseif ($starCount -ge 1) { "STRONG" }
                   elseif ($hasWatch) { "MIXED" }
                   else { "STANDARD" }

    $BundleResults += [PSCustomObject]@{
        BundleName = $tmpl.Name
        Strategy = $tmpl.Strategy
        Description = $tmpl.Description
        TargetAudience = $tmpl.TargetAudience
        Components = $components
        SKUCount = $skuCount
        StarCount = $starCount
        AvgCompositeScore = $avgScore
        QualityFlag = $qualityFlag
        Pricing = [PSCustomObject]@{
            IndividualTotal = $totalMSRP
            DiscountRate = "$([math]::Round($discountRate * 100))%"
            BundlePrice = $bundlePrice
            CustomerSavings = $savings
            BundleDTCMargin = $bundleMargin
            BundleWSPrice = $bundleWSPrice
            BundleWSMargin = $bundleWSMargin
            TotalCOGS = $totalCOGS
        }
        Projection = [PSCustomObject]@{
            MonthlyBundleUnits = $monthlyUnits
            MonthlyRevenue = $monthlyRevenue
            MonthlyGrossProfit = $monthlyGross
            UnbundledUnits = $unbundledUnits
            UnbundledRevenue = $unbundledRevenue
            UnbundledGrossProfit = $unbundledGross
            RevenueUplift = $revenueUplift
            RevenueUpliftPct = $revenueUpliftPct
            GrossProfitUplift = $grossUplift
            AnnualBundleRevenue = [math]::Round($monthlyRevenue * 12, 2)
            AnnualGrossProfit = [math]::Round($monthlyGross * 12, 2)
        }
    }
}

# --- Portfolio-Level Bundle Summary ---
$totalBundleAnnualRev = ($BundleResults | ForEach-Object { $_.Projection.AnnualBundleRevenue } | Measure-Object -Sum).Sum
$totalBundleAnnualGross = ($BundleResults | ForEach-Object { $_.Projection.AnnualGrossProfit } | Measure-Object -Sum).Sum
$totalUplift = ($BundleResults | ForEach-Object { $_.Projection.RevenueUplift } | Measure-Object -Sum).Sum

$strategyBreakdown = $BundleResults | Group-Object Strategy | ForEach-Object {
    $rev = ($_.Group | ForEach-Object { $_.Projection.AnnualBundleRevenue } | Measure-Object -Sum).Sum
    [PSCustomObject]@{
        Strategy = $_.Name
        BundleCount = $_.Count
        AnnualRevenue = [math]::Round($rev, 2)
        AvgBundlePrice = [math]::Round(($_.Group | ForEach-Object { $_.Pricing.BundlePrice } | Measure-Object -Average).Average, 2)
        AvgDTCMargin = [math]::Round(($_.Group | ForEach-Object { $_.Pricing.BundleDTCMargin } | Measure-Object -Average).Average, 1)
    }
}

# Rank bundles by annual gross profit
$ranked = $BundleResults | Sort-Object { $_.Projection.AnnualGrossProfit } -Descending
$topBundles = $ranked | Select-Object -First 5 | ForEach-Object {
    [PSCustomObject]@{
        BundleName = $_.BundleName
        BundlePrice = $_.Pricing.BundlePrice
        DTCMargin = $_.Pricing.BundleDTCMargin
        AnnualRevenue = $_.Projection.AnnualBundleRevenue
        AnnualGrossProfit = $_.Projection.AnnualGrossProfit
        QualityFlag = $_.QualityFlag
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    DiscountTiers = $DiscountTiers
    BundleUpliftAssumption = "$([math]::Round($BundleUplift * 100 - 100))% volume uplift"
    PortfolioSummary = [PSCustomObject]@{
        TotalBundles = $BundleResults.Count
        TotalAnnualBundleRevenue = [math]::Round($totalBundleAnnualRev, 2)
        TotalAnnualGrossProfit = [math]::Round($totalBundleAnnualGross, 2)
        MonthlyRevenueUplift = [math]::Round($totalUplift, 2)
        StrategyBreakdown = $strategyBreakdown
        Top5Bundles = $topBundles
    }
    Bundles = $BundleResults
}

$output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
Write-Host "Bundle optimization complete: $($BundleResults.Count) bundles designed." -ForegroundColor Green
Write-Host "--- Portfolio Impact ---" -ForegroundColor Cyan
$annRev = '{0:N0}' -f $totalBundleAnnualRev
$annGross = '{0:N0}' -f $totalBundleAnnualGross
$moUplift = '{0:N0}' -f $totalUplift
Write-Host "  Annual Bundle Revenue:  `$$annRev" -ForegroundColor White
Write-Host "  Annual Gross Profit:    `$$annGross" -ForegroundColor White
Write-Host "  Monthly Revenue Uplift: `$$moUplift (vs unbundled)" -ForegroundColor White
Write-Host "--- Top 5 Bundles by Gross Profit ---" -ForegroundColor Cyan
foreach ($b in $topBundles) {
    $bRev = '{0:N0}' -f $b.AnnualGrossProfit
    Write-Host "  $($b.BundleName.PadRight(35)) `$$bRev/yr  $($b.DTCMargin)% margin  [$($b.QualityFlag)]" -ForegroundColor White
}
Write-Host "Output: $OutputFile" -ForegroundColor Cyan
