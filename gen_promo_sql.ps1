$data = Get-Content 'C:/Users/garyf/ViaConnect2026/promotion_roi_analysis.json' | ConvertFrom-Json
$sql = @()
foreach ($p in $data.Promotions) {
    $name = $p.Promotion -replace "'","''"
    $e = $p.Economics; $v = $p.VolumeImpact; $a = $p.Acquisition
    $exceeds = if ($v.ExceedsBreakeven) { 'true' } else { 'false' }
    $sql += "('$name','$($p.Code)','$($p.Type)','$($p.Discount)','$($p.Duration)','$($p.AppliesTo)',$($p.SKUsAffected),$($e.BaselineRevenue),$($e.PromoRevenue),$($e.RevenueDelta),$($e.BaselineGrossProfit),$($e.PromoGrossProfit),$($e.GrossProfitDelta),$($e.MarketingCost),$($e.CommissionCost),$($v.BaselineUnits),$($v.PromoUnits),'$($v.VolumeLift)','$($v.BreakevenLiftRequired)',$exceeds,$($a.NetNewCustomers),$($a.EffectiveCAC),$($p.ROI),'$($p.Rating)')"
}
$insert = "INSERT INTO public.promotion_roi (promotion,code,type,discount,duration,applies_to,skus_affected,baseline_revenue,promo_revenue,revenue_delta,baseline_gross_profit,promo_gross_profit,gp_delta,marketing_cost,commission_cost,baseline_units,promo_units,volume_lift,breakeven_lift,exceeds_breakeven,net_new_customers,effective_cac,roi,rating) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/promo_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) rows"
