const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const dbPath = path.join(__dirname, "../data/polisport.db");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("foreign_keys = OFF");

console.log("🧹 Resetting tables and triggers...");

db.exec(`
  DROP TRIGGER IF EXISTS trg_update_standings;
  DROP TRIGGER IF EXISTS trg_update_player_stats;
  DROP TRIGGER IF EXISTS trg_revert_player_stats;
  DROP VIEW IF EXISTS public_players;
  DROP TABLE IF EXISTS match_events;
  DROP TABLE IF EXISTS matches;
  DROP TABLE IF EXISTS players;
  DROP TABLE IF EXISTS teams;
  DROP TABLE IF EXISTS users;
`);

console.log("📐 Creating schema and triggers...");

db.exec(`
  CREATE TABLE teams (
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

  CREATE TABLE players (
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

  CREATE TABLE matches (
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

  CREATE TABLE match_events (
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

  CREATE VIEW public_players AS
  SELECT id, team_id, name, jersey_number, role, goals_scored, goals_conceded, created_at
  FROM players;

  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TRIGGER trg_update_standings
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

  CREATE TRIGGER trg_update_player_stats
  AFTER INSERT ON match_events
  FOR EACH ROW
  BEGIN
    UPDATE players SET goals_scored = goals_scored + 1
    WHERE id = NEW.player_id AND NEW.event_type = 'goal_scored';

    UPDATE players SET goals_conceded = goals_conceded + 1
    WHERE id = NEW.player_id AND NEW.event_type = 'goal_conceded';
  END;

  CREATE TRIGGER trg_revert_player_stats
  AFTER DELETE ON match_events
  FOR EACH ROW
  BEGIN
    UPDATE players SET goals_scored = MAX(0, goals_scored - 1)
    WHERE id = OLD.player_id AND OLD.event_type = 'goal_scored';

    UPDATE players SET goals_conceded = MAX(0, goals_conceded - 1)
    WHERE id = OLD.player_id AND OLD.event_type = 'goal_conceded';
  END;
`);

db.pragma("foreign_keys = ON");

console.log("👤 Creating admin user...");
db.prepare(`
  INSERT INTO users (id, email, password_hash, role)
  VALUES (?, ?, ?, 'admin')
`).run(crypto.randomUUID(), "andrei.armean17@gmail.com", "admin123");

// Define 32 teams grouped across A, B, C, D (8 teams each)
const GROUPS_DATA = {
  A: [
    "AC United",
    "ETTI Timișoara",
    "FC Mecanica",
    "Metalurgistul UPT",
    "Construcții Boys",
    "Arhitectura FC",
    "Chimie Industrială",
    "Management Stars",
  ],
  B: [
    "Telecom Tigers",
    "Software Engineers FC",
    "Energetica Timișoara",
    "Hidrotehnica United",
    "Geodezia FC",
    "Robotica Tech",
    "Transporturi UPT",
    "Politehnica Legends",
  ],
  C: [
    "Cyber Security FC",
    "AI Titans",
    "Mecatronica Warriors",
    "Design Industrial",
    "Inginerie Medicală",
    "Instalații FC",
    "Logistica United",
    "Științe Aplicate",
  ],
  D: [
    "Data Science FC",
    "Cloud Computing FC",
    "Materiale Avansate",
    "Electronică Aplicată",
    "Rețele & Sisteme",
    "Topografie Boys",
    "Energetica Nucleară",
    "Olimpia Politehnica",
  ],
};

const PLAYER_ROSTER = [
  { name: "Portar", jersey: 1, role: "goalkeeper" },
  { name: "Andrei Ionescu", jersey: 7, role: "player" },
  { name: "Mihai Popescu", jersey: 9, role: "player" },
  { name: "Radu Stan", jersey: 10, role: "player" },
  { name: "Cristian Dima", jersey: 11, role: "player" },
  { name: "Alexandru Marin", jersey: 23, role: "player" },
];

const teamInsertStmt = db.prepare(`
  INSERT INTO teams (id, name, group_name, sport_type)
  VALUES (?, ?, ?, 'football')
`);

const playerInsertStmt = db.prepare(`
  INSERT INTO players (id, team_id, name, jersey_number, role, goals_scored, goals_conceded)
  VALUES (?, ?, ?, ?, ?, 0, 0)
`);

const matchInsertStmt = db.prepare(`
  INSERT INTO matches (id, home_team_id, away_team_id, stage, status, match_time, round, sport_type)
  VALUES (?, ?, ?, 'group', ?, ?, ?, 'football')
`);

console.log("🛡️ Inserting 32 teams and player squads...");

const teamsMap = {}; // teamName -> { id, group, players: [] }
const allTeamsByGroup = { A: [], B: [], C: [], D: [] };

