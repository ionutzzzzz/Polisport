import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { getCurrentSport, SPORT_LABELS, SPORT_ICONS } from "@/lib/sport";
import KnockoutManager from "@/components/admin/KnockoutManager";

export const metadata: Metadata = { title: "Admin — Faze Eliminatorii" };
export const dynamic = "force-dynamic";

export default async function AdminKnockoutsPage() {
  const sport = await getCurrentSport();
  const supabase = createPublicClient();

  // Preluăm echipele
  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .eq("sport_type", sport)
    .not("group_name", "is", null);

  // Preluăm meciurile deja existente
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(`
      id, home_team_id, away_team_id, home_score, away_score,
      penalty_winner_id, status, stage, round, match_time, bracket_position,
      home_team:teams!matches_home_team_id_fkey(id, name),
      away_team:teams!matches_away_team_id_fkey(id, name)
    `)
    .eq("sport_type", sport)
    .in("stage", ["ro16", "quarter", "semi", "final", "third_place"]);

  const error = teamsError || matchesError;

  if (error) {
    return <div className="p-8 text-red-600">Eroare: {error.message}</div>;
  }

  const teams = teamsData ?? [];

  // Sortăm echipele în grupe
  const sortTeams = (a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goals_scored - a.goals_conceded;
    const gdB = b.goals_scored - b.goals_conceded;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goals_scored !== a.goals_scored) return b.goals_scored - a.goals_scored;
    return a.name.localeCompare(b.name);
  };

  const topTeams: any[] = [];
  const teamsPerGroup = sport === "basketball" ? 2 : 4;
  
  ["A", "B", "C", "D"].forEach(g => {
    const groupTeams = teams.filter(t => t.group_name === g).sort(sortTeams);
    topTeams.push(...groupTeams.slice(0, teamsPerGroup));
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <span className="text-4xl">🔥</span> Faze Eliminatorii
        </h1>
        <p className="text-gray-500 mt-2 text-sm max-w-2xl">
          Construiește manual bracket-ul. {sport === "basketball" 
            ? "Pentru baschet, arborele începe direct din Sferturi (primele 2 clasate din fiecare grupă)." 
            : "Pentru fotbal, arborele începe din Optimi (primele 4 clasate din fiecare grupă)."}
        </p>
      </div>

      <KnockoutManager topTeams={topTeams} allTeams={teams} existingMatches={matches as any} sport={sport} />
    </div>
  );
}
