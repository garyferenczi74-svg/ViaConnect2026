<# ================================================================
   FarmCeutica Supplier & Vendor Scorecard
   Input:  updated_bom.csv, farmceutica_master_skus.json,
           inventory_reorder_plan.json
   Output: supplier_scorecard.json
   Models vendor concentration, cost contribution per supplier,
   lead time reliability, quality risk, and generates weighted
   procurement scores with diversification recommendations.
   ================================================================ #>

param(
    [string]$BOMFile       = "./updated_bom.csv",
    [string]$MasterFile    = "./farmceutica_master_skus.json",
    [string]$InventoryFile = "./inventory_reorder_plan.json",
    [string]$OutputFile    = "./supplier_scorecard.json"
)

$ErrorActionPreference = "Stop"

$BOM = Import-Csv $BOMFile
$Master = Get-Content $MasterFile | ConvertFrom-Json
$Inventory = Get-Content $InventoryFile | ConvertFrom-Json

# --- Supplier Database (simulated from ingredient classes) ---
# Maps ingredients to suppliers based on ingredient type/source
$SupplierDB = @{
    "BHB" = @{
        Supplier = "KetoSynth Labs"; Region = "USA"; LeadTimeDays = 14
        QualityCerts = @("GMP", "NSF"); MinOrderKg = 50; PaymentTerms = "Net 30"
    }
    "Methyl" = @{
        Supplier = "VitaGenix Europe"; Region = "Germany"; LeadTimeDays = 28
        QualityCerts = @("GMP", "ISO 9001", "EU Pharma"); MinOrderKg = 25; PaymentTerms = "Net 45"
    }
    "Mineral" = @{
        Supplier = "Albion Minerals"; Region = "USA"; LeadTimeDays = 21
        QualityCerts = @("GMP", "GRAS", "Chelate Patent"); MinOrderKg = 100; PaymentTerms = "Net 30"
    }
    "Amino" = @{
        Supplier = "Kyowa Hakko Bio"; Region = "Japan"; LeadTimeDays = 35
        QualityCerts = @("GMP", "ISO 22000", "GRAS"); MinOrderKg = 50; PaymentTerms = "Net 60"
    }
    "Botanical" = @{
        Supplier = "Verdure Sciences"; Region = "India/USA"; LeadTimeDays = 28
        QualityCerts = @("GMP", "Organic", "Fair Trade"); MinOrderKg = 25; PaymentTerms = "Net 30"
    }
    "Mushroom" = @{
        Supplier = "Nammex Inc"; Region = "Canada/China"; LeadTimeDays = 35
        QualityCerts = @("GMP", "Organic", "Beta-Glucan Verified"); MinOrderKg = 50; PaymentTerms = "Net 45"
    }
    "Omega" = @{
        Supplier = "AlgaeCal / DSM"; Region = "Netherlands"; LeadTimeDays = 28
        QualityCerts = @("GMP", "IFOS 5-Star", "Vegan"); MinOrderKg = 100; PaymentTerms = "Net 30"
    }
    "Probiotic" = @{
        Supplier = "DuPont Danisco"; Region = "Denmark"; LeadTimeDays = 21
        QualityCerts = @("GMP", "DNA Verified", "Stability Tested"); MinOrderKg = 10; PaymentTerms = "Net 30"
    }
    "Nootropic" = @{
        Supplier = "Cognizin/Kyowa"; Region = "Japan"; LeadTimeDays = 35
        QualityCerts = @("GMP", "Patent", "Clinical Grade"); MinOrderKg = 25; PaymentTerms = "Net 60"
    }
    "Specialty" = @{
        Supplier = "BioPerine/Sabinsa"; Region = "India"; LeadTimeDays = 28
        QualityCerts = @("GMP", "Patent", "GRAS"); MinOrderKg = 10; PaymentTerms = "Net 30"
    }
    "Enzyme" = @{
        Supplier = "National Enzyme Co"; Region = "USA"; LeadTimeDays = 14
        QualityCerts = @("GMP", "Kosher", "Activity Verified"); MinOrderKg = 25; PaymentTerms = "Net 30"
    }
    "TestKit" = @{
        Supplier = "Precision Analytics"; Region = "USA"; LeadTimeDays = 7
        QualityCerts = @("CLIA", "CAP"); MinOrderKg = 0; PaymentTerms = "Net 15"
    }
    "Vitamin" = @{
        Supplier = "DSM Nutritional"; Region = "Switzerland"; LeadTimeDays = 21
        QualityCerts = @("GMP", "ISO 9001", "USP Grade"); MinOrderKg = 50; PaymentTerms = "Net 45"
    }
}

