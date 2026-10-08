"use client";

import { useState, useTransition } from "react";
import { drawGroupsAction, drawMatchesAction } from "@/lib/actions/draw";

interface Team {
  id: string;
  name: string;
  group_name: string | null;
}

interface DrawManagerProps {
  teams: Team[];
  hasGroups: boolean;
  hasMatches: boolean;
  canDrawGroups: boolean;
  sport: "football" | "basketball";
}

export default function DrawManager({ teams, hasGroups, hasMatches, canDrawGroups, sport }: DrawManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDrawGroups() {
    if (!confirm("Ești sigur? Aceasta va re-amesteca toate echipele în grupe noi.")) return;
    
    setError(null);
    startTransition(async () => {
      const res = await drawGroupsAction();
      if ("error" in res) setError(res.error);
    });
  }

  function handleDrawMatches() {
    if (!confirm("Generezi meciurile? Meciurile vechi din faza grupelor vor fi șterse.")) return;

    setError(null);
    startTransition(async () => {
      const res = await drawMatchesAction();
      if ("error" in res) setError(res.error);
    });
  }

  // Grupare echipe pentru afișare
  const grouped: Record<string, Team[]> = { A: [], B: [], C: [], D: [] };
  teams.forEach(t => {
    if (t.group_name && grouped[t.group_name]) {
      grouped[t.group_name].push(t);
    }
  });

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Control Panel */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">1. Grupe</h3>
            <p className="text-sm text-gray-500 mb-6">
              Împarte automat cele {teams.length} echipe în 4 grupe (A, B, C, D) a câte {Math.floor(teams.length / 4)} echipe.
            </p>
          </div>
          <button
            onClick={handleDrawGroups}
            disabled={isPending || !canDrawGroups}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {isPending ? "Se procesează..." : (hasGroups ? "🔄 Reface Grupele" : "🎲 Tragere la Sorți Grupe")}
          </button>
        </div>

        <div className={`p-6 bg-white rounded-2xl border ${hasGroups ? 'border-blue-100' : 'border-gray-100'} shadow-sm flex flex-col justify-between transition-all`}>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">2. Meciuri</h3>
            <p className="text-sm text-gray-500 mb-6">
              {sport === "basketball"
                ? "Generează programul. Fiecare echipă va juca meciuri 'fiecare cu fiecare' în propria grupă (câte 3 meciuri)."
                : "Generează programul. Fiecare echipă va juca exact 4 meciuri cu adversari din propria grupă."}
            </p>
          </div>
          <button
            onClick={handleDrawMatches}
            disabled={isPending || !hasGroups}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {isPending ? "Se procesează..." : (hasMatches ? "🔄 Regenerează Meciurile" : sport === "basketball" ? "🏀 Generează Meciuri" : "⚽ Generează Meciuri")}
          </button>
        </div>
      </div>

      {/* Vizualizare Grupe */}
      {hasGroups && (
        <div>
          <h2 className="text-xl font-black text-gray-900 mb-4">Grupele Turneului</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {["A", "B", "C", "D"].map(group => (
              <div key={group} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-br from-green-700 to-green-900 px-4 py-3">
                  <h3 className="font-black text-white text-lg">Grupa {group}</h3>
                  <p className="text-green-200 text-xs">{grouped[group].length} echipe</p>
                </div>
                <ul className="divide-y divide-gray-50">
                  {grouped[group].map((t, idx) => (
                    <li key={t.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                      <span className="w-6 h-6 rounded-md bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-gray-800 text-sm truncate">{t.name}</span>
                    </li>
                  ))}
                  {grouped[group].length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-gray-400">Nicio echipă.</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
