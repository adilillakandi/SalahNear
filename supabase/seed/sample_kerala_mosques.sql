-- ==============================================================================
-- sample_kerala_mosques.sql
-- Seed data: Famous and historical Kerala mosques across major districts
-- ==============================================================================

insert into public.mosques (
  id, name, alternate_name, address, city_or_locality, district, state, location, attendance_radius_m, verification_status, is_active
) values
  (
    'a1111111-1111-1111-1111-111111111111',
    'Mishkal Mosque (കുറ്റിച്ചിറ മിശ്കാൽ പള്ളി)',
    'Mishkal Palli',
    'Kuttichira',
    'Kozhikode',
    'Kozhikode',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(75.7766, 11.2425), 4326)::extensions.geography,
    120,
    'verified',
    true
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    'Cheraman Juma Mosque (ചേരമാൻ ജുമാ മസ്ജിദ്)',
    'Oldest Mosque in India (629 CE)',
    'Methala, Kodungallur',
    'Kodungallur',
    'Thrissur',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(76.2001, 10.2163), 4326)::extensions.geography,
    150,
    'verified',
    true
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    'Palayam Juma Masjid (പാളയം ജുമാ മസ്ജിദ്)',
    'Masjid-i Jahan-Numa',
    'Palayam',
    'Thiruvananthapuram',
    'Thiruvananthapuram',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(76.9515, 8.5033), 4326)::extensions.geography,
    120,
    'verified',
    true
  ),
  (
    'a4444444-4444-4444-4444-444444444444',
    'Kozhikode Town Juma Masjid (ടൗൺ ജുമാ മസ്ജിദ്)',
    'Calicut Big Bazaar Mosque',
    'Palayam',
    'Kozhikode',
    'Kozhikode',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(75.7820, 11.2510), 4326)::extensions.geography,
    100,
    'verified',
    true
  ),
  (
    'a5555555-5555-5555-5555-555555555555',
    'Chembittapally (ചെമ്പിട്ടപള്ളി)',
    'Kochi Copper-Roof Mosque',
    'Kochangadi, Mattancherry',
    'Kochi',
    'Ernakulam',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(76.2570, 9.9525), 4326)::extensions.geography,
    100,
    'verified',
    true
  ),
  (
    'a6666666-6666-6666-6666-666666666666',
    'Malappuram Valiya Juma Masjid (വലിയ ജുമാ മസ്ജിദ്)',
    'Malappuram Town Mosque',
    'Valiyangadi',
    'Malappuram',
    'Malappuram',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(76.0711, 11.0722), 4326)::extensions.geography,
    110,
    'verified',
    true
  ),
  (
    'a7777777-7777-7777-7777-777777777777',
    'Malik Deenar Juma Masjid (മാലിക് ദീനാർ പള്ളി)',
    'Historical Malik Deenar Shrine & Mosque',
    'Thalangara',
    'Kasaragod',
    'Kasaragod',
    'Kerala',
    extensions.st_setsrid(extensions.st_makepoint(74.9866, 12.4925), 4326)::extensions.geography,
    140,
    'verified',
    true
  )
on conflict (id) do nothing;

-- Seed Sample Prayer Timetable for Mishkal Mosque for today
insert into public.prayer_schedules (
  mosque_id,
  prayer_date,
  fajr_start,
  dhuhr_start,
  asr_start,
  maghrib_start,
  isha_start,
  fajr_iqamah,
  dhuhr_iqamah,
  asr_iqamah,
  maghrib_iqamah,
  isha_iqamah,
  source_type
) values (
  'a1111111-1111-1111-1111-111111111111',
  current_date,
  '05:05:00',
  '12:15:00',
  '15:35:00',
  '18:05:00',
  '19:20:00',
  '05:30:00',
  '12:45:00',
  '16:00:00',
  '18:15:00',
  '19:45:00',
  'verified_timetable'
)
on conflict (mosque_id, prayer_date) do nothing;
