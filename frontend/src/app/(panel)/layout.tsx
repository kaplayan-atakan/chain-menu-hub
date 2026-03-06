"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard,
  UtensilsCrossed,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/dashboard/menus", label: "Menü Yönetimi", icon: UtensilsCrossed },
];

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthenticated(true);
      setChecking(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">Oturum kontrol ediliyor...</p>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <aside className="flex w-60 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <span className="text-lg font-bold text-accent">CMH</span>
          <span className="text-sm font-medium text-foreground">
            Chain Menu Hub
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <a
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent-muted text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <Icon size={18} />
                {label}
              </a>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-danger"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
