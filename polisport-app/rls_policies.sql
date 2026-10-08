-- ============================================================
--  POLISPORT TOURNAMENT — Script RLS Final (Versiunea Simplă)
--  Rulează TOATE comenzile de mai jos în Supabase → SQL Editor
-- ============================================================

-- ─── PASUL 1: Dezactivează temporar RLS pentru a șterge politicile vechi ───
ALTER TABLE teams         DISABLE ROW LEVEL SECURITY;
ALTER TABLE players       DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches       DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_events  DISABLE ROW LEVEL SECURITY;

-- ─── PASUL 2: Șterge TOATE politicile existente ────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE tablename IN ('teams', 'players', 'matches', 'match_events')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ─── PASUL 3: Reactivează RLS ──────────────────────────────────────────────
ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events  ENABLE ROW LEVEL SECURITY;

-- ─── PASUL 4: Politici TEAMS ───────────────────────────────────────────────
-- Oricine poate citi echipele (pentru clasament public)
CREATE POLICY "teams_select_all"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

-- Utilizatorii autentificați (admini) pot face toate operațiunile
CREATE POLICY "teams_insert_authenticated"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "teams_update_authenticated"
  ON teams FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teams_delete_authenticated"
  ON teams FOR DELETE
  TO authenticated
  USING (true);

-- ─── PASUL 5: Politici PLAYERS ─────────────────────────────────────────────
CREATE POLICY "players_select_all"
  ON players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "players_insert_authenticated"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "players_update_authenticated"
  ON players FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "players_delete_authenticated"
  ON players FOR DELETE
  TO authenticated
  USING (true);

-- ─── PASUL 6: Politici MATCHES ─────────────────────────────────────────────
CREATE POLICY "matches_select_all"
  ON matches FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "matches_insert_authenticated"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "matches_update_authenticated"
  ON matches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "matches_delete_authenticated"
  ON matches FOR DELETE
  TO authenticated
  USING (true);

-- ─── PASUL 7: Politici MATCH_EVENTS ────────────────────────────────────────
CREATE POLICY "match_events_select_all"
  ON match_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "match_events_insert_authenticated"
  ON match_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "match_events_update_authenticated"
  ON match_events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "match_events_delete_authenticated"
  ON match_events FOR DELETE
  TO authenticated
  USING (true);

-- ─── PASUL 8: Verificare finală ────────────────────────────────────────────
-- Ar trebui să vadă 16 politici (4 tabele × 4 operațiuni)
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('teams', 'players', 'matches', 'match_events')
ORDER BY tablename, cmd;
