<# ================================================================
   FarmCeutica COGS Recalculation Engine
   Input:  updated_bom.csv (columns: SKU, Ingredient, MgPerCapsule, CostPerKg)
   Output: cogs_delta_report.json
   ================================================================ #>

param(
    [string]$BOMFile = "./updated_bom.csv",
    [string]$MasterFile = "./farmceutica_master_skus.json",
    [string]$OutputFile = "./cogs_delta_report.json"
)

$Master = Get-Content $MasterFile | ConvertFrom-Json
$BOM = Import-Csv $BOMFile

# --- Per-1000-unit overhead (capsules 60ct default) ---
$Overhead = @{ Manufacturing = 4000; Packaging = 1500; Compliance = 500; Logistics = 650 }
$OverheadPerUnit = ($Overhead.Values | Measure-Object -Sum).Sum / 1000

# --- Recalculate COGS from BOM ---
$Results = $Master | ForEach-Object {
    $sku = $_.SKU
    $oldCOGS = $_.COGS
    $skuIngredients = $BOM | Where-Object { $_.SKU -eq $sku }

    if ($skuIngredients) {
        $rawMatCost = ($skuIngredients | ForEach-Object {
            ($_.MgPerCapsule / 1000000) * $_.CostPerKg * 1000  # cost per 1000 units
        } | Measure-Object -Sum).Sum / 1000  # per unit

        $newCOGS = [math]::Round($rawMatCost + $OverheadPerUnit, 2)
        $delta = [math]::Round($newCOGS - $oldCOGS, 2)
        $pctChange = if($oldCOGS -gt 0) { [math]::Round(($delta / $oldCOGS) * 100, 1) } else { 0 }

        [PSCustomObject]@{
            SKU = $sku; Name = $_.Name; OldCOGS = $oldCOGS; NewCOGS = $newCOGS
            Delta = $delta; PctChange = "$pctChange%"
            NewDTCMargin = [math]::Round((1 - $newCOGS / $_.MSRP) * 100, 1)
            FLAG = if([math]::Abs($pctChange) -gt 10) { "REVIEW" } else { "OK" }
        }
    }
}

$Results | ConvertTo-Json -Depth 3 | Set-Content $OutputFile -Encoding UTF8
$flagged = ($Results | Where-Object { $_.FLAG -eq "REVIEW" }).Count
Write-Host "COGS recalculated for $($Results.Count) SKUs. $flagged flagged for review." -ForegroundColor Yellow
