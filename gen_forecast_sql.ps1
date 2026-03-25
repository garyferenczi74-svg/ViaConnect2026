$data = Get-Content 'C:/Users/garyf/ViaConnect2026/forecast_12month.json' | ConvertFrom-Json
$sql = @()
foreach ($m in $data.MonthlyForecast) {
    $sql += "($($m.Month),'$($m.Label)',$($m.CalendarMonth),$($m.SeasonalityIndex),$($m.Revenue.Total),$($m.Revenue.IndividualSKUs),$($m.Revenue.Bundles),$($m.Revenue.NewSKUs),$($m.Channels.DTC),$($m.Channels.Wholesale),$($m.Channels.Distributor),$($m.Costs.COGS),$($m.Costs.VariableCosts),$($m.GrossProfit),$($m.NetProfit),$($m.NetMarginPct),$($m.CumulativeRevenue),$($m.CumulativeNetProfit))"
}
$insert = "INSERT INTO public.forecast_monthly (forecast_month,label,calendar_month,seasonality_index,total_revenue,sku_revenue,bundle_revenue,new_sku_revenue,dtc_revenue,ws_revenue,dist_revenue,cogs,variable_costs,gross_profit,net_profit,net_margin_pct,cumulative_revenue,cumulative_net_profit) VALUES`n" + ($sql -join ",`n") + ";"

$msSql = @()
foreach ($ms in $data.Milestones) {
    $safe = $ms.Milestone -replace "'","''"
    $msSql += "($($ms.Month),'$($ms.Label)','$safe')"
}
$msInsert = "INSERT INTO public.forecast_milestones (forecast_month,label,milestone) VALUES`n" + ($msSql -join ",`n") + ";"

($insert + "`n`n" + $msInsert) | Set-Content 'C:/Users/garyf/ViaConnect2026/forecast_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) monthly rows, $($msSql.Count) milestones"