# --- Map each BOM ingredient to a supplier ---
function Get-SupplierKey([string]$ingredient) {
    $ing = $ingredient.ToLower()
    if ($ing -match "bhb|beta-hydroxy") { return "BHB" }
    if ($ing -match "methyl|folate|5-mthf|folinic|b12|cobalamin|pyridox|riboflavin|thiamine") { return "Methyl" }
    if ($ing -match "magnesium|calcium|sodium|potassium|zinc|iron|trace mineral") { return "Mineral" }
    if ($ing -match "creatine|glutamine|carnitine|betaine|glycine") { return "Amino" }
    if ($ing -match "maca|shatavari|vitex|dim|licorice|marshmallow|slippery|bacopa") { return "Botanical" }
    if ($ing -match "chaga|cordyceps|lion|reishi|turkey|mushroom|hericen|beta-glucan") { return "Mushroom" }
    if ($ing -match "omega|dha|epa|algal|fish") { return "Omega" }
    if ($ing -match "alpha-gpc|phosphatidyl|citicoline|pqq|nadh") { return "Nootropic" }
    if ($ing -match "astrag|cyclo|resveratrol|sapropterin|bh4") { return "Specialty" }
    if ($ing -match "enzyme|digestiz") { return "Enzyme" }
    if ($ing -match "kit|panel|lab|processing|test") { return "TestKit" }
    if ($ing -match "vitamin|coq10|ubiquinol|alpha-lipoic") { return "Vitamin" }
    return "Specialty"
}

# --- SKU Lookup ---
$SKULookup = @{}
foreach ($s in $Master) { $SKULookup[$s.SKU] = $s }

# --- Inventory demand lookup ---
$DemandLookup = @{}
foreach ($s in $Inventory.SKUs) { $DemandLookup[$s.SKU] = $s }

# --- Aggregate by Supplier ---
$SupplierAgg = @{}

foreach ($row in $BOM) {
    $skuId = $row.SKU
    $ingredient = $row.Ingredient
    $mgPerCap = [decimal]$row.MgPerCapsule
    $costPerKg = [decimal]$row.CostPerKg
    $supplierKey = Get-SupplierKey $ingredient

    $supplier = $SupplierDB[$supplierKey]
    $supplierName = $supplier.Supplier

    if (-not $SupplierAgg[$supplierName]) {
        $SupplierAgg[$supplierName] = @{
            Key = $supplierKey
            Region = $supplier.Region
            LeadTimeDays = $supplier.LeadTimeDays
            Certs = $supplier.Certs
            PaymentTerms = $supplier.PaymentTerms
            Ingredients = @()
            SKUs = @{}
            TotalCostContribution = [decimal]0
            TotalIngredientCount = 0
        }
    }

    # Cost per unit for this ingredient
    $costPerUnit = [math]::Round(($mgPerCap / 1000000) * $costPerKg, 4)

    # Annual cost based on demand
    $annualDemand = if ($DemandLookup[$skuId]) { [int]$DemandLookup[$skuId].Demand.AnnualUnits } else { 2000 }
    $annualCost = [math]::Round($costPerUnit * $annualDemand, 2)

    $SupplierAgg[$supplierName].Ingredients += [PSCustomObject]@{
        Ingredient = $ingredient; SKU = $skuId
        MgPerCapsule = $mgPerCap; CostPerKg = $costPerKg
        CostPerUnit = $costPerUnit; AnnualCost = $annualCost
    }
    $SupplierAgg[$supplierName].SKUs[$skuId] = $true
    $SupplierAgg[$supplierName].TotalCostContribution += $annualCost
    $SupplierAgg[$supplierName].TotalIngredientCount++
}

