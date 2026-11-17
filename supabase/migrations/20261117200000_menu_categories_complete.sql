-- Every category the public main menu lists, so the article editor's
-- "Show this article in" box never shows "category missing in database".
-- Existing rows keep their names; only missing rows are inserted, then the
-- menu parent, kind and order are aligned by slug. Reverse: no-op (rows are
-- referenced by post_categories).

-- Databases that skipped 20261029120000_taxonomy_phase1 lack these columns.
alter table public.categories
  add column if not exists name_hi text not null default '',
  add column if not exists category_kind text not null default 'listing';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_category_kind_check'
  ) then
    alter table public.categories
      add constraint categories_category_kind_check
      check (category_kind in ('news','kshetra','programme','listing','upcoming'));
  end if;
end $$;

with menu(slug, name_kn, name_en, name_hi, parent_slug, kind, sort_order) as (
  values
  ('state-jain-news', 'ರಾಜ್ಯ ಜೈನ ಸುದ್ದಿಗಳು', 'State Jain news', 'राज्य जैन समाचार', null, 'news', 100),
  ('jain-milan', 'ಜೈನ್ ಮಿಲನ್ ಸುದ್ದಿಗಳು', 'Jain Milan news', 'जैन मिलन समाचार', null, 'news', 101),
  ('other-state-news', 'ಹೊರ ರಾಜ್ಯ ಸುದ್ದಿಗಳು', 'News from other states', 'अन्य राज्यों के समाचार', null, 'news', 102),
  ('kshetra-parichaya', 'ಜಿಲ್ಲಾವಾರು ಜೈನ ಕ್ಷೇತ್ರ ಪರಿಚಯ', 'Kshetra introductions by district', 'ज़िलेवार जैन क्षेत्र परिचय', null, 'kshetra', 103),
  ('panchakalyana', 'ಪಂಚಕಲ್ಯಾಣಗಳು', 'Panchakalyanas', 'पंचकल्याणक', null, 'news', 3),
  ('jain-bhakti-geete', 'ಜೈನ ಭಕ್ತಿಗೀತೆಗಳು', 'Jain devotional songs', 'जैन भक्ति गीत', null, 'listing', 104),
  ('jain-matha', 'ಜೈನ ಮಠಗಳು', 'Jain mathas', 'जैन मठ', null, 'news', 105),
  ('mahamastakabhisheka', 'ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ', 'Mahamastakabhisheka', 'महामस्तकाभिषेक', null, 'news', 106),
  ('useful-information', 'ಉಪಯುಕ್ತ ಮಾಹಿತಿ', 'Useful information', 'उपयोगी जानकारी', null, 'listing', 107),
  ('jwalamala-programmes', 'ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್ ಸುದ್ದಿ ವಾಹಿನಿ ಕಾರ್ಯಕ್ರಮಗಳು', 'Jwalamala News programmes', 'ज्वालामाल न्यूज़ कार्यक्रम', null, 'programme', 108),
  ('sadhakara-hejje', 'ಜ್ವಾಲಾಮಾಲ ಸಾಧಕರ ಹೆಜ್ಜೆ', 'Footsteps of achievers', 'साधकों के पदचिह्न', 'jwalamala-programmes', 'programme', 110),
  ('hemmeya-shravakaru', 'ಜ್ವಾಲಾಮಾಲ ಹೆಮ್ಮೆಯ ಶ್ರಾವಕರು', 'Proud shravakas', 'गौरवशाली श्रावक', 'jwalamala-programmes', 'programme', 111),
  ('sahitigalondige-samvada', 'ಸಾಹಿತಿಗಳೊಂದಿಗೆ ಸಂವಾದ', 'Conversations with writers', 'साहित्यकारों से संवाद', 'jwalamala-programmes', 'programme', 112),
  ('kiru-parichaya', 'ಕಿರು ಪರಿಚಯ / ವ್ಯಕ್ತಿ ಪರಿಚಯ', 'Short profiles', 'संक्षिप्त परिचय', 'jwalamala-programmes', 'programme', 113),
  ('jnana-deepike', 'ಜ್ವಾಲಾಮಾಲ ಜ್ಞಾನ ದೀಪಿಕೆ – ಜೈನ ಸಾಹಿತಿಗಳ ಪರಿಚಯ', 'Jnana Deepike – Jain writers', 'ज्ञान दीपिका – जैन साहित्यकार', 'jwalamala-programmes', 'programme', 114),
  ('jnana-deevige', 'ಜ್ವಾಲಾಮಾಲ ಜ್ಞಾನ ದೀವಿಗೆ – ಜೈನ ಪುಸ್ತಕಗಳ ಪರಿಚಯ', 'Jnana Deevige – Jain books', 'ज्ञान दीविगे – जैन पुस्तकें', 'jwalamala-programmes', 'programme', 115),
  ('dharmada-nudi', 'ಜ್ವಾಲಾಮಾಲ ಧರ್ಮದ ನುಡಿ', 'Words of dharma', 'धर्म के वचन', 'jwalamala-programmes', 'programme', 116),
  ('weekly-jain-news', 'ಜ್ವಾಲಾಮಾಲ ವಾರದ ಜೈನ ಸುದ್ದಿಗಳು', 'Weekly Jain news', 'साप्ताहिक जैन समाचार', 'jwalamala-programmes', 'news', 117),
  ('jain-habbagalu', 'ಜ್ವಾಲಾಮಾಲ ಜೈನ ಹಬ್ಬಗಳು', 'Jain festivals', 'जैन पर्व', 'jwalamala-programmes', 'programme', 118),
  ('jain-jeevana-shaili', 'ಜ್ವಾಲಾಮಾಲ ಜೈನ – ಜಾತಿಯಲ್ಲ, ಜೀವನ ಶೈಲಿ', 'Jain – not a caste, a way of life', 'जैन – जाति नहीं, जीवन शैली', 'jwalamala-programmes', 'programme', 119),
  ('chintana-manthana', 'ಜ್ವಾಲಾಮಾಲ ಚಿಂತನ–ಮಂಥನ', 'Chintana–Manthana', 'चिंतन–मंथन', 'jwalamala-programmes', 'programme', 120),
  ('social-media', 'ಸಾಮಾಜಿಕ ಜಾಲತಾಣ', 'Social media', 'सोशल मीडिया', null, 'listing', 109),
  ('social-posters', 'ಪೋಸ್ಟರ್‌ಗಳು', 'Posters', 'पोस्टर', 'social-media', 'listing', 121),
  ('social-videos', 'ವಿಡಿಯೋಗಳು', 'Videos', 'वीडियो', 'social-media', 'listing', 122)
),
inserted as (
  insert into public.categories (slug, name_kn, name_en, name_hi, sort_order, category_kind, show_in_menu, is_seed)
  select m.slug, m.name_kn, m.name_en, m.name_hi, m.sort_order, m.kind, true, false
  from menu m
  where not exists (select 1 from public.categories c where c.slug = m.slug)
  returning slug
)
select count(*) from inserted;

