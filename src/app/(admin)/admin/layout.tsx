import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { SportType } from "@/lib/sport";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    redirect("/auth/login");
  }

  // Check sport cookie
  const cookieStore = await cookies();
  const sportCookie = cookieStore.get("polisport_sport_type")?.value;
  if (!sportCookie) {
    redirect("/select-sport");
  }
  const sport = (sportCookie === "basketball" ? "basketball" : "football") as SportType;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex">
        <AdminSidebar sport={sport} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-green-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center font-black text-sm">P</div>
            <span className="font-bold text-sm">PoliSport Admin</span>
          </div>
          <span className="text-green-400 text-xs">{user.email}</span>
        </div>

        {/* Admin content area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
