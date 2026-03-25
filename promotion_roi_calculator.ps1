<# ================================================================
   FarmCeutica Promotion & Discount ROI Calculator
   Input:  farmceutica_master_skus.json, sku_rationalization.json
   Output: promotion_roi_analysis.json
   Models breakeven volume lift for discount levels, calculates
   promotion P&L impact, and ranks promotion strategies by ROI
   across SKU tiers and categories.
   ================================================================ #>

param(
    [string]$MasterFile   = "./farmceutica_master_skus.json",
    [string]$RationalFile = "./sku_rationalization.json",
    [string]$OutputFile   = "./promotion_roi_analysis.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json
$Rational = Get-Content $RationalFile | ConvertFrom-Json

$TierLookup = @{}
foreach ($s in $Rational.SKUs) { $TierLookup[$s.SKU] = $s.Tier }

# --- Promotion Templates ---
$Promos = @(
    @{ Name = "10% Off Sitewide"; Code = "SAVE10"; DiscountPct = 0.10; Type = "Percentage"
       Duration = 7; AvgVolumeLift = 1.35; AcquisitionBoost = 1.20; ApplyTo = "ALL" },
    @{ Name = "15% First Order"; Code = "WELCOME15"; DiscountPct = 0.15; Type = "Percentage"
       Duration = 30; AvgVolumeLift = 1.15; AcquisitionBoost = 1.45; ApplyTo = "ALL" },
    @{ Name = "20% Off Advanced Line"; Code = "ADVANCED20"; DiscountPct = 0.20; Type = "Percentage"
       Duration = 14; AvgVolumeLift = 1.50; AcquisitionBoost = 1.30; ApplyTo = "Advanced" },
    @{ Name = "25% Off SNP Category"; Code = "GENETIC25"; DiscountPct = 0.25; Type = "Percentage"
       Duration = 14; AvgVolumeLift = 1.60; AcquisitionBoost = 1.25; ApplyTo = "SNP" },
    @{ Name = "BOGO 50% Off"; Code = "BOGO50"; DiscountPct = 0.25; Type = "BOGO"
       Duration = 3; AvgVolumeLift = 2.00; AcquisitionBoost = 1.40; ApplyTo = "ALL" },
    @{ Name = "Buy 3 Get 1 Free"; Code = "B3G1"; DiscountPct = 0.25; Type = "Bundle"
       Duration = 14; AvgVolumeLift = 1.80; AcquisitionBoost = 1.15; ApplyTo = "ALL" },
    @{ Name = "Flash Sale 30% (48hr)"; Code = "FLASH30"; DiscountPct = 0.30; Type = "Flash"
       Duration = 2; AvgVolumeLift = 2.50; AcquisitionBoost = 1.60; ApplyTo = "ALL" },
    @{ Name = "Star SKUs 15% Off"; Code = "STARS15"; DiscountPct = 0.15; Type = "Tier"
       Duration = 7; AvgVolumeLift = 1.45; AcquisitionBoost = 1.35; ApplyTo = "Star" },
    @{ Name = "Mushroom Monday 20%"; Code = "SHROOM20"; DiscountPct = 0.20; Type = "Category"
       Duration = 1; AvgVolumeLift = 1.70; AcquisitionBoost = 1.20; ApplyTo = "Mushroom" },
    @{ Name = "Influencer 20% Code"; Code = "CREATOR20"; DiscountPct = 0.20; Type = "Influencer"
       Duration = 30; AvgVolumeLift = 1.25; AcquisitionBoost = 1.80; ApplyTo = "ALL"
       CommissionPct = 0.10 },
    @{ Name = "Subscribe & Save Extra 5%"; Code = "SUBSAVE5"; DiscountPct = 0.05; Type = "Subscription"
       Duration = 30; AvgVolumeLift = 1.10; AcquisitionBoost = 1.50; ApplyTo = "ALL"
       SubConversionLift = 0.15 },
    @{ Name = "Holiday Bundle 20%"; Code = "HOLIDAY20"; DiscountPct = 0.20; Type = "Seasonal"
       Duration = 10; AvgVolumeLift = 1.65; AcquisitionBoost = 1.50; ApplyTo = "ALL" }
)

# --- Baseline daily volume per SKU (from category volumes) ---
$CatDailyVolume = @{
    Base = 27; Advanced = 13; Women = 10; Children = 8
    SNP = 5; Mushroom = 12; Testing = 2
}

# --- Marketing cost per promotion ---
$PromoMarketingCost = @{
    Percentage = 2500; BOGO = 3500; Bundle = 2000; Flash = 5000
    Tier = 2000; Category = 1500; Influencer = 1000; Subscription = 1500; Seasonal = 8000
}

# --- Calculate ROI for each promotion ---
$PromoResults = @()

foreach ($promo in $Promos) {
    $discountPct = [decimal]$promo.DiscountPct
    $volumeLift = [decimal]$promo.AvgVolumeLift
    $acqBoost = [decimal]$promo.AcquisitionBoost
    $duration = [int]$promo.Duration
    $promoType = $promo.Type
    $applyTo = $promo.ApplyTo

    # Filter applicable SKUs
    $applicableSKUs = switch ($applyTo) {
        "ALL"  { $Master }
        "Star" { $Master | Where-Object { $TierLookup[$_.SKU] -eq "Star" } }
        default { $Master | Where-Object { $_.Category -eq $applyTo } }
    }

    $promoRevenue = [decimal]0
    $baselineRevenue = [decimal]0
    $promoCOGS = [decimal]0
    $baselineCOGS = [decimal]0
    $promoUnits = 0
    $baselineUnits = 0
    $skuCount = $applicableSKUs.Count

    foreach ($sku in $applicableSKUs) {
        $msrp = [decimal]$sku.MSRP
        $cogs = [decimal]$sku.COGS
        $cat = $sku.Category
        $dailyVol = if ($CatDailyVolume[$cat]) { [int]$CatDailyVolume[$cat] } else { 5 }

        # Baseline (no promo)
        $baseUnits = $dailyVol * $duration
        $baseRev = $baseUnits * $msrp
        $baseCost = $baseUnits * $cogs

        # Promo period
        $promoPrice = [math]::Round($msrp * (1 - $discountPct), 2)
        $promoVol = [math]::Round($dailyVol * $volumeLift) * $duration
        $pRev = $promoVol * $promoPrice
        $pCost = $promoVol * $cogs

        $baselineRevenue += $baseRev; $baselineCOGS += $baseCost; $baselineUnits += $baseUnits
        $promoRevenue += $pRev; $promoCOGS += $pCost; $promoUnits += $promoVol
    }

    # Marketing cost
    $marketingCost = if ($PromoMarketingCost[$promoType]) { [decimal]$PromoMarketingCost[$promoType] } else { 2000 }

    # Influencer commission
    $commissionCost = [decimal]0
    if ($promo.CommissionPct) { $commissionCost = [math]::Round($promoRevenue * [decimal]$promo.CommissionPct, 2) }

    # Gross profit comparison
    $baselineGP = [math]::Round($baselineRevenue - $baselineCOGS, 2)
    $promoGP = [math]::Round($promoRevenue - $promoCOGS - $marketingCost - $commissionCost, 2)
    $gpDelta = [math]::Round($promoGP - $baselineGP, 2)

    # Revenue delta
    $revDelta = [math]::Round($promoRevenue - $baselineRevenue, 2)

    # Breakeven volume lift needed
    $avgMSRP = if ($skuCount -gt 0) { ($applicableSKUs | ForEach-Object { [decimal]$_.MSRP } | Measure-Object -Average).Average } else { 100 }
    $avgCOGS = if ($skuCount -gt 0) { ($applicableSKUs | ForEach-Object { [decimal]$_.COGS } | Measure-Object -Average).Average } else { 15 }
    $baseMargin = $avgMSRP - $avgCOGS
    $promoMargin = ($avgMSRP * (1 - $discountPct)) - $avgCOGS
    $breakevenLift = if ($promoMargin -gt 0) { [math]::Round($baseMargin / $promoMargin, 2) } else { 999 }
    $breakevenLiftPct = [math]::Round(($breakevenLift - 1) * 100, 1)

    # ROI
    $totalPromoCost = [math]::Round(($baselineRevenue - $promoRevenue) + $marketingCost + $commissionCost, 2)
    $totalPromoCost = [math]::Max($totalPromoCost, $marketingCost)
    $incrementalGP = [math]::Max(0, $gpDelta)
    $roi = if ($totalPromoCost -gt 0) { [math]::Round(($incrementalGP / $totalPromoCost) * 100, 1) } else { 0 }

    # New customers acquired
    $baseNewCustomers = [math]::Round($baselineUnits * 0.15)  # 15% are new
    $promoNewCustomers = [math]::Round($baseNewCustomers * $acqBoost)
    $netNewCustomers = $promoNewCustomers - $baseNewCustomers

    # Effective CAC for new customers
    $effectiveCAC = if ($netNewCustomers -gt 0) { [math]::Round($totalPromoCost / $netNewCustomers, 2) } else { 999 }

    # Rating
    $rating = if ($roi -gt 200 -and $gpDelta -gt 0) { "EXCELLENT" }
              elseif ($roi -gt 100 -and $gpDelta -gt 0) { "STRONG" }
              elseif ($roi -gt 50) { "MODERATE" }
              elseif ($gpDelta -gt 0) { "MARGINAL" }
              else { "NEGATIVE" }

    $PromoResults += [PSCustomObject]@{
        Promotion = $promo.Name
        Code = $promo.Code
        Type = $promoType
        Discount = "$([math]::Round($discountPct * 100))%"
        Duration = "$duration days"
        AppliesTo = $applyTo
        SKUsAffected = $skuCount
        Economics = [PSCustomObject]@{
            BaselineRevenue = [math]::Round($baselineRevenue, 2)
            PromoRevenue = [math]::Round($promoRevenue, 2)
            RevenueDelta = $revDelta
            BaselineGrossProfit = $baselineGP
            PromoGrossProfit = $promoGP
            GrossProfitDelta = $gpDelta
            MarketingCost = $marketingCost
            CommissionCost = $commissionCost
        }
        VolumeImpact = [PSCustomObject]@{
            BaselineUnits = $baselineUnits
            PromoUnits = $promoUnits
            VolumeLift = "$([math]::Round(($volumeLift - 1) * 100))%"
            BreakevenLiftRequired = "$breakevenLiftPct%"
            ExceedsBreakeven = ($volumeLift -ge $breakevenLift)
        }
        Acquisition = [PSCustomObject]@{
            NetNewCustomers = $netNewCustomers
            EffectiveCAC = $effectiveCAC
            AcquisitionBoost = "$([math]::Round(($acqBoost - 1) * 100))%"
        }
        ROI = $roi
        Rating = $rating
    }
}

# Sort by ROI
$PromoResults = $PromoResults | Sort-Object ROI -Descending

# --- Summary ---
$excellent = ($PromoResults | Where-Object { $_.Rating -eq "EXCELLENT" }).Count
$strong = ($PromoResults | Where-Object { $_.Rating -eq "STRONG" }).Count
$negative = ($PromoResults | Where-Object { $_.Rating -eq "NEGATIVE" }).Count

$bestPromo = $PromoResults | Select-Object -First 1
$worstPromo = $PromoResults | Select-Object -Last 1

# Discount sensitivity (how much margin erodes at each discount level)
$sensitivity = @(5, 10, 15, 20, 25, 30) | ForEach-Object {
    $d = $_ / 100
    $avgM = ($Master | ForEach-Object { [decimal]$_.MSRP } | Measure-Object -Average).Average
    $avgC = ($Master | ForEach-Object { [decimal]$_.COGS } | Measure-Object -Average).Average
    $baseMgn = [math]::Round((($avgM - $avgC) / $avgM) * 100, 1)
    $discMgn = [math]::Round((($avgM * (1 - $d) - $avgC) / ($avgM * (1 - $d))) * 100, 1)
    $beLift = [math]::Round((($avgM - $avgC) / ($avgM * (1 - $d) - $avgC) - 1) * 100, 1)
    [PSCustomObject]@{
        Discount = "$_%" ; BaseMargin = "$baseMgn%"; DiscountedMargin = "$discMgn%"
        MarginErosion = "$([math]::Round($baseMgn - $discMgn, 1))pp"
        BreakevenLiftNeeded = "$beLift%"
    }
}

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    PromotionsModeled = $PromoResults.Count
    Summary = [PSCustomObject]@{
        Excellent = $excellent; Strong = $strong; Negative = $negative
        BestPromo = [PSCustomObject]@{ Name = $bestPromo.Promotion; ROI = $bestPromo.ROI; Rating = $bestPromo.Rating }
        WorstPromo = [PSCustomObject]@{ Name = $worstPromo.Promotion; ROI = $worstPromo.ROI; Rating = $worstPromo.Rating }
    }
    DiscountSensitivity = $sensitivity
    Promotions = $PromoResults
}