# --- Total spend for share calculation ---
$totalSpend = ($SupplierAgg.Values | ForEach-Object { $_.TotalCostContribution } | Measure-Object -Sum).Sum

# --- Scoring Weights ---
$Weights = @{
    CostConcentration = 0.25  # How much of our spend is with this supplier
    LeadTimeRisk      = 0.20  # Longer lead = higher risk
    SKUExposure       = 0.20  # How many SKUs depend on this supplier
    RegionalRisk      = 0.15  # Single-region vs multi-region
    CertStrength      = 0.10  # Quality certification breadth
    PaymentTerms      = 0.10  # Favorable payment terms
}

# --- Build Scorecards ---
$Scorecards = @()
$totalSKUsInBOM = ($BOM | Select-Object -ExpandProperty SKU -Unique).Count

foreach ($name in ($SupplierAgg.Keys | Sort-Object)) {
    $s = $SupplierAgg[$name]
    $db = $SupplierDB[$s.Key]
    $spendShare = if ($totalSpend -gt 0) { [math]::Round(($s.TotalCostContribution / $totalSpend) * 100, 1) } else { 0 }
    $skuCount = $s.SKUs.Count
    $skuExposure = [math]::Round(($skuCount / $totalSKUsInBOM) * 100, 1)

    # Score each dimension (0-100, higher = better/lower risk)
    # Cost concentration: lower share = better score
    $costScore = [math]::Round([math]::Max(0, 100 - ($spendShare * 2)), 1)

    # Lead time: shorter = better
    $lt = [int]$db.LeadTimeDays
    $ltScore = [decimal]$(if ($lt -le 7) { 95 } elseif ($lt -le 14) { 85 } elseif ($lt -le 21) { 70 } elseif ($lt -le 28) { 55 } else { 35 })

    # SKU exposure: fewer dependent SKUs = lower risk
    $expScore = [decimal][math]::Round([math]::Max(0, 100 - ($skuExposure * 3)), 1)

    # Regional risk: USA = lower risk, multi-region = lower, single overseas = higher
    $region = "$($db.Region)"
    $regionScore = [decimal]$(if ($region -eq "USA") { 90 } elseif ($region -match "/") { 60 } elseif ($region -match "Germany|Switzerland|Canada|Netherlands|Denmark") { 70 } elseif ($region -match "Japan") { 65 } else { 45 })

    # Cert strength: more certs = better
    $certCount = if ($db.QualityCerts) { $db.QualityCerts.Count } else { 1 }
    $certScore = [decimal][math]::Min(100, $certCount * 30)

    # Payment terms: longer = better for cash flow
    $terms = "$($db.PaymentTerms)"
    $termScore = [decimal]$(if ($terms -match "60") { 90 } elseif ($terms -match "45") { 75 } elseif ($terms -match "30") { 60 } elseif ($terms -match "15") { 40 } else { 50 })

    # Composite
    $composite = [math]::Round(
        $costScore * $Weights.CostConcentration +
        $ltScore * $Weights.LeadTimeRisk +
        $expScore * $Weights.SKUExposure +
        $regionScore * $Weights.RegionalRisk +
        $certScore * $Weights.CertStrength +
        $termScore * $Weights.PaymentTerms
    , 1)

    # Risk tier
    $riskTier = if ($composite -ge 75) { "LOW" }
                elseif ($composite -ge 55) { "MODERATE" }
                elseif ($composite -ge 40) { "ELEVATED" }
                else { "HIGH" }

    # Recommendations
    $recs = @()
    if ($spendShare -gt 25) { $recs += "DIVERSIFY - over 25% of spend concentrated here" }
    if ($db.LeadTimeDays -ge 35) { $recs += "BUFFER STOCK - 5+ week lead time requires extra safety stock" }
    if ($skuCount -ge 5) { $recs += "DUAL SOURCE - $skuCount SKUs dependent; qualify alternate supplier" }
    if ($regionScore -le 50) { $recs += "REGIONAL RISK - consider nearshore alternative" }
    if ($recs.Count -eq 0) { $recs += "MAINTAIN - supplier relationship performing well" }

    $Scorecards += [PSCustomObject]@{
        Supplier = $name
        Region = $db.Region
        LeadTimeDays = $db.LeadTimeDays
        QualityCerts = $db.QualityCerts
        PaymentTerms = $db.PaymentTerms
        IngredientCount = $s.TotalIngredientCount
        SKUCount = $skuCount
        SKUExposurePct = $skuExposure
        AnnualSpend = [math]::Round($s.TotalCostContribution, 2)
        SpendSharePct = $spendShare
        Scores = [PSCustomObject]@{
            CostConcentration = $costScore
            LeadTimeRisk = $ltScore
            SKUExposure = $expScore
            RegionalRisk = $regionScore
            CertStrength = $certScore
            PaymentTerms = $termScore
        }
        CompositeScore = $composite
        RiskTier = $riskTier
        Recommendations = $recs
        Ingredients = $s.Ingredients
    }
}

