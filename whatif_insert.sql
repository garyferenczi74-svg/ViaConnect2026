INSERT INTO public.whatif_scenarios (scenario,type,description,impact,sku_count,annual_revenue,annual_net_profit,net_margin_pct,revenue_change_pct,net_profit_change_pct,margin_change) VALUES
('BASELINE','BASELINE','Reference portfolio at Balanced mix','POSITIVE',62,16353957.60,7880527.67,48.2,'0%','0%','0pp'),
('COGS +15% Across Board','COGS_SHIFT','Raw material costs increase 15% due to supply chain disruption','NEGATIVE',62,16353957.60,7359071.27,45.0,'0%','-6.6%','-3.2pp'),
('COGS +25% SNP Only','COGS_SHIFT','Specialty SNP ingredient costs spike 25%','NEGATIVE',62,16353957.60,7737823.67,47.3,'0%','-1.8%','-0.9pp'),
('Drop All Testing SKUs','SKU_REMOVAL','Discontinue entire Testing category (6 SKUs)','POSITIVE',56,15067065.60,7908837.82,52.5,'-7.9%','0.4%','4.3pp'),
('Drop Sunset + Watch SKUs','SKU_REMOVAL','Remove EpiGenDX (Sunset) and 4 Watch-tier SKUs','POSITIVE',57,15419220.48,7916506.92,51.3,'-5.7%','0.5%','3.1pp'),
('MSRP +10% All Products','PRICE_CHANGE','Across-the-board 10% price increase','POSITIVE',62,17989490.16,9016275.26,50.1,'10.0%','14.4%','1.9pp'),
('MSRP +20% Testing Only','PRICE_CHANGE','Aggressive repricing of Testing category','POSITIVE',62,16611351.12,8059272.17,48.5,'1.6%','2.3%','0.3pp'),
('Pivot to 90% DTC','CHANNEL_SHIFT','Shift heavily to direct-to-consumer, minimize wholesale/distributor','MIXED',62,21791354.16,10199519.21,46.8,'33.2%','29.4%','-1.4pp'),
('Wholesale Expansion','CHANNEL_SHIFT','Expand into practitioner wholesale channel aggressively','MIXED',62,14838265.92,7418132.50,50.0,'-9.3%','-5.9%','1.8pp'),
('Volume +50% Star SKUs','VOLUME_SHIFT','Double down on marketing for Star-tier products','MIXED',62,16353957.60,7880527.67,48.2,'0%','0%','0.0pp'),
('Recession: Volume -30%','VOLUME_SHIFT','Economic downturn reduces demand 30% across all products','MIXED',62,11443061.04,5515623.26,48.2,'-30.0%','-30.0%','0.0pp'),
('Best Case Combo','COMBINED','Price +8%, COGS -5%, volume +20%, shift to 70% DTC','POSITIVE',62,24755942.52,12302938.70,49.7,'51.4%','56.1%','1.5pp'),
('Worst Case Combo','COMBINED','COGS +20%, volume -25%, forced into distributor-heavy mix','NEGATIVE',62,9045796.80,3808215.26,42.1,'-44.7%','-51.7%','-6.1pp');
