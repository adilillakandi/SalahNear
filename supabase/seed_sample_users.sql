-- ==============================================================================
-- SALAHNEAR: OPTIONAL SAMPLE CONGREGANTS SEED SCRIPT
-- Inserts sample profiles and points into Supabase for testing leaderboard & moderation
-- ==============================================================================

-- 1. Insert Sample Profiles (with valid UUIDs)
INSERT INTO public.profiles (
  id,
  full_name,
  username,
  district,
  state,
  account_status
) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Fahad Rahiman', 'fahad_calicut', 'Kozhikode', 'Kerala', 'active'),
  ('11111111-1111-1111-1111-111111111102', 'Salman Faris', 'salman_mlp', 'Malappuram', 'Kerala', 'active'),
  ('11111111-1111-1111-1111-111111111103', 'Aisha Siddiqa', 'aisha_ekm', 'Ernakulam', 'Kerala', 'active'),
  ('11111111-1111-1111-1111-111111111104', 'Zameer KP', 'zameer_knr', 'Kannur', 'Kerala', 'active'),
  ('11111111-1111-1111-1111-111111111105', 'Bilal Ahmad', 'bilal_tvm', 'Thiruvananthapuram', 'Kerala', 'active'),
  ('11111111-1111-1111-1111-111111111106', 'Imam Rashid Moulavi', 'mishkal_imam', 'Kozhikode', 'Kerala', 'active')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  username = EXCLUDED.username,
  district = EXCLUDED.district;

-- 2. Insert Initial Streaks
INSERT INTO public.user_streaks (user_id, current_streak, longest_streak)
VALUES
  ('11111111-1111-1111-1111-111111111101', 14, 21),
  ('11111111-1111-1111-1111-111111111102', 12, 18),
  ('11111111-1111-1111-1111-111111111103', 9, 15),
  ('11111111-1111-1111-1111-111111111104', 8, 12),
  ('11111111-1111-1111-1111-111111111105', 7, 10),
  ('11111111-1111-1111-1111-111111111106', 45, 60)
ON CONFLICT (user_id) DO UPDATE SET
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak;

-- 3. Insert Initial Points Ledger Transactions
INSERT INTO public.user_points (user_id, points, activity_type, reason)
VALUES
  ('11111111-1111-1111-1111-111111111101', 320, 'prayer_attendance', 'Initial congregational attendance points balance'),
  ('11111111-1111-1111-1111-111111111102', 295, 'prayer_attendance', 'Initial congregational attendance points balance'),
  ('11111111-1111-1111-1111-111111111103', 260, 'prayer_attendance', 'Initial congregational attendance points balance'),
  ('11111111-1111-1111-1111-111111111104', 240, 'prayer_attendance', 'Initial congregational attendance points balance'),
  ('11111111-1111-1111-1111-111111111105', 210, 'prayer_attendance', 'Initial congregational attendance points balance'),
  ('11111111-1111-1111-1111-111111111106', 580, 'prayer_attendance', 'Initial congregational attendance points balance');
