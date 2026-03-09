"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api";
import type { Brand } from "@/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { AccentButton } from "@/components/ui/AccentButton";
import { cn } from "@/lib/cn";
import { Plus, Pencil, Trash2, X, Check, Tags } from "lucide-react";

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

// ─── Add Brand Form ────────────────────────────────────────

function AddBrandForm({ onCreated }: { onCreated: (brand: Brand) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      const brand = await apiPost<Brand>("/api/v1/brands", { name: trimmed });
      onCreated(brand);
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Marka oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">
            Marka Adı
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yeni marka adı girin"
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
        <AccentButton type="submit" disabled={saving || !name.trim()}>
          <Plus size={16} />
          {saving ? "Ekleniyor..." : "Marka Ekle"}
        </AccentButton>
      </form>
      {error && (
        <p className="mt-2 text-xs text-danger">{error}</p>
      )}
    </GlassCard>
  );
}

// ─── Brand Row ─────────────────────────────────────────────

function BrandRow({
  brand,
  onUpdate,
  onDelete,
}: {
  brand: Brand;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-glass-border bg-glass-bg px-4 py-3 backdrop-blur-md transition-colors hover:border-border-bright">
      <Tags size={16} className="shrink-0 text-accent" />

      <div className="flex-1">
        {editing ? (
          <InlineInput
            value={brand.name}
            onSave={(val) => {
              if (val.trim()) onUpdate(brand.id, val.trim());
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            placeholder="Marka adı"
          />
        ) : (
          <span className="text-sm font-medium text-foreground">{brand.name}</span>
        )}
      </div>

      <span className="text-xs text-muted">
        {new Date(brand.created_at).toLocaleDateString("tr-TR")}
      </span>

      <button
        onClick={() => setEditing(true)}
        className="text-muted hover:text-accent"
        title="Düzenle"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() => onDelete(brand.id)}
        className="text-muted hover:text-danger"
        title="Sil"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<Brand[]>("/api/v1/brands");
        setBrands(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Markalar yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpdate(id: string, name: string) {
    try {
      const updated = await apiPatch<Brand>(`/api/v1/brands/${id}`, { name });
      setBrands((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Marka güncellenemedi");
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/v1/brands/${id}`);
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Marka silinemedi");
    }
  }

  if (loading) {
    return <p className="text-muted">Yükleniyor...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Marka Yönetimi</h1>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-xs underline">
            Kapat
          </button>
        </div>
      )}

      <AddBrandForm onCreated={(brand) => setBrands((prev) => [...prev, brand])} />

      {brands.length === 0 ? (
        <GlassCard className="text-center text-sm text-muted">
          Henüz marka eklenmemiş. Yukarıdaki form ile yeni marka oluşturabilirsiniz.
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-2">
          {brands.map((brand) => (
            <BrandRow
              key={brand.id}
              brand={brand}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
