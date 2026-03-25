$data = Get-Content 'C:/Users/garyf/ViaConnect2026/unit_economics.json' | ConvertFrom-Json
$sql = @()
foreach ($r in $data.SKUs) {
    $safeName = $r.Name -replace "'","''"
    foreach ($ch in @('DTC','Wholesale','Distributor')) {
        $c = $r.Channels.$ch
        $sql += "('$($r.SKU)','$safeName','$($r.Category)','$($r.Tier)','$ch',$($c.Price),$($c.COGS),$($c.VariableCostsPerUnit),$($c.ContributionMargin),$($c.ContributionMarginPct),$($c.CAC),$($c.OrderFrequency),$($c.UnitsPerOrder),$($c.RevenuePerOrder),$($c.ProfitPerOrder),$($c.AnnualRevenuePerCustomer),$($c.AnnualProfitPerCustomer),$($c.CustomerLifespanYears),$($c.LTV),$($c.LTVtoCACRatio),$($c.CACPaybackMonths),$($c.BreakevenUnitsPerMonth),$($c.BreakevenRevenue),'$($c.Flag)')"
    }
}
# Split into 3 chunks
$chunkSize = [math]::Ceiling($sql.Count / 3)
for ($i = 0; $i -lt 3; $i++) {
    $chunk = $sql | Select-Object -Skip ($i * $chunkSize) -First $chunkSize
    $insert = "INSERT INTO public.unit_economics (sku,name,category,tier,channel,price,cogs,variable_costs_per_unit,contribution_margin,contribution_margin_pct,cac,order_frequency,units_per_order,revenue_per_order,profit_per_order,annual_revenue_per_customer,annual_profit_per_customer,customer_lifespan_years,ltv,ltv_to_cac_ratio,cac_payback_months,breakeven_units_per_month,breakeven_revenue,flag) VALUES`n" + ($chunk -join ",`n") + ";"
    $insert | Set-Content "C:/Users/garyf/ViaConnect2026/unit_econ_insert_$($i+1).sql" -Encoding UTF8
}
Write-Host "Generated $($sql.Count) rows in 3 files"
