import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { selectSportAction } from "@/lib/actions/sportActions";
import { SPORT_LABELS, SPORT_ICONS, SportType } from "@/lib/sport";

export default async function SelectSportPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") {
    redirect("/auth/login");
  }

  const sports: { key: SportType; color: string; hoverColor: string; bgGrad: string }[] = [
    { key: "football", color: "green", hoverColor: "hover:border-green-400 hover:shadow-green-200/60", bgGrad: "from-green-50 to-emerald-50" },
    { key: "basketball", color: "orange", hoverColor: "hover:border-orange-400 hover:shadow-orange-200/60", bgGrad: "from-orange-50 to-amber-50" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-600 text-white font-black text-2xl shadow-lg mb-4">
            P
          </div>
          <h1 className="text-3xl font-black text-gray-900">PoliSport</h1>
          <p className="text-gray-500 mt-2 font-medium">Selectează sportul pe care dorești să îl administrezi</p>
        </div>

        {/* Sport Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sports.map(({ key, hoverColor, bgGrad }) => (
            <form key={key} action={async () => {
              "use server";
              await selectSportAction(key);
            }}>
              <button
                type="submit"
                className={`w-full bg-gradient-to-br ${bgGrad} border-2 border-gray-200 ${hoverColor} rounded-2xl p-8 flex flex-col items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-xl cursor-pointer group`}
              >
                <span className="text-6xl group-hover:scale-110 transition-transform duration-200">
                  {SPORT_ICONS[key]}
                </span>
                <span className="text-xl font-black text-gray-800">
                  {SPORT_LABELS[key]}
                </span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