for (const [groupName, teamNames] of Object.entries(GROUPS_DATA)) {
  for (const teamName of teamNames) {
    const teamId = crypto.randomUUID();
    teamInsertStmt.run(teamId, teamName, groupName);

    const teamObj = { id: teamId, name: teamName, group: groupName, players: [] };
    teamsMap[teamName] = teamObj;
    allTeamsByGroup[groupName].push(teamObj);

    // Insert squad
    for (const p of PLAYER_ROSTER) {
      const playerId = crypto.randomUUID();
      const pName = p.role === "goalkeeper" ? `Portar (${teamName.split(" ")[0]})` : `${p.name} (${teamName.split(" ")[0]})`;
      playerInsertStmt.run(playerId, teamId, pName, p.jersey, p.role);
      teamObj.players.push({ id: playerId, name: pName, jersey: p.jersey, role: p.role });
    }
  }
}

console.log("⚽ Generating group matches (4 matches per team)...");

const matchesList = [];
let matchIndex = 0;

// Base dates: starting today and following days
const today = new Date();
today.setHours(10, 0, 0, 0);

for (const [groupName, teams] of Object.entries(allTeamsByGroup)) {
  const n = teams.length; // 8 teams

  // Distance 1 pairings
  for (let i = 0; i < n; i++) {
    const home = teams[i];
    const away = teams[(i + 1) % n];
    const matchId = crypto.randomUUID();

    // Schedule time
    const matchTime = new Date(today.getTime() + (matchIndex * 2 + 1) * 3600 * 1000).toISOString();
    matchesList.push({
      id: matchId,
      home,
      away,
      group: groupName,
      round: 1,
      matchTime,
      status: "scheduled",
    });
    matchIndex++;
  }

  // Distance 2 pairings
  for (let i = 0; i < n; i++) {
    const home = teams[i];
    const away = teams[(i + 2) % n];
    const matchId = crypto.randomUUID();

    // Leave some unscheduled for admin scheduler testing, schedule others
    const isUnscheduled = i >= 6;
    const matchTime = isUnscheduled
      ? null
      : new Date(today.getTime() + (24 + matchIndex) * 3600 * 1000).toISOString();

    matchesList.push({
      id: matchId,
      home,
      away,
      group: groupName,
      round: 2,
      matchTime,
      status: "scheduled",
    });
    matchIndex++;
  }
}

// Insert all 64 matches
for (const m of matchesList) {
  matchInsertStmt.run(m.id, m.home.id, m.away.id, m.status, m.matchTime, m.round);
}

console.log(`✅ Generated ${matchesList.length} matches across Groups A, B, C, D.`);

// Complete a few matches in Round 1 for realistic standings and top scorers
console.log("📊 Simulating initial finished matches for standings...");

const finishMatchStmt = db.prepare(`
  UPDATE matches
  SET status = 'finished', home_score = ?, away_score = ?
  WHERE id = ?
`);

const eventInsertStmt = db.prepare(`
  INSERT INTO match_events (id, match_id, player_id, team_id, event_type, minute, points_value)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);

// Finish 2 matches per group with varied results
for (const groupName of ["A", "B", "C", "D"]) {
  const groupMatches = matchesList.filter(m => m.group === groupName);

  // Match 1: 3 - 1
  const m1 = groupMatches[0];
  finishMatchStmt.run(3, 1, m1.id);

  // Home goals
  eventInsertStmt.run(crypto.randomUUID(), m1.id, m1.home.players[1].id, m1.home.id, "goal_scored", 14);
  eventInsertStmt.run(crypto.randomUUID(), m1.id, m1.home.players[2].id, m1.home.id, "goal_scored", 38);
  eventInsertStmt.run(crypto.randomUUID(), m1.id, m1.home.players[2].id, m1.home.id, "goal_scored", 72);
  // Away goal
  eventInsertStmt.run(crypto.randomUUID(), m1.id, m1.away.players[1].id, m1.away.id, "goal_scored", 55);
  // Yellow card
  eventInsertStmt.run(crypto.randomUUID(), m1.id, m1.home.players[3].id, m1.home.id, "yellow_card", 60);

  // Match 2: 2 - 2
  const m2 = groupMatches[1];
  finishMatchStmt.run(2, 2, m2.id);

  eventInsertStmt.run(crypto.randomUUID(), m2.id, m2.home.players[3].id, m2.home.id, "goal_scored", 20);
  eventInsertStmt.run(crypto.randomUUID(), m2.id, m2.home.players[1].id, m2.home.id, "goal_scored", 85);
  eventInsertStmt.run(crypto.randomUUID(), m2.id, m2.away.players[2].id, m2.away.id, "goal_scored", 42);
  eventInsertStmt.run(crypto.randomUUID(), m2.id, m2.away.players[3].id, m2.away.id, "goal_scored", 89);
}

console.log("🎉 Database seeded successfully with 32 teams!");
console.log(`- Teams: ${db.prepare("SELECT count(*) as c FROM teams").get().c}`);
console.log(`- Players: ${db.prepare("SELECT count(*) as c FROM players").get().c}`);
console.log(`- Matches: ${db.prepare("SELECT count(*) as c FROM matches").get().c}`);
console.log(`- Finished matches: ${db.prepare("SELECT count(*) as c FROM matches WHERE status='finished'").get().c}`);
console.log(`- Unscheduled matches: ${db.prepare("SELECT count(*) as c FROM matches WHERE match_time IS NULL").get().c}`);
console.log(`- Match events: ${db.prepare("SELECT count(*) as c FROM match_events").get().c}`);

db.close();
