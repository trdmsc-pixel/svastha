-- Seed IFCT 2017 Indian foods & sample recipes

insert into public.foods (id, name, name_hi, synonyms, source, per_100g, household_units, image_key) values
('ifct_roti', 'Whole-wheat roti (phulka)', 'रोटी / फुलका', array['roti','chapati','phulka'], 'IFCT2017', '{"kcal":297,"protein_g":9.8,"carbs_g":57.5,"fat_g":2.1,"fibre_g":8.6,"sodium_mg":12}'::jsonb, '{"roti":35,"piece":35}'::jsonb, 'foods/roti.webp'),
('ifct_dal_tadka', 'Dal tadka (toor dal)', 'दाल तड़का', array['dal','dal tadka','toor dal'], 'IFCT2017', '{"kcal":118,"protein_g":6.4,"carbs_g":15.2,"fat_g":3.4,"fibre_g":3.1,"sodium_mg":260}'::jsonb, '{"katori":180,"bowl":250}'::jsonb, 'foods/dal-tadka.webp'),
('ifct_rice_steamed', 'Steamed basmati rice', 'उबले चावल', array['rice','white rice','chawal'], 'IFCT2017', '{"kcal":130,"protein_g":2.7,"carbs_g":28.2,"fat_g":0.3,"fibre_g":0.4,"sodium_mg":2}'::jsonb, '{"katori":150,"bowl":220}'::jsonb, 'foods/rice-steamed.webp'),
('ifct_poha', 'Kanda poha with peanuts', 'पोहा', array['poha','kanda poha'], 'IFCT2017', '{"kcal":158,"protein_g":3.6,"carbs_g":26.8,"fat_g":4.1,"fibre_g":2.1,"sodium_mg":290}'::jsonb, '{"katori":150,"plate":220}'::jsonb, 'foods/poha.webp'),
('ifct_idli_sambar', 'Idli with sambar', 'इडली सांबर', array['idli','idli sambar'], 'IFCT2017', '{"kcal":132,"protein_g":4.3,"carbs_g":25.1,"fat_g":1.4,"fibre_g":2.3,"sodium_mg":280}'::jsonb, '{"piece":45,"plate":180}'::jsonb, 'foods/idli-sambar.webp'),
('ifct_paneer_bhurji', 'Paneer bhurji', 'पनीर भुर्जी', array['paneer','paneer bhurji'], 'IFCT2017', '{"kcal":214,"protein_g":13.8,"carbs_g":4.5,"fat_g":15.6,"fibre_g":1.1,"sodium_mg":310}'::jsonb, '{"katori":150}'::jsonb, 'foods/paneer-bhurji.webp'),
('ifct_curd', 'Plain curd (dahi)', 'दही', array['curd','dahi','yogurt'], 'IFCT2017', '{"kcal":61,"protein_g":3.5,"carbs_g":4.7,"fat_g":3.3,"fibre_g":0,"sodium_mg":46}'::jsonb, '{"katori":150}'::jsonb, 'foods/curd.webp'),
('ifct_besan_chilla', 'Besan chilla', 'बेसन चीला', array['besan chilla','chilla','cheela'], 'IFCT2017', '{"kcal":196,"protein_g":9.2,"carbs_g":24.5,"fat_g":6.4,"fibre_g":4.8,"sodium_mg":270}'::jsonb, '{"piece":65}'::jsonb, 'foods/besan-chilla.webp'),
('ifct_sprouts_chaat', 'Moong sprouts chaat', 'अंकुरित मूंग चाट', array['sprouts','moong sprouts'], 'IFCT2017', '{"kcal":105,"protein_g":7.4,"carbs_g":16.8,"fat_g":0.9,"fibre_g":4.2,"sodium_mg":140}'::jsonb, '{"katori":120}'::jsonb, 'foods/sprouts-chaat.webp'),
('ifct_makhana', 'Roasted makhana', 'भुना मखाना', array['makhana','fox nuts'], 'IFCT2017', '{"kcal":347,"protein_g":9.7,"carbs_g":76.9,"fat_g":0.1,"fibre_g":14.5,"sodium_mg":10}'::jsonb, '{"katori":25}'::jsonb, 'foods/makhana-roasted.webp')
on conflict (id) do nothing;

insert into public.recipes (id, name, image_key, minutes, difficulty, ingredients, steps, per_serving, tags) values
('rec_quinoa_bowl', 'Quinoa & Grilled Paneer Veggie Bowl', 'recipes/quinoa-veggie-bowl.webp', 20, 1, '["100g cooked quinoa","80g grilled paneer","60g cucumber","50g cherry tomatoes","1 tsp olive oil & lemon"]'::jsonb, '["Cook quinoa and cool slightly.","Lightly pan-grill paneer cubes with cumin.","Toss with chopped veggies and lemon dressing."]'::jsonb, '{"kcal":420,"protein_g":22,"carbs_g":46,"fat_g":15,"fibre_g":8}'::jsonb, array['vegetarian','high-fibre','liver-friendly'])
on conflict (id) do nothing;