$output | ConvertTo-Json -Depth 8 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PROMOTION & DISCOUNT ROI CALCULATOR" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  $($PromoResults.Count) promotions modeled: $excellent Excellent, $strong Strong, $negative Negative" -ForegroundColor White
Write-Host ""
Write-Host "  --- Ranked by ROI ---" -ForegroundColor Cyan
foreach ($p in $PromoResults) {
    $color = switch ($p.Rating) { "EXCELLENT" { "Green" } "STRONG" { "Green" } "MODERATE" { "Yellow" } "MARGINAL" { "Yellow" } default { "Red" } }
    $gpFmt = '{0:N0}' -f $p.Economics.GrossProfitDelta
    Write-Host "    $($p.Promotion.PadRight(30)) ROI: $($p.ROI)%  GP Delta: `$$gpFmt  [$($p.Rating)]" -ForegroundColor $color
}
Write-Host ""
Write-Host "  --- Discount Sensitivity ---" -ForegroundColor Cyan
foreach ($s in $sensitivity) {
    Write-Host "    $($s.Discount.PadRight(6)) Margin: $($s.DiscountedMargin.PadRight(8)) Erosion: $($s.MarginErosion.PadRight(8)) BE Lift: $($s.BreakevenLiftNeeded)" -ForegroundColor White
}
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
