-- Seed biomarker_dictionary, red_flag_rules, and retest_windows (Section 2.1.4 & 8.1 & 8.3)

insert into public.biomarker_dictionary (code, display_name, synonyms, system, canonical_unit, default_ranges, explainer_md) values
('AST', 'AST (SGOT)', array['sgot','ast','ast (sgot)','aspartate aminotransferase'], 'Liver', 'U/L', '{"default":"<50"}'::jsonb, 'Enzyme found in liver and muscle cells.'),
('ALT', 'ALT (SGPT)', array['sgpt','alt','alt (sgpt)','alanine aminotransferase'], 'Liver', 'U/L', '{"default":"<50"}'::jsonb, 'Liver-specific enzyme sensitive to liver stress or fatty liver.'),
('AST_ALT_RATIO', 'AST:ALT Ratio', array['ast:alt ratio','ast/alt ratio'], 'Liver', 'ratio', '{"default":"<1.00"}'::jsonb, 'Ratio comparing AST and ALT levels.'),
('GGTP', 'GGTP (GGT)', array['ggtp','ggt','gamma gt'], 'Liver', 'U/L', '{"default":"<55"}'::jsonb, 'Liver and bile duct enzyme sensitive to alcohol and metabolic stress.'),
('ALP', 'Alkaline Phosphatase (ALP)', array['alp','alkaline phosphatase'], 'Liver', 'U/L', '{"default":"30-120"}'::jsonb, 'Enzyme related to liver bile ducts and bone turnover.'),
('BILIRUBIN_TOTAL', 'Bilirubin Total', array['bilirubin total','total bilirubin'], 'Liver', 'mg/dL', '{"default":"0.30-1.20"}'::jsonb, 'Pigment processed by the liver from red blood cell breakdown.'),
('GLUCOSE_FASTING', 'Fasting Plasma Glucose', array['fasting plasma glucose','fbs','fasting glucose'], 'Blood sugar', 'mg/dL', '{"default":"70-100"}'::jsonb, 'Blood sugar level after an 8-12 hour overnight fast.'),
('HBA1C', 'HbA1c', array['hba1c','glycated hemoglobin'], 'Blood sugar', '%', '{"default":"<5.7"}'::jsonb, 'Average blood glucose over the past 2-3 months.'),
('CHOLESTEROL_TOTAL', 'Total Cholesterol', array['total cholesterol'], 'Heart & lipids', 'mg/dL', '{"default":"<200"}'::jsonb, 'Sum of cholesterol carried in blood lipoproteins.'),
('TRIGLYCERIDES', 'Triglycerides', array['triglycerides','tg'], 'Heart & lipids', 'mg/dL', '{"default":"<150"}'::jsonb, 'Blood fats influenced by refined carbs, alcohol, and activity.'),
('HDL', 'HDL Cholesterol', array['hdl','hdl cholesterol'], 'Heart & lipids', 'mg/dL', '{"default":">40"}'::jsonb, 'Protective cholesterol that helps clear excess lipids.'),
('LDL', 'LDL Cholesterol', array['ldl','ldl (calc.)','ldl cholesterol'], 'Heart & lipids', 'mg/dL', '{"default":"<100"}'::jsonb, 'Cholesterol particle associated with plaque build-up when elevated.'),
('VLDL', 'VLDL Cholesterol', array['vldl'], 'Heart & lipids', 'mg/dL', '{"default":"<30"}'::jsonb, 'Triglyceride-rich lipoprotein.'),
('NON_HDL', 'Non-HDL Cholesterol', array['non-hdl','non hdl'], 'Heart & lipids', 'mg/dL', '{"default":"<130"}'::jsonb, 'All potentially atherogenic cholesterol (Total minus HDL).'),
('CREATININE', 'Serum Creatinine', array['creatinine'], 'Kidney', 'mg/dL', '{"default":"0.70-1.30"}'::jsonb, 'Waste product filtered by the kidneys.'),
('POTASSIUM', 'Serum Potassium', array['potassium','k+'], 'Kidney', 'mmol/L', '{"default":"3.5-5.1"}'::jsonb, 'Essential electrolyte for heart and nerve function.'),
('TSH', 'TSH', array['tsh','thyroid stimulating hormone'], 'Thyroid', 'mIU/L', '{"default":"0.4-4.5"}'::jsonb, 'Pituitary hormone regulating thyroid gland activity.'),
('HAEMOGLOBIN', 'Haemoglobin', array['haemoglobin','hemoglobin','hb'], 'Blood count', 'g/dL', '{"default":"13.0-17.0"}'::jsonb, 'Oxygen-carrying protein in red blood cells.'),
('PLATELETS', 'Platelet Count', array['platelets','plt'], 'Blood count', '/µL', '{"default":"150000-410000"}'::jsonb, 'Blood cells essential for clotting.'),
('VITAMIN_D', 'Vitamin D (25-OH)', array['vitamin d','25-oh vitamin d'], 'Vitamins & minerals', 'ng/mL', '{"default":"30-100"}'::jsonb, 'Supports bone, immune, and muscle health.'),
('VITAMIN_B12', 'Vitamin B12', array['vitamin b12','cobalamin'], 'Vitamins & minerals', 'pg/mL', '{"default":"211-911"}'::jsonb, 'Essential for nerves and red blood cell production.')
on conflict (code) do nothing;