-- Align parents, kinds and order with the menu (names are left as edited).
with menu(slug, parent_slug, kind, sort_order) as (
  values
  ('state-jain-news', null, 'news', 100),
  ('jain-milan', null, 'news', 101),
  ('other-state-news', null, 'news', 102),
  ('kshetra-parichaya', null, 'kshetra', 103),
  ('panchakalyana', null, 'news', 3),
  ('jain-bhakti-geete', null, 'listing', 104),
  ('jain-matha', null, 'news', 105),
  ('mahamastakabhisheka', null, 'news', 106),
  ('useful-information', null, 'listing', 107),
  ('jwalamala-programmes', null, 'programme', 108),
  ('social-media', null, 'listing', 109),
  ('sadhakara-hejje', 'jwalamala-programmes', 'programme', 110),
  ('hemmeya-shravakaru', 'jwalamala-programmes', 'programme', 111),
  ('sahitigalondige-samvada', 'jwalamala-programmes', 'programme', 112),
  ('kiru-parichaya', 'jwalamala-programmes', 'programme', 113),
  ('jnana-deepike', 'jwalamala-programmes', 'programme', 114),
  ('jnana-deevige', 'jwalamala-programmes', 'programme', 115),
  ('dharmada-nudi', 'jwalamala-programmes', 'programme', 116),
  ('weekly-jain-news', 'jwalamala-programmes', 'news', 117),
  ('jain-habbagalu', 'jwalamala-programmes', 'programme', 118),
  ('jain-jeevana-shaili', 'jwalamala-programmes', 'programme', 119),
  ('chintana-manthana', 'jwalamala-programmes', 'programme', 120),
  ('social-posters', 'social-media', 'listing', 121),
  ('social-videos', 'social-media', 'listing', 122)
)
update public.categories c
set parent_id = p.id,
    category_kind = m.kind,
    sort_order = m.sort_order
from menu m
left join public.categories p on p.slug = m.parent_slug
where c.slug = m.slug
  and (
    c.parent_id is distinct from p.id
    or c.category_kind is distinct from m.kind
    or c.sort_order is distinct from m.sort_order
  );
