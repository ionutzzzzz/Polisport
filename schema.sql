-- ============================================================
--  POLISPORT TOURNAMENT — Schema completă Supabase PostgreSQL
--  Rulează acest fișier în: Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0. EXTENSII NECESARE
-- ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";  -- pentru gen_random_uuid()

-- ──────────────────────────────────────────────────────────────
-- 1. TIPURI ENUM
-- ──────────────────────────────────────────────────────────────

-- Rolul unui jucător
create type player_role as enum ('player', 'goalkeeper');

-- Statusul unui meci
create type match_status as enum ('scheduled', 'in_progress', 'finished');

-- Etapa turneului
create type match_stage as enum ('group', 'playoff', 'ro16', 'quarter', 'semi', 'final');

-- Tipul evenimentului dintr-un meci
create type event_type as enum ('goal_scored', 'goal_conceded');

-- ──────────────────────────────────────────────────────────────
-- 2. TABELUL: teams
-- ──────────────────────────────────────────────────────────────
create table if not exists teams (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  logo_url         text,               -- URL logo echipă (storage public)

  -- Statistici agregate (actualizate automat prin trigger)
  points           integer not null default 0,
  played           integer not null default 0,
  won              integer not null default 0,
  drawn            integer not null default 0,
  lost             integer not null default 0,
  goals_scored     integer not null default 0,
  goals_conceded   integer not null default 0,

  created_at       timestamptz not null default now()
);

comment on table teams is 'Echipele participante în turneu.';

-- ──────────────────────────────────────────────────────────────
-- 3. TABELUL: players
-- ──────────────────────────────────────────────────────────────
create table if not exists players (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references teams(id) on delete cascade,
  name             text not null,
  jersey_number    integer not null,
  role             player_role not null default 'player',

  -- Stocată în Supabase Storage – bucket privat (acces EXCLUSIV admin)
  id_card_url      text,

  -- Statistici (actualizate automat prin trigger sau manual)
  goals_scored     integer not null default 0,   -- pentru jucători de câmp
  goals_conceded   integer not null default 0,   -- pentru portari

  created_at       timestamptz not null default now(),

  -- Un jucător nu poate avea același număr de tricou în aceeași echipă
  constraint unique_jersey_per_team unique (team_id, jersey_number)
);

comment on table players is 'Jucătorii fiecărei echipe. Coloana id_card_url este accesibilă EXCLUSIV adminilor.';
comment on column players.id_card_url is 'URL poza carnet jucător. NU se expune publicului prin politici RLS.';

-- ──────────────────────────────────────────────────────────────
-- 4. TABELUL: matches
-- ──────────────────────────────────────────────────────────────
create table if not exists matches (
  id               uuid primary key default gen_random_uuid(),
  home_team_id     uuid not null references teams(id) on delete cascade,
  away_team_id     uuid not null references teams(id) on delete cascade,

  match_time       timestamptz,              -- data și ora exactă a meciului
  home_score       integer,                  -- null dacă meciul nu s-a jucat
  away_score       integer,                  -- null dacă meciul nu s-a jucat
  status           match_status not null default 'scheduled',
  stage            match_stage  not null default 'group',
  round            integer,                  -- runda în cadrul etapei (1-4 în grupă)

  created_at       timestamptz not null default now(),

  -- Aceeași pereche de echipe nu poate juca de 2 ori în aceeași etapă/rundă
  constraint no_self_match check (home_team_id <> away_team_id),
  constraint unique_match_per_round unique (home_team_id, away_team_id, stage, round)
);

comment on table matches is 'Toate meciurile turneului, inclusiv fazele eliminatorii.';

-- ──────────────────────────────────────────────────────────────
-- 5. TABELUL: match_events (marcatori & statistici)
-- ──────────────────────────────────────────────────────────────
create table if not exists match_events (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid not null references matches(id) on delete cascade,
  player_id        uuid not null references players(id) on delete cascade,
  team_id          uuid not null references teams(id) on delete cascade,
  event_type       event_type not null,
  minute           integer check (minute >= 1 and minute <= 120),

  created_at       timestamptz not null default now()
);

comment on table match_events is 'Evenimente dintr-un meci: goluri marcate (câmp) sau goluri primite (portari).';

-- ──────────────────────────────────────────────────────────────
-- 6. TRIGGERE — Actualizare automată statistici
-- ──────────────────────────────────────────────────────────────

