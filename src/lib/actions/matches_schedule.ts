"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionResult = { success: true } | { error: string };

function getAdminClient() {
  return createAdminClient();
}

export async function scheduleMatchAction(formData: FormData): Promise<ActionResult> {
  const supabase = getAdminClient();
  const id = formData.get("id") as string;
  const datetime = formData.get("datetime") as string; // ex: 2026-10-15T18:30

  if (!id || !datetime) {
    return { error: "ID meci sau dată lipsă." };
  }

  const { error } = await supabase
    .from("matches")
    .update({ 
      match_time: new Date(datetime).toISOString() 
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/meciuri");
  revalidatePath("/admin/program");
  revalidatePath("/public");
  
  return { success: true };
}

export async function deleteMatchAction(id: string): Promise<ActionResult> {
  const supabase = getAdminClient();
  if (!id) return { error: "ID meci lipsă." };

  // First delete match events if any (though usually cascading is on, good practice)
  await supabase.from("match_events").delete().eq("match_id", id);
  
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/meciuri");
  revalidatePath("/admin/program");
  revalidatePath("/admin/faze-eliminatorii");
  revalidatePath("/public");

  return { success: true };
}
