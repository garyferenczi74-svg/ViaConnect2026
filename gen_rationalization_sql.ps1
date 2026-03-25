$data = Get-Content 'C:/Users/garyf/ViaConnect2026/sku_rationalization.json' | ConvertFrom-Json
$sql = @()
foreach ($r in $data.SKUs) {
    $safeName = $r.Name -replace "'","''"
    $actionsArr = ($r.Actions | ForEach-Object { '"' + ($_ -replace '"','\"') + '"' }) -join ','
    $sql += "('$($r.SKU)','$safeName','$($r.Category)',$($r.MSRP),$($r.COGS),$($r.DTCMargin),$($r.COGSRatio),$($r.ViableChannels),$($r.Scores.DTCMargin),$($r.Scores.ChannelBreadth),$($r.Scores.COGSEfficiency),$($r.Scores.WaterfallHealth),$($r.Scores.RevenueContribution),$($r.Scores.PricePoint),$($r.CompositeScore),'$($r.Tier)',ARRAY[$actionsArr])"
}
$insert = "INSERT INTO public.sku_rationalization (sku,name,category,msrp,cogs,dtc_margin,cogs_ratio,viable_channels,score_dtc_margin,score_channel_breadth,score_cogs_efficiency,score_waterfall_health,score_revenue_contribution,score_price_point,composite_score,tier,actions) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/rationalization_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) rows"
