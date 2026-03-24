<# ================================================================
   FarmCeutica Pricing Tier Auto-Calculator
   Input:  pricing_updates.csv (columns: SKU, NewMSRP)
   Output: updated_pricing_tiers.json
   Takes updated MSRP values and recalculates the complete three-tier
   pricing structure (DTC/Wholesale/Distributor) with margin validation.
   ================================================================ #>

param(
    [string]$UpdateFile = "./pricing_updates.csv",
    [string]$MasterFile = "./farmceutica_master_skus.json",
    [string]$OutputFile = "./updated_pricing_tiers.json"
)

$ErrorActionPreference = "Stop"

$Master = Get-Content $MasterFile | ConvertFrom-Json
$Updates = Import-Csv $UpdateFile

$Results = $Master | ForEach-Object {
    $sku = $_.SKU
    $update = $Updates | Where-Object { $_.SKU -eq $sku }
    $msrp = if ($update) { [double]$update.NewMSRP } else { $_.MSRP }
    $cogs = $_.COGS

    $ws = [math]::Round($msrp * 0.50, 2)
    $dist = [math]::Round($msrp * 0.30, 2)
    $dtcMgn = [math]::Round((1 - $cogs / $msrp) * 100, 1)
    $wsMgn = [math]::Round((1 - $cogs / $ws) * 100, 1)
    $cogsRatio = [math]::Round(($cogs / $msrp) * 100, 1)

    # --- Margin Floor Validation ---
    $minDTC = 70.0; $minWS = 50.0
    $alert = @()
    if ($dtcMgn -lt $minDTC) { $alert += "DTC_LOW" }
    if ($wsMgn -lt $minWS) { $alert += "WS_LOW" }

    [PSCustomObject]@{
        SKU = $sku; Name = $_.Name; Category = $_.Category
        MSRP = $msrp; COGS = $cogs; Wholesale = $ws; Distributor = $dist
        DTCMargin = "$dtcMgn%"; WSMargin = "$wsMgn%"; COGSRatio = "$cogsRatio%"
        Changed = [bool]$update
        Alerts = if ($alert) { $alert -join "," } else { "PASS" }
    }
}

$changed = ($Results | Where-Object { $_.Changed }).Count
$alerts = ($Results | Where-Object { $_.Alerts -ne "PASS" }).Count
Write-Host "$changed SKUs updated. $alerts margin alerts." -ForegroundColor $(if($alerts){"Red"}else{"Green"})
$Results | ConvertTo-Json -Depth 3 | Set-Content $OutputFile -Encoding UTF8
Write-Host "Output: $OutputFile" -ForegroundColor Cyan
