"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { BranchQrCode } from "@/components/ui/BranchQrCode";
import { apiGet, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Store } from "lucide-react";
import type { Branch } from "@/types/api";

interface UserProfile {
  email: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
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

        // Şube listesini API'den çek
        const branchData = await apiGet<Branch[]>("/api/v1/branches");
        setBranches(branchData);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError(err instanceof Error ? err.message : "Profil yüklenemedi");
        }
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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Panel</h1>

      <GlassCard>
        <p className="text-foreground">
          Hoş geldiniz, <strong className="text-accent">{profile?.email}</strong>
        </p>
        <p className="mt-1 text-sm text-muted">Rol: {profile?.role}</p>
      </GlassCard>

      {/* ── QR Kod Oluşturucu ── */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Şube QR Kodları
        </h2>

        {branches.length === 0 ? (
          <GlassCard className="text-center text-sm text-muted">
            Henüz şube tanımlanmamış. QR kod oluşturmak için önce bir şube ekleyin.
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Şube seçici */}
            <div className="flex flex-wrap gap-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => setSelectedBranch(branch)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                    selectedBranch?.id === branch.id
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border bg-surface text-muted hover:border-border-bright hover:text-foreground",
                  )}
                >
                  <Store size={14} />
                  {branch.name}
                </button>
              ))}
            </div>

            {/* Seçili şubenin QR kodu */}
            {selectedBranch && (
              <div className="flex justify-center">
                <BranchQrCode branch={selectedBranch} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
