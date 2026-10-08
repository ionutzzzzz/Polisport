// ============================================
// TIPURI TYPESCRIPT – Polisport Tournament
// ============================================

// --- UTILIZATORI / AUTENTIFICARE ---
export type UserRole = "admin" | "public";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

// --- ECHIPE ---
export interface Team {
  id: string;
  name: string;
  group_code?: string | null; // pentru faze viitoare
  created_at: string;
}

// --- JUCĂTORI ---
export type PlayerRole = "goalkeeper" | "player";

export interface Player {
  id: string;
  team_id: string;
  name: string;
  jersey_number: number;
  role: PlayerRole;
  photo_url?: string | null; // URL poză carnet (admin only)
  goals_scored: number;      // marcatori câmp
  goals_conceded: number;    // goluri primite (portari)
  created_at: string;
  // Relație join
  team?: Team;
}

// --- MECIURI ---
export type MatchStage =
  | "group"
  | "playoff"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final";

export type MatchStatus = "scheduled" | "in_progress" | "finished";

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  stage: MatchStage;
  match_time: string | null;  // ISO datetime
  status: MatchStatus;
  round: number | null;        // numărul rundei (1-4 în grupă)
  created_at: string;
  // Relații join
  home_team?: Team;
  away_team?: Team;
  goals?: Goal[];
}

// --- GOLURI ---
export interface Goal {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  minute: number | null;
  created_at: string;
  // Relații join
  player?: Player;
  team?: Team;
}

// --- CLASAMENT GRUPĂ ---
export interface StandingsRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  rank_position: number;
  qualification_status: "direct" | "playoff" | "eliminated";
}

// --- MARCATORI (Top Scorers) ---
export interface TopScorer {
  player: Player;
  team: Team;
  goals: number;
}

// --- TRAGERE LA SORȚI ---
export interface DrawResult {
  round: number; // 1-4
  home_team: Team;
  away_team: Team;
}

// --- FAZA ELIMINATORIE ---
export interface KnockoutMatch {
  id: string;
  stage: Exclude<MatchStage, "group" | "playoff">;
  match_number: number; // poziția în bracket
  home_team?: Team;
  away_team?: Team;
  home_score?: number | null;
  away_score?: number | null;
  status: MatchStatus;
  match_time?: string | null;
}

// --- TIPURI UTILITARE ---
export type WithId<T> = T & { id: string };

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}
