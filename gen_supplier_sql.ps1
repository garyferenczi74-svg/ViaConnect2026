$data = Get-Content 'C:/Users/garyf/ViaConnect2026/supplier_scorecard.json' | ConvertFrom-Json
$sql = @()
foreach ($s in $data.Suppliers) {
    $name = $s.Supplier -replace "'","''"
    $certs = ($s.QualityCerts | ForEach-Object { "'$($_ -replace "'","''")'" }) -join ','
    $recs = ($s.Recommendations | ForEach-Object { "'$($_ -replace "'","''")'" }) -join ','
    $sc = $s.Scores
    $sql += "('$name','$($s.Region)',$($s.LeadTimeDays),ARRAY[$certs],'$($s.PaymentTerms)',$($s.IngredientCount),$($s.SKUCount),$($s.SKUExposurePct),$($s.AnnualSpend),$($s.SpendSharePct),$($sc.CostConcentration),$($sc.LeadTimeRisk),$($sc.SKUExposure),$($sc.RegionalRisk),$($sc.CertStrength),$($sc.PaymentTerms),$($s.CompositeScore),'$($s.RiskTier)',ARRAY[$recs])"
}
$insert = "INSERT INTO public.supplier_scorecard (supplier,region,lead_time_days,quality_certs,payment_terms,ingredient_count,sku_count,sku_exposure_pct,annual_spend,spend_share_pct,score_cost_concentration,score_lead_time,score_sku_exposure,score_regional_risk,score_cert_strength,score_payment_terms,composite_score,risk_tier,recommendations) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/supplier_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) rows"
