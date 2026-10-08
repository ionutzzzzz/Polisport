-- ============================================================
--  POLISPORT TOURNAMENT — Script de reparare a permisiunilor bazei de date (GRANTs)
-- ============================================================
-- Eroarea "permission denied for table teams" nu este o problemă de RLS,
-- ci indică faptul că rolurile API ale Supabase nu au primit accesul de bază 
-- pe tabelă atunci când aceasta a fost creată.
--
-- Rulează ACEST script în Supabase -> SQL Editor:

-- 1. Acordă permisiuni complete pentru tabele rolurilor esențiale API:
GRANT ALL ON TABLE teams TO anon, authenticated, service_role;
GRANT ALL ON TABLE players TO anon, authenticated, service_role;
GRANT ALL ON TABLE matches TO anon, authenticated, service_role;
GRANT ALL ON TABLE match_events TO anon, authenticated, service_role;

-- 2. Acordă permisiuni pentru secvențe (dacă folosești id-uri auto-incrementale):
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Mesaj de confirmare (opțional):
SELECT 'Permisiunile (GRANTs) au fost reparate cu succes!' as info;
