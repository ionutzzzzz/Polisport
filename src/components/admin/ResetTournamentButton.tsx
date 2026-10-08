"use client";

import { useState, useTransition } from "react";
import { resetTournamentAction } from "@/lib/actions/tournamentActions";

export default function ResetTournamentButton() {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function handleReset() {
    startTransition(async () => {
      const res = await resetTournamentAction();
      if ("error" in res) {
        setResult(`❌ ${res.error}`);
      } else {
        setResult("✅ Turneul a fost resetat cu succes!");
      }
      setShowConfirm(false);
      setTimeout(() => setResult(null), 4000);
    });
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50"
      >
        🔄 Resetare Turneu
      </button>

      {result && (
        <div className={`mt-3 p-3 rounded-xl text-sm font-medium ${result.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {result}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Resetare Turneu</h3>
              <p className="text-gray-600 text-sm">
                Această acțiune va șterge <strong>toate meciurile</strong>, <strong>toate golurile</strong> și va reseta
                statisticile echipelor la zero. Echipele și jucătorii vor fi păstrați.
              </p>
              <p className="text-red-600 font-bold text-sm mt-3">
                Acțiunea este ireversibilă!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleReset}
                disabled={isPending}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "⏳ Se resetează..." : "🗑️ Confirmă Resetarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
