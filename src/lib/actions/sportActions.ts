"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SportType } from "@/lib/sport";

export async function selectSportAction(sport: SportType) {
  const cookieStore = await cookies();
  cookieStore.set("polisport_sport_type", sport, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    // No maxAge = session cookie (expires when browser closes)
  });
  redirect("/admin");
}
