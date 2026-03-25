$data = Get-Content 'C:/Users/garyf/ViaConnect2026/margin_waterfall.json' | ConvertFrom-Json
$sql = @()
foreach ($sku in $data.SKUs) {
    foreach ($chanName in @('DTC','Wholesale','Distributor')) {
        $ch = $sku.Channels.$chanName
        $wf = $ch.Waterfall
        $flag = if ($ch.NetMarginPct -lt 10) { 'ALERT' } else { 'OK' }
        $safeName = $sku.Name -replace "'","''"
        $vals = @(
            "'$($sku.SKU)'"
            "'$safeName'"
            "'$($sku.Category)'"
            "'$chanName'"
            $ch.Revenue
            $wf[0].Amount
            $wf[1].Amount
            $wf[2].Amount
            $wf[3].Amount
            $wf[4].Amount
            $wf[5].Amount
            $wf[6].Amount
            $ch.NetMargin
            $ch.NetMarginPct
            "'$flag'"
        ) -join ','
        $sql += "($vals)"
    }
}
$insert = "INSERT INTO public.margin_waterfall (sku,name,category,channel,revenue,cogs_amount,fulfillment,payment_processing,platform_fees,marketing_cac,returns_chargebacks,channel_overhead,net_margin,net_margin_pct,flag) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/margin_waterfall_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) rows"
