"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";

interface UserProfile {
  email: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        setProfile({
          email: session.user.email ?? "",
          role: session.user.user_metadata?.role ?? "unknown",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Profil yüklenemedi");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  if (loading) {
    return <p className="text-muted">Yükleniyor...</p>;
  }

  if (error) {
    return <p className="text-danger">{error}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Panel</h1>
      <GlassCard>
        <p className="text-foreground">
          Hoş geldiniz, <strong className="text-accent">{profile?.email}</strong>
        </p>
        <p className="mt-1 text-sm text-muted">Rol: {profile?.role}</p>
      </GlassCard>
    </div>
  );
}
