<# ================================================================
   FarmCeutica SKU Rationalization Engine
   Input:  farmceutica_master_skus.json, margin_waterfall.json,
           channel_mix_results.json
   Output: sku_rationalization.json
   Scores each SKU on margin health, channel viability, and revenue
   contribution. Classifies into tiers (Star/Core/Watch/Sunset) and
   generates actionable portfolio optimization recommendations.
   ================================================================ #>

param(
    [string]$MasterFile    = "./farmceutica_master_skus.json",
    [string]$WaterfallFile = "./margin_waterfall.json",
    [string]$ChannelFile   = "./channel_mix_results.json",
    [string]$OutputFile    = "./sku_rationalization.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json
$Waterfall = Get-Content $WaterfallFile | ConvertFrom-Json
$ChannelMix = Get-Content $ChannelFile | ConvertFrom-Json

# --- Scoring Weights ---
$Weights = @{
    DTCMargin       = 0.20   # DTC gross margin strength
    ChannelBreadth  = 0.15   # Viable across multiple channels
    COGSEfficiency  = 0.15   # Low COGS ratio = manufacturing advantage
    WaterfallHealth = 0.20   # Net margin after all costs (waterfall)
    RevenueWeight   = 0.15   # Revenue contribution in balanced scenario
    PricePoint      = 0.15   # Higher MSRP = more margin dollars per unit
}

# --- Thresholds for Classification ---
$Tiers = @{
    Star   = 75   # Score >= 75
    Core   = 55   # Score >= 55
    Watch  = 35   # Score >= 35
                   # Below 35 = Sunset
}

# --- Build Waterfall Lookup (SKU -> channel -> net margin pct) ---
$WaterfallLookup = @{}
foreach ($skuData in $Waterfall.SKUs) {
    $WaterfallLookup[$skuData.SKU] = @{}
    foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
        $WaterfallLookup[$skuData.SKU][$ch] = $skuData.Channels.$ch.NetMarginPct
    }
}

# --- Build Revenue Lookup from Balanced scenario ---
$BalancedScenario = $ChannelMix.Scenarios | Where-Object { $_.Scenario -eq "Balanced" }
$RevenueLookup = @{}
$totalRevenue = $BalancedScenario.Summary.MonthlyRevenue
foreach ($skuDetail in $BalancedScenario.SKUDetails) {
    $RevenueLookup[$skuDetail.SKU] = @{
        Revenue = $skuDetail.Revenue
        Share = if ($totalRevenue -gt 0) { [math]::Round(($skuDetail.Revenue / $totalRevenue) * 100, 3) } else { 0 }
    }
}

# --- Compute Portfolio Stats for Normalization ---
$allMSRP = $Master | ForEach-Object { [decimal]$_.MSRP }
$maxMSRP = ($allMSRP | Measure-Object -Maximum).Maximum
$allDTCMargin = $Master | ForEach-Object { [decimal]$_.DTCMargin }
$maxDTCMargin = ($allDTCMargin | Measure-Object -Maximum).Maximum
$allCOGSRatio = $Master | ForEach-Object { [decimal]$_.COGSRatio }
$maxCOGSRatio = ($allCOGSRatio | Measure-Object -Maximum).Maximum
$allRevShare = $RevenueLookup.Values | ForEach-Object { $_.Share }
$maxRevShare = if ($allRevShare) { ($allRevShare | Measure-Object -Maximum).Maximum } else { 1 }

# --- Score Each SKU ---
$Results = @()

