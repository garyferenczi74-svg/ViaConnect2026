$data = Get-Content 'C:/Users/garyf/ViaConnect2026/updated_pricing_tiers.json' | ConvertFrom-Json
$sql = @()
foreach ($r in $data) {
    $safeName = $r.Name -replace "'","''"
    $dtc = [decimal]($r.DTCMargin -replace '%','')
    $ws = [decimal]($r.WSMargin -replace '%','')
    $cogs_ratio = [decimal]($r.COGSRatio -replace '%','')
    $changed = if ($r.Changed) { 'true' } else { 'false' }
    $alerts = $r.Alerts -replace "'","''"
    $sql += "('$($r.SKU)','$safeName','$($r.Category)',$($r.MSRP),$($r.COGS),$($r.Wholesale),$($r.Distributor),$dtc,$ws,$cogs_ratio,$changed,'$alerts')"
}
$insert = "INSERT INTO public.pricing_tiers (sku,name,category,msrp,cogs,wholesale,distributor,dtc_margin,ws_margin,cogs_ratio,changed,alerts) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/pricing_tiers_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) rows"
