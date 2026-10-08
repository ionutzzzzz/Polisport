import { cookies } from "next/headers";

export type SportType = "football" | "basketball";

export const SPORT_LABELS: Record<SportType, string> = {
  football: "Fotbal",
  basketball: "Baschet",
};

export const SPORT_ICONS: Record<SportType, string> = {
  football: "⚽",
  basketball: "🏀",
};

export async function getCurrentSport(): Promise<SportType> {
  const cookieStore = await cookies();
  const sport = cookieStore.get("polisport_sport_type")?.value;
  if (sport === "basketball") return "basketball";
  return "football";
}
