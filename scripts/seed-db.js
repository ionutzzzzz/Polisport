const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'polisport.db');
const dumpPath = path.join(__dirname, '..', '..', 'supabase_dump.json');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

// Schema
db.exec(`
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    points INTEGER NOT NULL DEFAULT 0,
    played INTEGER NOT NULL DEFAULT 0,
    won INTEGER NOT NULL DEFAULT 0,
    drawn INTEGER NOT NULL DEFAULT 0,
    lost INTEGER NOT NULL DEFAULT 0,
    goals_scored INTEGER NOT NULL DEFAULT 0,
    goals_conceded INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    group_name TEXT,
    sport_type TEXT NOT NULL DEFAULT 'football'
);

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    jersey_number INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'goalkeeper')),
    id_card_url TEXT,
    goals_scored INTEGER NOT NULL DEFAULT 0,
    goals_conceded INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT unique_jersey_per_team UNIQUE (team_id, jersey_number)
);

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    home_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    away_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    match_time TEXT,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'finished')),
    stage TEXT NOT NULL DEFAULT 'group' CHECK (stage IN ('group', 'playoff', 'ro16', 'quarter', 'semi', 'final', 'third_place')),
    round INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    penalty_winner_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    match_date TEXT,
    bracket_position TEXT,
    sport_type TEXT NOT NULL DEFAULT 'football',
    forfeit_loser_id TEXT REFERENCES teams(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS match_events (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('goal_scored', 'goal_conceded', 'yellow_card', 'red_card')),
    minute INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sport_type TEXT NOT NULL DEFAULT 'football',
    points_value INTEGER NOT NULL DEFAULT 1
);

CREATE VIEW IF NOT EXISTS public_players AS
SELECT id, team_id, name, jersey_number, role, goals_scored, goals_conceded, created_at
FROM players;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_update_standings
AFTER UPDATE OF status ON matches
FOR EACH ROW
WHEN NEW.status = 'finished' AND OLD.status != 'finished'
     AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL
     AND NEW.stage = 'group'
BEGIN
    UPDATE teams SET
        played = played + 1,
        goals_scored = goals_scored + NEW.home_score,
        goals_conceded = goals_conceded + NEW.away_score,
        won = won + (CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END),
        drawn = drawn + (CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END),
        lost = lost + (CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END),
        points = points + (CASE WHEN NEW.home_score > NEW.away_score THEN 3 WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END)
    WHERE id = NEW.home_team_id;

    UPDATE teams SET
        played = played + 1,
        goals_scored = goals_scored + NEW.away_score,
        goals_conceded = goals_conceded + NEW.home_score,
        won = won + (CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END),
        drawn = drawn + (CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END),
        lost = lost + (CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END),
        points = points + (CASE WHEN NEW.away_score > NEW.home_score THEN 3 WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END)
    WHERE id = NEW.away_team_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_update_player_stats
AFTER INSERT ON match_events
FOR EACH ROW
BEGIN
    UPDATE players SET goals_scored = goals_scored + 1
    WHERE id = NEW.player_id AND NEW.event_type = 'goal_scored';

    UPDATE players SET goals_conceded = goals_conceded + 1
    WHERE id = NEW.player_id AND NEW.event_type = 'goal_conceded';
END;

CREATE TRIGGER IF NOT EXISTS trg_revert_player_stats
AFTER DELETE ON match_events
FOR EACH ROW
BEGIN
    UPDATE players SET goals_scored = MAX(0, goals_scored - 1)
    WHERE id = OLD.player_id AND OLD.event_type = 'goal_scored';

    UPDATE players SET goals_conceded = MAX(0, goals_conceded - 1)
    WHERE id = OLD.player_id AND OLD.event_type = 'goal_conceded';
END;
`);

if (fs.existsSync(dumpPath)) {
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  const count = db.prepare('SELECT count(*) as cnt FROM teams').get().cnt;
  if (count === 0) {
    console.log('Seeding SQLite database with Supabase data...');
    const insertTeams = db.transaction((teams) => {
      for (const t of teams) {
        const cols = Object.keys(t);
        const placeholders = cols.map(() => '?').join(', ');
        db.prepare(`INSERT OR REPLACE INTO teams (${cols.join(', ')}) VALUES (${placeholders})`).run(...Object.values(t));
      }
    });
    insertTeams(dump.teams || []);

    const insertPlayers = db.transaction((players) => {
      for (const p of players) {
        const cols = Object.keys(p);
        const placeholders = cols.map(() => '?').join(', ');
        db.prepare(`INSERT OR REPLACE INTO players (${cols.join(', ')}) VALUES (${placeholders})`).run(...Object.values(p));
      }
    });
    insertPlayers(dump.players || []);

    const insertMatches = db.transaction((matches) => {
      for (const m of matches) {
        const cols = Object.keys(m);
        const placeholders = cols.map(() => '?').join(', ');
        db.prepare(`INSERT OR REPLACE INTO matches (${cols.join(', ')}) VALUES (${placeholders})`).run(...Object.values(m));
      }
    });
    insertMatches(dump.matches || []);

    const insertEvents = db.transaction((events) => {
      for (const e of events) {
        const cols = Object.keys(e);
        const placeholders = cols.map(() => '?').join(', ');
        db.prepare(`INSERT OR REPLACE INTO match_events (${cols.join(', ')}) VALUES (${placeholders})`).run(...Object.values(e));
      }
    });
    insertEvents(dump.match_events || []);
  }

  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, role)
    VALUES ('admin-1', 'andrei.armean17@gmail.com', 'admin123', 'admin')
  `).run();
}

db.pragma('foreign_keys = ON');

console.log('Database verified successfully:');
console.log('Teams:', db.prepare('SELECT count(*) as cnt FROM teams').get().cnt);
console.log('Players:', db.prepare('SELECT count(*) as cnt FROM players').get().cnt);
console.log('Matches:', db.prepare('SELECT count(*) as cnt FROM matches').get().cnt);
console.log('Match events:', db.prepare('SELECT count(*) as cnt FROM match_events').get().cnt);
console.log('Users:', db.prepare('SELECT count(*) as cnt FROM users').get().cnt);
db.close();
