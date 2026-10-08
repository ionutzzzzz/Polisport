"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getCurrentSport } from "@/lib/sport";

type ActionResult = { success: true } | { error: string };

function getAdminClient() {
  return createAdminClient();
}

export async function saveAllKnockoutMatchesAction(
  matchesData: { stage: string; home_team_id: string; away_team_id: string; bracket_position: string }[]
): Promise<ActionResult> {
  const supabase = getAdminClient();
  const sport = await getCurrentSport();

  if (!matchesData || matchesData.length === 0) {
    return { error: "Nu există meciuri valide de salvat." };
  }

  // Filtrăm meciurile incomplete pentru siguranță (deși sunt deja filtrate pe client)
  const validMatches = matchesData.filter(m => m.home_team_id && m.away_team_id);

  if (validMatches.length === 0) {
    return { error: "Toate meciurile trimise sunt incomplete." };
  }

  const toInsert = validMatches.map(m => ({
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
    stage: m.stage,
    bracket_position: m.bracket_position,
    status: "scheduled",
    match_time: null,
    sport_type: sport
  }));

  const { error } = await supabase.from("matches").insert(toInsert);
  if (error) return { error: error.message };

  revalidatePath("/admin/faze-eliminatorii");
  revalidatePath("/admin/meciuri");
  revalidatePath("/admin/program");
  revalidatePath("/public");

  return { success: true };
}
