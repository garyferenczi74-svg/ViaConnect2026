$data = Get-Content 'C:/Users/garyf/ViaConnect2026/whatif_results.json' | ConvertFrom-Json
$sql = @()
$sql += "('BASELINE','BASELINE','Reference portfolio at Balanced mix','POSITIVE',$($data.Baseline.SKUCount),$($data.Baseline.AnnualRevenue),$($data.Baseline.AnnualNetProfit),$($data.Baseline.NetMarginPct),'0%','0%','0pp')"
foreach ($s in $data.Scenarios) {
    $name = $s.Scenario -replace "'","''"
    $desc = $s.Description -replace "'","''"
    $sql += "('$name','$($s.Type)','$desc','$($s.Impact)',$($s.Result.SKUCount),$($s.Result.AnnualRevenue),$($s.Result.AnnualNetProfit),$($s.Result.NetMarginPct),'$($s.VsBaseline.RevenueChangePct)','$($s.VsBaseline.NetProfitChangePct)','$($s.VsBaseline.MarginChange)')"
}
$insert = "INSERT INTO public.whatif_scenarios (scenario,type,description,impact,sku_count,annual_revenue,annual_net_profit,net_margin_pct,revenue_change_pct,net_profit_change_pct,margin_change) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/whatif_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) rows"
