"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api";
import type { Brand, Branch } from "@/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { AccentButton } from "@/components/ui/AccentButton";
import { cn } from "@/lib/cn";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building2,
  MapPin,
  Power,
} from "lucide-react";

// ─── Inline Edit ───────────────────────────────────────────

function InlineInput({
  value,
  onSave,
  onCancel,
  placeholder,
}: {
  value: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(draft);
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
      />
      <button onClick={() => onSave(draft)} className="text-success hover:brightness-125">
        <Check size={16} />
      </button>
      <button onClick={onCancel} className="text-muted hover:text-danger">
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Add Branch Form ───────────────────────────────────────

function AddBranchForm({
  brands,
  onCreated,
}: {
  brands: Brand[];
  onCreated: (branch: Branch) => void;
}) {
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [locationInfo, setLocationInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !brandId) return;

    setSaving(true);
    setError(null);
    try {
      const branch = await apiPost<Branch>("/api/v1/branches", {
        name: trimmedName,
        brand_id: brandId,
        location_info: locationInfo.trim() || null,
      });
      onCreated(branch);
      setName("");
      setLocationInfo("");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Şube oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Marka</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              required
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            >
              <option value="">Marka seçin</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Şube Adı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Şube adı"
              required
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Konum Bilgisi
            </label>
            <input
              type="text"
              value={locationInfo}
              onChange={(e) => setLocationInfo(e.target.value)}
              placeholder="Opsiyonel — adres, bölge vb."
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <AccentButton type="submit" disabled={saving || !name.trim() || !brandId}>
            <Plus size={16} />
            {saving ? "Ekleniyor..." : "Şube Ekle"}
          </AccentButton>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </form>
    </GlassCard>
  );
}

// ─── Branch Row ────────────────────────────────────────────

function BranchRow({
  branch,
  brandName,
  onUpdate,
  onDelete,
  onToggleActive,
}: {
  branch: Branch;
  brandName: string;
  onUpdate: (id: string, data: { name?: string; location_info?: string | null }) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}) {
  const [editingField, setEditingField] = useState<"name" | "location" | null>(null);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-glass-border bg-glass-bg px-4 py-3 backdrop-blur-md transition-colors hover:border-border-bright",
        !branch.is_active && "opacity-50",
      )}
    >
      <Building2 size={16} className="shrink-0 text-accent" />

      <div className="flex flex-1 flex-col gap-0.5">
        {editingField === "name" ? (
          <InlineInput
            value={branch.name}
            onSave={(val) => {
              if (val.trim()) onUpdate(branch.id, { name: val.trim() });
              setEditingField(null);
            }}
            onCancel={() => setEditingField(null)}
            placeholder="Şube adı"
          />
        ) : (
          <span className="text-sm font-medium text-foreground">{branch.name}</span>
        )}

        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded bg-accent-muted px-1.5 py-0.5 text-accent">
            {brandName}
          </span>
          {editingField === "location" ? (
            <InlineInput
              value={branch.location_info ?? ""}
              onSave={(val) => {
                onUpdate(branch.id, { location_info: val.trim() || null });
                setEditingField(null);
              }}
              onCancel={() => setEditingField(null)}
              placeholder="Konum bilgisi"
            />
          ) : (
            branch.location_info && (
              <button
                onClick={() => setEditingField("location")}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <MapPin size={11} />
                {branch.location_info}
              </button>
            )
          )}
        </div>
      </div>

      <button
        onClick={() => onToggleActive(branch.id, !branch.is_active)}
        className={cn(
          "text-xs font-medium",
          branch.is_active ? "text-success" : "text-danger",
        )}
        title={branch.is_active ? "Pasif yap" : "Aktif yap"}
      >
        <Power size={14} />
      </button>

      <button
        onClick={() => setEditingField("name")}
        className="text-muted hover:text-accent"
        title="Düzenle"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() => onDelete(branch.id)}
        className="text-muted hover:text-danger"
        title="Sil"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function BranchesPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterBrandId, setFilterBrandId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [brandsData, branchesData] = await Promise.all([
          apiGet<Brand[]>("/api/v1/brands"),
          apiGet<Branch[]>("/api/v1/branches"),
        ]);
        setBrands(brandsData);
        setBranches(branchesData);
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Veriler yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const brandNameMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const filteredBranches = filterBrandId
    ? branches.filter((b) => b.brand_id === filterBrandId)
    : branches;

  async function handleUpdate(
    id: string,
    data: { name?: string; location_info?: string | null },
  ) {
    try {
      const updated = await apiPatch<Branch>(`/api/v1/branches/${id}`, data);
      setBranches((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Şube güncellenemedi");
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const updated = await apiPatch<Branch>(`/api/v1/branches/${id}`, {
        is_active: isActive,
      });
      setBranches((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Durum güncellenemedi");
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/v1/branches/${id}`);
      setBranches((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Şube silinemedi");
    }
  }

  if (loading) {
    return <p className="text-muted">Yükleniyor...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Şube Yönetimi</h1>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-xs underline">
            Kapat
          </button>
        </div>
      )}

      <AddBranchForm
        brands={brands}
        onCreated={(branch) => setBranches((prev) => [...prev, branch])}
      />

      {/* Marka Filtresi */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Filtrele:</span>
        <button
          onClick={() => setFilterBrandId("")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs transition-all",
            !filterBrandId
              ? "border-accent bg-accent-muted text-accent"
              : "border-border bg-surface text-muted hover:border-border-bright hover:text-foreground",
          )}
        >
          Tümü
        </button>
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => setFilterBrandId(b.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition-all",
              filterBrandId === b.id
                ? "border-accent bg-accent-muted text-accent"
                : "border-border bg-surface text-muted hover:border-border-bright hover:text-foreground",
            )}
          >
            {b.name}
          </button>
        ))}
      </div>

      {filteredBranches.length === 0 ? (
        <GlassCard className="text-center text-sm text-muted">
          {filterBrandId
            ? "Bu markaya ait şube bulunmuyor."
            : "Henüz şube eklenmemiş. Yukarıdaki form ile yeni şube oluşturabilirsiniz."}
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredBranches.map((branch) => (
            <BranchRow
              key={branch.id}
              branch={branch}
              brandName={brandNameMap[branch.brand_id] ?? "—"}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