foreach ($sku in $Master) {
    $skuId = $sku.SKU
    $dtcMargin = [decimal]$sku.DTCMargin
    $cogsRatio = [decimal]$sku.COGSRatio
    $msrp = [decimal]$sku.MSRP
    $cogs = [decimal]$sku.COGS

    # 1. DTC Margin Score (0-100, higher margin = better)
    $dtcScore = [math]::Round(($dtcMargin / $maxDTCMargin) * 100, 1)

    # 2. Channel Breadth Score (viable = net margin > 10% after waterfall costs)
    $viableChannels = 0
    $channelViability = @{}
    foreach ($ch in @("DTC", "Wholesale", "Distributor")) {
        $netPct = if ($WaterfallLookup[$skuId]) { $WaterfallLookup[$skuId][$ch] } else { 0 }
        $viable = $netPct -gt 10
        $channelViability[$ch] = [PSCustomObject]@{ NetMarginPct = $netPct; Viable = $viable }
        if ($viable) { $viableChannels++ }
    }
    $breadthScore = [math]::Round(($viableChannels / 3) * 100, 1)

    # 3. COGS Efficiency Score (lower ratio = better, inverted)
    $cogsScore = if ($maxCOGSRatio -gt 0) { [math]::Round((1 - $cogsRatio / $maxCOGSRatio) * 100, 1) } else { 50 }

    # 4. Waterfall Health Score (avg net margin across all 3 channels, normalized)
    $avgWaterfallNet = 0
    if ($WaterfallLookup[$skuId]) {
        $vals = @($WaterfallLookup[$skuId]["DTC"], $WaterfallLookup[$skuId]["Wholesale"], $WaterfallLookup[$skuId]["Distributor"])
        $avgWaterfallNet = ($vals | Measure-Object -Average).Average
    }
    # Normalize: -150 to +80 range mapped to 0-100
    $waterfallScore = [math]::Round([math]::Max(0, [math]::Min(100, (($avgWaterfallNet + 150) / 230) * 100)), 1)

    # 5. Revenue Contribution Score
    $revShare = if ($RevenueLookup[$skuId]) { $RevenueLookup[$skuId].Share } else { 0 }
    $revScore = if ($maxRevShare -gt 0) { [math]::Round(($revShare / $maxRevShare) * 100, 1) } else { 0 }

    # 6. Price Point Score (higher MSRP = more margin dollars)
    $priceScore = [math]::Round(($msrp / $maxMSRP) * 100, 1)

    # Composite Score
    $composite = [math]::Round(
        $dtcScore * $Weights.DTCMargin +
        $breadthScore * $Weights.ChannelBreadth +
        $cogsScore * $Weights.COGSEfficiency +
        $waterfallScore * $Weights.WaterfallHealth +
        $revScore * $Weights.RevenueWeight +
        $priceScore * $Weights.PricePoint
    , 1)

    # Classification
    $tier = if ($composite -ge $Tiers.Star) { "Star" }
            elseif ($composite -ge $Tiers.Core) { "Core" }
            elseif ($composite -ge $Tiers.Watch) { "Watch" }
            else { "Sunset" }

    # Action Recommendation
    $actions = @()
    if ($tier -eq "Star") {
        $actions += "PROMOTE - increase marketing spend and inventory priority"
    }
    if ($tier -eq "Sunset") {
        $actions += "EVALUATE DISCONTINUATION - margin and channel viability are critically low"
    }
    if ($dtcMargin -lt 70 -and $tier -ne "Sunset") {
        $actions += "REPRICE - DTC margin below 70% floor"
    }
    if ($viableChannels -lt 2 -and $tier -ne "Sunset") {
        $actions += "CHANNEL REVIEW - viable in fewer than 2 channels"
    }
    if ($cogsRatio -gt 40 -and $tier -ne "Sunset") {
        $actions += "RENEGOTIATE SUPPLY - COGS ratio exceeds 40%"
    }
    if ($breadthScore -eq 100 -and $composite -ge $Tiers.Core) {
        $actions += "BUNDLE CANDIDATE - strong across all channels"
    }
    if ($actions.Count -eq 0) { $actions += "MAINTAIN - performing within expected range" }

    $Results += [PSCustomObject]@{
        SKU = $skuId
        Name = $sku.Name
        Category = $sku.Category
        MSRP = $msrp
        COGS = $cogs
        DTCMargin = $dtcMargin
        COGSRatio = $cogsRatio
        ViableChannels = $viableChannels
        ChannelViability = $channelViability
        Scores = [PSCustomObject]@{
            DTCMargin = $dtcScore
            ChannelBreadth = $breadthScore
            COGSEfficiency = $cogsScore
            WaterfallHealth = $waterfallScore
            RevenueContribution = $revScore
            PricePoint = $priceScore
        }
        CompositeScore = $composite
        Tier = $tier
        Actions = $actions
    }
}

# --- Portfolio Summary ---
$tierGroups = $Results | Group-Object Tier
$tierSummary = @()
foreach ($group in $tierGroups) {
    $avgScore = [math]::Round(($group.Group | ForEach-Object { $_.CompositeScore } | Measure-Object -Average).Average, 1)
    $avgDTC = [math]::Round(($group.Group | ForEach-Object { $_.DTCMargin } | Measure-Object -Average).Average, 1)
    $totalRev = 0
    foreach ($s in $group.Group) {
        if ($RevenueLookup[$s.SKU]) { $totalRev += $RevenueLookup[$s.SKU].Revenue }
    }
    $tierSummary += [PSCustomObject]@{
        Tier = $group.Name
        SKUCount = $group.Count
        AvgCompositeScore = $avgScore
        AvgDTCMargin = $avgDTC
        MonthlyRevenue = [math]::Round($totalRev, 2)
        RevenueSharePct = [math]::Round(($totalRev / $totalRevenue) * 100, 1)
    }
}

