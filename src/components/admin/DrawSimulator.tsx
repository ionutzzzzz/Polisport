"use client";

import { useState, useTransition } from "react";
import { generateGroupDraw, validateDraw, type DrawTeam, type DrawRound, type DrawPair } from "@/lib/draw-algorithm";
import { saveGeneratedMatches } from "@/lib/actions/matches";

interface DrawSimulatorProps {
  teams: DrawTeam[];
  hasExistingMatches: boolean;
}

export default function DrawSimulator({ teams, hasExistingMatches }: DrawSimulatorProps) {
  const [rounds, setRounds] = useState<DrawRound[]>([]);
  const [flatPairs, setFlatPairs] = useState<DrawPair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    setSuccess(null);
    
    try {
      const generatedRounds = generateGroupDraw(teams);
      const validationErrors = validateDraw(generatedRounds, teams);
      
      if (validationErrors.length > 0) {
        setError(`Erori de validare: ${validationErrors.join(", ")}`);
        return;
      }
      
      setRounds(generatedRounds);
      const pairs = generatedRounds.flatMap(r => r.pairs);
      setFlatPairs(pairs);
    } catch (err: any) {
      setError(err.message || "A apărut o eroare la generare.");
    }
  }

  function handleSave() {
    if (flatPairs.length === 0) return;
    
    startTransition(async () => {
      setError(null);
      const result = await saveGeneratedMatches(flatPairs);
      
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess("Meciurile au fost salvate cu succes!");
      }
    });
  }

  if (hasExistingMatches && !success) {
    return (
      <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center text-3xl mb-4">
          ✅
        </div>
        <h2 className="text-xl font-bold text-green-900 mb-2">Meciurile au fost deja generate</h2>
        <p className="text-green-600">
          Programul grupei a fost stabilit și meciurile sunt deja salvate în baza de date. 
          Le poți gestiona din pagina de Meciuri.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Simulator Tragere la Sorți</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Echipe disponibile: <strong>{teams.length}</strong>. 
            Fiecare echipă va primi exact 4 meciuri.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleGenerate}
            disabled={isPending || success !== null}
            className="px-6 py-3 bg-white border-2 border-green-600 text-green-700 font-bold rounded-xl hover:bg-green-50 transition-all active:scale-95 disabled:opacity-50"
          >
            🎲 Generează Preview
          </button>
          
          <button
            onClick={handleSave}
            disabled={flatPairs.length === 0 || isPending || success !== null}
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {isPending ? "Se salvează..." : "💾 Salvează Meciurile"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 font-bold text-center text-lg shadow-sm">
          🎉 {success}
        </div>
      )}

      {rounds.length > 0 && !success && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeInUp_300ms_ease]">
          {rounds.map((round) => (
            <div key={round.round} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-green-700 to-green-800 px-6 py-3">
                <h3 className="font-bold text-white">Runda {round.round}</h3>
              </div>
              <ul className="divide-y divide-gray-50">
                {round.pairs.map((pair, idx) => (
                  <li key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 flex items-center justify-end gap-3 text-right">
                      <span className="font-semibold text-gray-800">{pair.home.name}</span>
                      <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                        {pair.home.name.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="px-4 py-1 mx-3 rounded-full bg-gray-100 text-gray-500 font-black text-xs shrink-0">
                      VS
                    </div>
                    
                    <div className="flex-1 flex items-center justify-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                        {pair.away.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800">{pair.away.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
