$data = Get-Content 'C:/Users/garyf/ViaConnect2026/bundle_optimization.json' | ConvertFrom-Json
$bundleSql = @()
$compSql = @()
foreach ($b in $data.Bundles) {
    $bn = $b.BundleName -replace "'","''"
    $desc = $b.Description -replace "'","''"
    $ta = $b.TargetAudience -replace "'","''"
    $p = $b.Pricing
    $pr = $b.Projection
    $bundleSql += "('$bn','$($b.Strategy)','$desc','$ta',$($b.SKUCount),$($b.StarCount),$($b.AvgCompositeScore),'$($b.QualityFlag)',$($p.IndividualTotal),'$($p.DiscountRate)',$($p.BundlePrice),$($p.CustomerSavings),$($p.BundleDTCMargin),$($p.BundleWSPrice),$($p.BundleWSMargin),$($p.TotalCOGS),$($pr.MonthlyBundleUnits),$($pr.MonthlyRevenue),$($pr.MonthlyGrossProfit),$($pr.RevenueUpliftPct),$($pr.AnnualBundleRevenue),$($pr.AnnualGrossProfit))"
    foreach ($c in $b.Components) {
        $cn = $c.Name -replace "'","''"
        $compSql += "('$bn','$($c.SKU)','$cn',$($c.MSRP),$($c.COGS),'$($c.Tier)',$($c.Score))"
    }
}
$insert1 = "INSERT INTO public.bundles (bundle_name,strategy,description,target_audience,sku_count,star_count,avg_composite_score,quality_flag,individual_total,discount_rate,bundle_price,customer_savings,bundle_dtc_margin,bundle_ws_price,bundle_ws_margin,total_cogs,monthly_bundle_units,monthly_revenue,monthly_gross_profit,revenue_uplift_pct,annual_bundle_revenue,annual_gross_profit) VALUES`n" + ($bundleSql -join ",`n") + ";"
$insert2 = "INSERT INTO public.bundle_components (bundle_name,sku,name,msrp,cogs,tier,score) VALUES`n" + ($compSql -join ",`n") + ";"
$insert1 | Set-Content 'C:/Users/garyf/ViaConnect2026/bundles_insert.sql' -Encoding UTF8
$insert2 | Set-Content 'C:/Users/garyf/ViaConnect2026/bundle_components_insert.sql' -Encoding UTF8
Write-Host "Generated $($bundleSql.Count) bundles, $($compSql.Count) components"