# --- Category Health ---
$catGroups = $Results | Group-Object Category
$categoryHealth = @()
foreach ($group in $catGroups) {
    $scores = $group.Group | ForEach-Object { $_.CompositeScore }
    $tiers = $group.Group | Group-Object Tier
    $tierDist = @{}
    foreach ($t in $tiers) { $tierDist[$t.Name] = $t.Count }
    $categoryHealth += [PSCustomObject]@{
        Category = $group.Name
        SKUCount = $group.Count
        AvgScore = [math]::Round(($scores | Measure-Object -Average).Average, 1)
        MinScore = [math]::Round(($scores | Measure-Object -Minimum).Minimum, 1)
        MaxScore = [math]::Round(($scores | Measure-Object -Maximum).Maximum, 1)
        Stars = if ($tierDist["Star"]) { $tierDist["Star"] } else { 0 }
        Core = if ($tierDist["Core"]) { $tierDist["Core"] } else { 0 }
        Watch = if ($tierDist["Watch"]) { $tierDist["Watch"] } else { 0 }
        Sunset = if ($tierDist["Sunset"]) { $tierDist["Sunset"] } else { 0 }
    }
}

# --- Action Summary ---
$allActions = $Results | ForEach-Object {
    foreach ($a in $_.Actions) {
        $a -replace " - .*$", ""
    }
}
$actionCounts = $allActions | Group-Object | Sort-Object Count -Descending | ForEach-Object {
    [PSCustomObject]@{ Action = $_.Name; Count = $_.Count }
}

# --- Top Candidates for Each Action ---
$promoteList = $Results | Where-Object { $_.Tier -eq "Star" } | Sort-Object CompositeScore -Descending | Select-Object SKU, Name, CompositeScore, Tier
$repriceList = $Results | Where-Object { $_.Actions -match "REPRICE" } | Select-Object SKU, Name, DTCMargin, CompositeScore
$sunsetList = $Results | Where-Object { $_.Tier -eq "Sunset" } | Select-Object SKU, Name, CompositeScore, DTCMargin, COGSRatio, ViableChannels
$bundleList = $Results | Where-Object { $_.Actions -match "BUNDLE" } | Select-Object SKU, Name, CompositeScore, ViableChannels

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    ScoringWeights = $Weights
    TierThresholds = $Tiers
    PortfolioSummary = [PSCustomObject]@{
        TotalSKUs = $Results.Count
        TierDistribution = $tierSummary
        CategoryHealth = $categoryHealth
        ActionSummary = $actionCounts
    }
    Recommendations = [PSCustomObject]@{
        Promote = $promoteList
        Reprice = $repriceList
        Sunset = $sunsetList
        BundleCandidates = $bundleList
    }
    SKUs = $Results
}

$output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile -Encoding UTF8

# --- Console Output ---
$stars = ($Results | Where-Object { $_.Tier -eq "Star" }).Count
$cores = ($Results | Where-Object { $_.Tier -eq "Core" }).Count
$watches = ($Results | Where-Object { $_.Tier -eq "Watch" }).Count
$sunsets = ($Results | Where-Object { $_.Tier -eq "Sunset" }).Count

Write-Host "SKU Rationalization complete for $($Results.Count) products." -ForegroundColor Green
Write-Host "--- Tier Distribution ---" -ForegroundColor Cyan
Write-Host "  Star:   $stars SKUs (promote/invest)" -ForegroundColor White
Write-Host "  Core:   $cores SKUs (maintain)" -ForegroundColor White
Write-Host "  Watch:  $watches SKUs (monitor/reprice)" -ForegroundColor Yellow
Write-Host "  Sunset: $sunsets SKUs (evaluate discontinuation)" -ForegroundColor Red
Write-Host "--- Top Actions ---" -ForegroundColor Cyan
foreach ($a in ($actionCounts | Select-Object -First 5)) {
    Write-Host "  $($a.Action): $($a.Count) SKUs" -ForegroundColor White
}
Write-Host "Output: $OutputFile" -ForegroundColor Cyan
