$data = Get-Content 'C:/Users/garyf/ViaConnect2026/channel_mix_results.json' | ConvertFrom-Json
$sql = @()
foreach ($s in $data.Scenarios) {
    $desc = $s.Description -replace "'","''"
    $dtcShare = $s.ChannelSummary.DTC.RevenueShare
    $wsShare = $s.ChannelSummary.Wholesale.RevenueShare
    $distShare = $s.ChannelSummary.Distributor.RevenueShare
    $sql += "('$($s.Scenario)','$desc',$($s.Mix.DTC),$($s.Mix.Wholesale),$($s.Mix.Distributor),$($s.Summary.MonthlyUnits),$($s.Summary.MonthlyRevenue),$($s.Summary.MonthlyCOGS),$($s.Summary.MonthlyGrossProfit),$($s.Summary.MonthlyVariableCosts),$($s.Summary.MonthlyNetProfit),$($s.Summary.BlendedNetMarginPct),$($s.Summary.AnnualRevenue),$($s.Summary.AnnualNetProfit),$dtcShare,$wsShare,$distShare)"
}
$insert = "INSERT INTO public.channel_mix_scenarios (scenario,description,dtc_mix,ws_mix,dist_mix,monthly_units,monthly_revenue,monthly_cogs,monthly_gross_profit,monthly_variable_costs,monthly_net_profit,blended_net_margin_pct,annual_revenue,annual_net_profit,dtc_revenue_share,ws_revenue_share,dist_revenue_share) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/channel_mix_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) scenario rows"
