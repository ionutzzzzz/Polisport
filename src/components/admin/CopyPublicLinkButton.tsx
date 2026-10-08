"use client";

import { useState, useTransition } from "react";
import { revalidatePublicAction } from "@/lib/actions/publicActions";
import type { SportType } from "@/lib/sport";

export default function CopyPublicLinkButton({ sport }: { sport: SportType }) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopy = () => {
    startTransition(async () => {
      await revalidatePublicAction();
      
      const url = `${window.location.origin}/public?sport=${sport}`;
      await navigator.clipboard.writeText(url);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      disabled={isPending}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
        copied 
          ? "bg-green-100 text-green-700 border border-green-200" 
          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20"
      }`}
    >
      {copied ? "✅ Link Copiat!" : isPending ? "⏳ Se actualizează..." : "🔗 Copiază Link Public"}
    </button>
  );
}