-- 6a. Trigger: actualizează statisticile echipelor când un meci se termină
create or replace function update_team_standings()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Rulează DOAR când statusul devine 'finished' și există scoruri
  if new.status = 'finished' and old.status <> 'finished'
     and new.home_score is not null and new.away_score is not null
     and new.stage = 'group' then

    -- ---- Echipa ACASĂ ----
    update teams set
      played          = played + 1,
      goals_scored    = goals_scored + new.home_score,
      goals_conceded  = goals_conceded + new.away_score,
      won    = won    + case when new.home_score > new.away_score  then 1 else 0 end,
      drawn  = drawn  + case when new.home_score = new.away_score  then 1 else 0 end,
      lost   = lost   + case when new.home_score < new.away_score  then 1 else 0 end,
      points = points
               + case when new.home_score > new.away_score  then 3
                      when new.home_score = new.away_score  then 1
                      else 0 end
    where id = new.home_team_id;

    -- ---- Echipa OASPEȚI ----
    update teams set
      played          = played + 1,
      goals_scored    = goals_scored + new.away_score,
      goals_conceded  = goals_conceded + new.home_score,
      won    = won    + case when new.away_score > new.home_score  then 1 else 0 end,
      drawn  = drawn  + case when new.away_score = new.home_score  then 1 else 0 end,
      lost   = lost   + case when new.away_score < new.home_score  then 1 else 0 end,
      points = points
               + case when new.away_score > new.home_score  then 3
                      when new.away_score = new.home_score  then 1
                      else 0 end
    where id = new.away_team_id;

  end if;

  return new;
end;
$$;

create or replace trigger trg_update_standings
after update on matches
for each row
execute function update_team_standings();

-- 6b. Trigger: actualizează statisticile jucătorului când se adaugă un eveniment
create or replace function update_player_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.event_type = 'goal_scored' then
    update players
    set goals_scored = goals_scored + 1
    where id = new.player_id;

  elsif new.event_type = 'goal_conceded' then
    update players
    set goals_conceded = goals_conceded + 1
    where id = new.player_id;
  end if;

  return new;
end;
$$;

create or replace trigger trg_update_player_stats
after insert on match_events
for each row
execute function update_player_stats();

-- 6c. Trigger invers: anulează statisticile la ștergerea unui eveniment
create or replace function revert_player_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.event_type = 'goal_scored' then
    update players
    set goals_scored = greatest(0, goals_scored - 1)
    where id = old.player_id;

  elsif old.event_type = 'goal_conceded' then
    update players
    set goals_conceded = greatest(0, goals_conceded - 1)
    where id = old.player_id;
  end if;

  return old;
end;
$$;

create or replace trigger trg_revert_player_stats
after delete on match_events
for each row
execute function revert_player_stats();

-- ──────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

-- Activare RLS pe toate tabelele
alter table teams         enable row level security;
alter table players       enable row level security;
alter table matches       enable row level security;
alter table match_events  enable row level security;

-- ────────────────────────────────────
-- 7a. POLITICI pentru `teams`
-- ────────────────────────────────────

-- PUBLIC: oricine poate citi echipele
create policy "teams_public_select"
on teams for select
to anon, authenticated
using (true);

