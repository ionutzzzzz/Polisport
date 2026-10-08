"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import CopyPublicLinkButton from "./CopyPublicLinkButton";
import type { SportType } from "@/lib/sport";

const SPORT_LABELS: Record<SportType, string> = {
  football: "Fotbal",
  basketball: "Baschet",
};

const SPORT_ICONS: Record<SportType, string> = {
  football: "⚽",
  basketball: "🏀",
};

const navItems = [
  { href: "/admin",                   label: "Dashboard",        icon: "📊" },
  { href: "/admin/echipe",            label: "Echipe & Jucători",icon: "🛡️" },
  { href: "/admin/tragere-la-sorti",  label: "Tragere la Sorți", icon: "🎲" },
  { href: "/admin/clasament",         label: "Clasament",        icon: "🏆" },
  { href: "/admin/meciuri",           label: "Programare",       icon: "📅" },
  { href: "/admin/program",           label: "Program & Scorul", icon: "⚽" },
  { href: "/admin/faze-eliminatorii", label: "Faze Eliminatorii",icon: "🔥" },
];

export default function AdminSidebar({ sport }: { sport: SportType }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    });
  }

  return (
    <aside className="flex flex-col w-64 bg-green-900 min-h-screen text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-green-700/60">
        <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center font-black text-white text-lg shadow">
          P
        </div>
        <div>
          <div className="font-black text-white text-base leading-none">PoliSport</div>
          <div className="text-green-400 text-xs font-medium mt-0.5">Admin Panel</div>
        </div>
      </div>

      {/* Sport Indicator */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center justify-between bg-green-800/50 rounded-xl px-3 py-2.5 border border-green-700/40">
          <div className="flex items-center gap-2">
            <span className="text-lg">{SPORT_ICONS[sport]}</span>
            <span className="text-sm font-bold text-white">{SPORT_LABELS[sport]}</span>
          </div>
          <Link
            href="/select-sport"
            className="text-xs text-green-400 hover:text-white font-semibold transition-colors"
          >
            Schimbă
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3 space-y-1">
        <div className="px-3 pt-1 pb-2">
          <span className="text-green-500 text-xs font-bold uppercase tracking-widest">Management</span>
        </div>
        {navItems.map(({ href, label, icon }) => {
          const isActive = href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                ${isActive
                  ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                  : "text-green-300 hover:bg-green-800/60 hover:text-white"
                }
              `}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-300" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-green-700/60 space-y-3">
        <CopyPublicLinkButton sport={sport} />
        
        {/* Buton Deconectare vizibil */}
        <button
          id="admin-signout-btn"
          onClick={handleSignOut}
          disabled={pending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600/20 border border-red-500/40 hover:bg-red-600 hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>🚪</span>
          {pending ? "Se deconectează..." : "Deconectare"}
        </button>
      </div>
    </aside>
  );
}