insert into public.red_flag_rules (id, biomarker_code, operator, threshold, unit, message) values
('rf_glucose_high', 'GLUCOSE_FASTING', '>=', 250, 'mg/dL', 'Fasting glucose >= 250 mg/dL. Please contact a doctor promptly.'),
('rf_glucose_low', 'GLUCOSE_FASTING', '<', 54, 'mg/dL', 'Fasting glucose < 54 mg/dL. Please seek prompt medical care.'),
('rf_hba1c_high', 'HBA1C', '>=', 10, '%', 'HbA1c >= 10%. Please review promptly with a doctor.'),
('rf_hb_low', 'HAEMOGLOBIN', '<', 8, 'g/dL', 'Haemoglobin < 8 g/dL. Please consult a doctor promptly.'),
('rf_alt_5x', 'ALT', 'xULN>', 5, 'U/L', 'ALT > 5x upper limit. Please contact a doctor promptly.'),
('rf_ast_5x', 'AST', 'xULN>', 5, 'U/L', 'AST > 5x upper limit. Please contact a doctor promptly.'),
('rf_potassium_low', 'POTASSIUM', '<', 3.0, 'mmol/L', 'Potassium < 3.0 mmol/L. Please seek prompt medical review.'),
('rf_potassium_high', 'POTASSIUM', '>', 6.0, 'mmol/L', 'Potassium > 6.0 mmol/L. Please seek prompt medical attention.'),
('rf_creatinine_2x', 'CREATININE', 'xULN>', 2, 'mg/dL', 'Creatinine > 2x upper limit. Please contact a doctor soon.'),
('rf_tsh_low', 'TSH', '<', 0.1, 'mIU/L', 'TSH < 0.1 mIU/L. Please discuss promptly with a doctor.'),
('rf_tsh_high', 'TSH', '>', 20, 'mIU/L', 'TSH > 20 mIU/L. Please discuss promptly with a doctor.'),
('rf_platelets_low', 'PLATELETS', '<', 50000, '/µL', 'Platelets < 50,000/µL. Please seek prompt medical evaluation.')
on conflict (id) do nothing;

insert into public.retest_windows (biomarker_group, weeks_min, weeks_max, source_note) values
('lipids', 12, 12, 'LAI suggests >= 3 months non-drug approach for low-risk profiles'),
('liver', 12, 12, 'Standard 12-week lifestyle follow-up for transaminases'),
('fasting_glucose', 8, 12, 'Recheck after 8-12 weeks of lifestyle changes'),
('hba1c', 12, 12, 'Reflects ~3 months average glycaemia'),
('vitamins', 8, 12, 'Vitamin D and B12 typically rechecked in 8-12 weeks'),
('blood_count', 8, 12, 'Haemoglobin and ferritin rechecked in 8-12 weeks'),
('thyroid', 6, 8, 'TSH rechecked 6-8 weeks after any doctor-led adjustment')
on conflict (biomarker_group) do nothing;
