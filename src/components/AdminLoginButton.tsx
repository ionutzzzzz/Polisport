"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Buton Admin Login care:
 * 1. Șterge ORICE sesiune existentă din browser (localStorage + cookies)
 * 2. Navighează la pagina de login pentru credențiale proaspete
 */
export default function AdminLoginButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      // Curăță sesiunea din browser (localStorage Supabase + cookies)
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    });
  }

  return (
    <button
      id="admin-login-btn"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-semibold rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
    >
      {isPending ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Se pregătește...
        </>
      ) : (
        <>🔐 Admin Login</>
      )}
    </button>
  );
}
