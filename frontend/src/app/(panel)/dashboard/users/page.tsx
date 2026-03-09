"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { Branch, User } from "@/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { AccentButton } from "@/components/ui/AccentButton";
import { cn } from "@/lib/cn";
import { Plus, Users, Building2, ShieldCheck, Mail } from "lucide-react";

// ─── Multi-Select Branches ─────────────────────────────────

function BranchMultiSelect({
  branches,
  selected,
  onChange,
}: {
  branches: Branch[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">
        Şube Yetkileri (çoklu seçim)
      </label>
      {branches.length === 0 ? (
        <p className="text-xs text-muted">Aktif şube bulunamadı.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <button
              type="button"
              key={b.id}
              onClick={() => toggle(b.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all",
                selected.includes(b.id)
                  ? "border-accent bg-accent-muted text-accent"
                  : "border-border bg-surface text-muted hover:border-border-bright hover:text-foreground",
              )}
            >
              <Building2 size={12} />
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add User Form ─────────────────────────────────────────

function AddUserForm({
  branches,
  onCreated,
}: {
  branches: Branch[];
  onCreated: (user: User) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    setSaving(true);
    setError(null);
    try {
      const user = await apiPost<User>("/api/v1/users", {
        email: trimmedEmail,
        password,
        role: "branch_official",
        branch_ids: selectedBranches,
      });
      onCreated(user);
      setEmail("");
      setPassword("");
      setSelectedBranches([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Kullanıcı oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard>
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Yeni Şube Yetkilisi Ekle
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kullanici@sirket.com"
              required
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Güçlü bir şifre belirleyin"
              required
              minLength={6}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        </div>

        <BranchMultiSelect
          branches={branches}
          selected={selectedBranches}
          onChange={setSelectedBranches}
        />

        <div className="flex justify-end">
          <AccentButton type="submit" disabled={saving || !email.trim() || !password}>
            <Plus size={16} />
            {saving ? "Oluşturuluyor..." : "Yetkili Ekle"}
          </AccentButton>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </form>
    </GlassCard>
  );
}

// ─── User Row ──────────────────────────────────────────────

function UserRow({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-glass-border bg-glass-bg px-4 py-3 backdrop-blur-md transition-colors hover:border-border-bright">
      <Users size={16} className="shrink-0 text-accent" />

      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Mail size={13} className="text-muted" />
          <span className="text-sm font-medium text-foreground">{user.email}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
              user.role === "admin"
                ? "bg-accent-muted text-accent"
                : "bg-surface text-muted",
            )}
          >
            <ShieldCheck size={11} />
            {user.role === "admin" ? "Admin" : "Şube Yetkilisi"}
          </span>

          {user.branches.map((ab) => (
            <span
              key={ab.branch_id}
              className="flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-xs text-muted"
            >
              <Building2 size={10} />
              {ab.branch_name}
            </span>
          ))}
        </div>
      </div>

      <span className="text-xs text-muted">
        {new Date(user.created_at).toLocaleDateString("tr-TR")}
      </span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [usersData, branchesData] = await Promise.all([
          apiGet<User[]>("/api/v1/users"),
          apiGet<Branch[]>("/api/v1/branches"),
        ]);
        setUsers(usersData);
        setBranches(branchesData.filter((b) => b.is_active));
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Veriler yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-muted">Yükleniyor...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Kullanıcı Yetkileri</h1>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-xs underline">
            Kapat
          </button>
        </div>
      )}

      <AddUserForm
        branches={branches}
        onCreated={(user) => setUsers((prev) => [...prev, user])}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Mevcut Kullanıcılar
        </h2>

        {users.length === 0 ? (
          <GlassCard className="text-center text-sm text-muted">
            Sistemde henüz kullanıcı bulunmuyor.
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