$Scorecards = $Scorecards | Sort-Object { $_.AnnualSpend } -Descending

# --- Portfolio Procurement Summary ---
$riskDist = $Scorecards | Group-Object RiskTier | ForEach-Object {
    [PSCustomObject]@{ Tier = $_.Name; Count = $_.Count }
}

$regionDist = $Scorecards | Group-Object Region | ForEach-Object {
    $spend = ($_.Group | ForEach-Object { $_.AnnualSpend } | Measure-Object -Sum).Sum
    [PSCustomObject]@{ Region = $_.Name; Suppliers = $_.Count; AnnualSpend = [math]::Round($spend, 2) }
}

$top3Spend = $Scorecards | Select-Object -First 3 | ForEach-Object {
    [PSCustomObject]@{ Supplier = $_.Supplier; AnnualSpend = $_.AnnualSpend; SpendShare = "$($_.SpendSharePct)%"; RiskTier = $_.RiskTier }
}

$hhi = [math]::Round(($Scorecards | ForEach-Object { [math]::Pow($_.SpendSharePct, 2) } | Measure-Object -Sum).Sum, 0)
$concentrationRisk = if ($hhi -gt 2500) { "HIGH - market dominated by few suppliers" }
                     elseif ($hhi -gt 1500) { "MODERATE - some concentration" }
                     else { "LOW - well diversified" }

# --- Output ---
$output = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format "o")
    ScoringWeights = $Weights
    ProcurementSummary = [PSCustomObject]@{
        TotalSuppliers = $Scorecards.Count
        TotalAnnualSpend = [math]::Round($totalSpend, 2)
        HHI = $hhi
        ConcentrationRisk = $concentrationRisk
        RiskDistribution = $riskDist
        RegionalDistribution = $regionDist
        Top3BySpend = $top3Spend
    }
    Suppliers = $Scorecards
}

$output | ConvertTo-Json -Depth 10 | Set-Content $OutputFile -Encoding UTF8

# --- Console ---
$spendFmt = '{0:N0}' -f $totalSpend
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SUPPLIER & VENDOR SCORECARD" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Suppliers: $($Scorecards.Count) | Annual Spend: `$$spendFmt" -ForegroundColor White
Write-Host "  HHI: $hhi ($concentrationRisk)" -ForegroundColor $(if ($hhi -gt 2500) { "Red" } elseif ($hhi -gt 1500) { "Yellow" } else { "Green" })
Write-Host ""
Write-Host "  --- Risk Distribution ---" -ForegroundColor Cyan
foreach ($r in $riskDist) {
    $color = switch ($r.Tier) { "HIGH" { "Red" } "ELEVATED" { "Yellow" } "MODERATE" { "White" } default { "Green" } }
    Write-Host "    $($r.Tier.PadRight(12)) $($r.Count) suppliers" -ForegroundColor $color
}
Write-Host ""
Write-Host "  --- Top Suppliers by Spend ---" -ForegroundColor Cyan
foreach ($s in ($Scorecards | Select-Object -First 5)) {
    $sFmt = '{0:N0}' -f $s.AnnualSpend
    Write-Host "    $($s.Supplier.PadRight(25)) `$$sFmt ($($s.SpendSharePct)%) [$($s.RiskTier)]" -ForegroundColor White
}
Write-Host ""
Write-Host "  Output: $OutputFile" -ForegroundColor Cyan