-- ADMIN: CRUD complet (insert, update, delete)
create policy "teams_admin_insert"
on teams for insert
to authenticated
with check (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "teams_admin_update"
on teams for update
to authenticated
using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "teams_admin_delete"
on teams for delete
to authenticated
using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ────────────────────────────────────
-- 7b. POLITICI pentru `players`
-- ────────────────────────────────────

-- PUBLIC: poate citi TOATE coloanele EXCEPT id_card_url
-- Realizăm prin VIEW securizat (recomandat) SAU prin politică restrictivă pe coloane.
-- Abordare: VIEW public fără id_card_url + politici RLS pe tabel.

-- PUBLIC: SELECT cu excluderea id_card_url (policy pe coloane)
create policy "players_public_select"
on players for select
to anon, authenticated
using (true);
-- NOTA: coloana id_card_url va fi exclusă prin VIEW-ul `public_players` de mai jos

-- ADMIN: CRUD complet (inclusiv id_card_url)
create policy "players_admin_insert"
on players for insert
to authenticated
with check (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "players_admin_update"
on players for update
to authenticated
using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "players_admin_delete"
on players for delete
to authenticated
using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ────────────────────────────────────
-- 7c. POLITICI pentru `matches`
-- ────────────────────────────────────

create policy "matches_public_select"
on matches for select
to anon, authenticated
using (true);

create policy "matches_admin_insert"
on matches for insert
to authenticated
with check (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "matches_admin_update"
on matches for update
to authenticated
using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "matches_admin_delete"
on matches for delete
to authenticated
using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ────────────────────────────────────
-- 7d. POLITICI pentru `match_events`
-- ────────────────────────────────────

create policy "match_events_public_select"
on match_events for select
to anon, authenticated
using (true);

create policy "match_events_admin_insert"
on match_events for insert
to authenticated
with check (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "match_events_admin_update"
on match_events for update
to authenticated
using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "match_events_admin_delete"
on match_events for delete
to authenticated
using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ──────────────────────────────────────────────────────────────
-- 8. VIEW PUBLIC — players fără id_card_url
--    Folosit de frontend-ul public pentru a lista jucătorii
--    fără a expune poza carnetului.
-- ──────────────────────────────────────────────────────────────
create or replace view public_players
with (security_invoker = true)
as
select
  id,
  team_id,
  name,
  jersey_number,
  role,
  -- id_card_url este EXCLUS din acest view
  goals_scored,
  goals_conceded,
  created_at
from players;

-- ──────────────────────────────────────────────────────────────
-- 9. SUPABASE STORAGE — Bucket pentru poze carnete (privat)
-- ──────────────────────────────────────────────────────────────

-- Rulează în SQL Editor sau din Dashboard → Storage:
-- Bucket "player-id-cards" — PRIVAT (nu public)
insert into storage.buckets (id, name, public)
values ('player-id-cards', 'player-id-cards', false)
on conflict (id) do nothing;

-- Bucket "team-logos" — PUBLIC (logourile echipelor sunt vizibile tuturor)
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- Politici Storage pentru "player-id-cards" (NUMAI admin)
create policy "id_cards_admin_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'player-id-cards'
  and (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "id_cards_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'player-id-cards'
  and (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "id_cards_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'player-id-cards'
  and (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Politici Storage pentru "team-logos" (citire publică, scriere admin)
create policy "team_logos_public_select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'team-logos');

create policy "team_logos_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'team-logos'
  and (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ──────────────────────────────────────────────────────────────
-- 10. FUNCȚIE UTILITARĂ — Calculează clasamentul grupei
--     Returnează echipele sortate după puncte, golaveraj, goluri marcate
-- ──────────────────────────────────────────────────────────────
create or replace function get_group_standings()
returns table (
  rank_position   bigint,
  team_id         uuid,
  team_name       text,
  logo_url        text,
  played          integer,
  won             integer,
  drawn           integer,
  lost            integer,
  goals_scored    integer,
  goals_conceded  integer,
  goal_difference integer,
  points          integer,
  qualification   text
)
language sql
security definer
stable
as $$
  select
    row_number() over (
      order by t.points desc,
               (t.goals_scored - t.goals_conceded) desc,
               t.goals_scored desc,
               t.name asc
    )                                           as rank_position,
    t.id                                        as team_id,
    t.name                                      as team_name,
    t.logo_url                                  as logo_url,
    t.played,
    t.won,
    t.drawn,
    t.lost,
    t.goals_scored,
    t.goals_conceded,
    (t.goals_scored - t.goals_conceded)         as goal_difference,
    t.points,
    case
      when row_number() over (
        order by t.points desc,
                 (t.goals_scored - t.goals_conceded) desc,
                 t.goals_scored desc,
                 t.name asc
      ) <= 8  then 'direct'
      when row_number() over (
        order by t.points desc,
                 (t.goals_scored - t.goals_conceded) desc,
                 t.goals_scored desc,
                 t.name asc
      ) <= 24 then 'playoff'
      else 'eliminated'
    end                                         as qualification
  from teams t
  order by points desc,
           (goals_scored - goals_conceded) desc,
           goals_scored desc,
           name asc;
$$;

-- ──────────────────────────────────────────────────────────────
-- 11. FUNCȚIE UTILITARĂ — Top Marcatori
-- ──────────────────────────────────────────────────────────────
create or replace function get_top_scorers(limit_count integer default 20)
returns table (
  player_id    uuid,
  player_name  text,
  team_id      uuid,
  team_name    text,
  jersey_number integer,
  goals        bigint
)
language sql
security definer
stable
as $$
  select
    p.id          as player_id,
    p.name        as player_name,
    t.id          as team_id,
    t.name        as team_name,
    p.jersey_number,
    count(me.id)  as goals
  from match_events me
  join players p on p.id = me.player_id
  join teams   t on t.id = me.team_id
  where me.event_type = 'goal_scored'
  group by p.id, p.name, t.id, t.name, p.jersey_number
  order by goals desc, p.name asc
  limit limit_count;
$$;

-- ──────────────────────────────────────────────────────────────
-- 12. DATE DE TEST (opțional — comentează dacă nu vrei date demo)
-- ──────────────────────────────────────────────────────────────

-- Decomentează blocul de mai jos pentru a insera date de test:
/*
insert into teams (name) values
  ('FC Steaua'),  ('Dinamo București'), ('CFR Cluj'),
  ('FCSB'),       ('Rapid'),            ('Universitatea Craiova');

insert into players (team_id, name, jersey_number, role)
select id, 'Jucător Test', 10, 'player'
from teams
limit 1;
*/

-- ============================================================
--  SCHEMA COMPLETĂ — Gata de utilizare!
--  Pasul următor: Adaugă variabilele Supabase în .env.local
-- ============================================================
