"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getCurrentSport } from "@/lib/sport";

type ActionResult = { success: true } | { error: string };

function getAdminClient() {
  return createAdminClient();
}

export async function resetTournamentAction(): Promise<ActionResult> {
  const supabase = getAdminClient();
  const sport = await getCurrentSport();

  // 1. Șterge toate evenimentele de meci (goluri)
  const { error: eventsError } = await supabase
    .from("match_events")
    .delete()
    .eq("sport_type", sport);

  if (eventsError) return { error: `Eroare la ștergerea evenimentelor: ${eventsError.message}` };

  // 2. Șterge toate meciurile
  const { error: matchesError } = await supabase
    .from("matches")
    .delete()
    .eq("sport_type", sport);

  if (matchesError) return { error: `Eroare la ștergerea meciurilor: ${matchesError.message}` };

  // 3. Resetează statisticile echipelor (păstrează echipele și jucătorii)
  const { error: teamsError } = await supabase
    .from("teams")
    .update({
      group_name: null,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_scored: 0,
      goals_conceded: 0,
    })
    .eq("sport_type", sport);

  if (teamsError) return { error: `Eroare la resetarea echipelor: ${teamsError.message}` };

  // 4. Resetează golurile jucătorilor
  const { data: sportTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("sport_type", sport);
  const teamIds = (sportTeams ?? []).map((t: any) => t.id);

  if (teamIds.length > 0) {
    const { error: playersError } = await supabase
      .from("players")
      .update({
        goals_scored: 0,
        goals_conceded: 0,
      })
      .in("team_id", teamIds);

    if (playersError) return { error: `Eroare la resetarea jucătorilor: ${playersError.message}` };
  }

  // Revalidare cache
  revalidatePath("/admin");
  revalidatePath("/admin/clasament");
  revalidatePath("/admin/tragere-la-sorti");
  revalidatePath("/admin/meciuri");
  revalidatePath("/admin/program");
  revalidatePath("/admin/faze-eliminatorii");
  revalidatePath("/public");

  return { success: true };
}
