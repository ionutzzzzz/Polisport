-- ============================================================
--  POLISPORT TOURNAMENT — Script pentru a rezolva "Permission Denied"
--  Rulează acest script în Supabase -> SQL Editor
-- ============================================================

-- Dezactivează complet Row Level Security (RLS) pentru toate tabelele.
-- Aceasta va permite cheii "anon" să citească (SELECT) și să scrie (INSERT/UPDATE/DELETE) fără restricții.

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_events DISABLE ROW LEVEL SECURITY;

-- Mesaj de succes opțional
SELECT 'RLS a fost dezactivat cu succes. Nu vor mai exista erori de permission denied.' as info;
