"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api";
import type { Branch, MenuCategory, MenuItem, CategoryWithItems } from "@/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { AccentButton } from "@/components/ui/AccentButton";
import { cn } from "@/lib/cn";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Store,
} from "lucide-react";

// ─── Branch Selector ───────────────────────────────────────

function BranchSelector({
  branches,
  selectedId,
  onSelect,
}: {
  branches: Branch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (branches.length === 0) {
    return (
      <GlassCard className="text-center text-sm text-muted">
        Henüz şube tanımlanmamış.
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {branches.map((b) => (
        <button
          key={b.id}
          onClick={() => onSelect(b.id)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
            selectedId === b.id
              ? "border-accent bg-accent-muted text-accent"
              : "border-border bg-surface text-muted hover:border-border-bright hover:text-foreground",
          )}
        >
          <Store size={14} />
          {b.name}
        </button>
      ))}
    </div>
  );
}

// ─── Inline Edit Input ─────────────────────────────────────

function InlineInput({
  value,
  onSave,
  onCancel,
  placeholder,
  type = "text",
}: {
  value: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(draft);
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
      />
      <button onClick={() => onSave(draft)} className="text-success hover:brightness-125">
        <Check size={14} />
      </button>
      <button onClick={onCancel} className="text-muted hover:text-danger">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Category Card ─────────────────────────────────────────

function CategoryCard({
  category,
  index,
  onUpdate,
  onDelete,
  onItemUpdate,
  onItemDelete,
  onItemCreate,
}: {
  category: CategoryWithItems;
  index: number;
  onUpdate: (id: string, data: { name?: string; sort_order?: number }) => void;
  onDelete: (id: string) => void;
  onItemUpdate: (id: string, data: { name?: string; price?: number; description?: string | null }) => void;
  onItemDelete: (id: string) => void;
  onItemCreate: (categoryId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);

  return (
    <Draggable draggableId={category.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "rounded-xl border border-glass-border bg-glass-bg backdrop-blur-md transition-all",
            snapshot.isDragging && "border-accent shadow-[0_0_30px_rgba(212,168,67,0.2)]",
          )}
        >
          {/* Category Header */}
          <div className="flex items-center gap-2 px-4 py-3">
            <div {...provided.dragHandleProps} className="cursor-grab text-muted hover:text-foreground">
              <GripVertical size={16} />
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted hover:text-foreground"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            <div className="flex-1">
              {editingName ? (
                <InlineInput
                  value={category.name}
                  onSave={(val) => {
                    if (val.trim()) onUpdate(category.id, { name: val.trim() });
                    setEditingName(false);
                  }}
                  onCancel={() => setEditingName(false)}
                  placeholder="Kategori adı"
                />
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {category.name}
                </span>
              )}
            </div>

            <span className="text-xs text-muted">{category.items.length} ürün</span>

            <button
              onClick={() => setEditingName(true)}
              className="text-muted hover:text-accent"
              title="Düzenle"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(category.id)}
              className="text-muted hover:text-danger"
              title="Sil"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Items */}
          {expanded && (
            <div className="border-t border-border px-4 py-2">
              {category.items.length === 0 && (
                <p className="py-2 text-center text-xs text-muted">
                  Bu kategoride ürün yok.
                </p>
              )}
              {category.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onUpdate={onItemUpdate}
                  onDelete={onItemDelete}
                />
              ))}
              <button
                onClick={() => onItemCreate(category.id)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Plus size={12} />
                Ürün Ekle
              </button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ─── Item Row ──────────────────────────────────────────────

function ItemRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: MenuItem;
  onUpdate: (id: string, data: { name?: string; price?: number; description?: string | null }) => void;
  onDelete: (id: string) => void;
}) {
  const [editingField, setEditingField] = useState<"name" | "price" | null>(null);

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover">
      <div className="flex-1 min-w-0">
        {editingField === "name" ? (
          <InlineInput
            value={item.name}
            onSave={(val) => {
              if (val.trim()) onUpdate(item.id, { name: val.trim() });
              setEditingField(null);
            }}
            onCancel={() => setEditingField(null)}
            placeholder="Ürün adı"
          />
        ) : (
          <button
            onClick={() => setEditingField("name")}
            className="text-left text-sm text-foreground hover:text-accent"
          >
            {item.name}
          </button>
        )}
        {item.description && (
          <p className="truncate text-xs text-muted">{item.description}</p>
        )}
      </div>

      <div className="shrink-0">
        {editingField === "price" ? (
          <InlineInput
            value={String(item.price)}
            type="number"
            onSave={(val) => {
              const num = parseFloat(val);
              if (!isNaN(num) && num >= 0) onUpdate(item.id, { price: num });
              setEditingField(null);
            }}
            onCancel={() => setEditingField(null)}
            placeholder="Fiyat"
          />
        ) : (
          <button
            onClick={() => setEditingField("price")}
            className="text-sm font-medium text-accent hover:brightness-125"
          >
            ₺{Number(item.price).toFixed(2)}
          </button>
        )}
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="shrink-0 text-muted hover:text-danger"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Live Preview (Phone Frame) ────────────────────────────

function LivePreview({ categories }: { categories: CategoryWithItems[] }) {
  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Canlı Önizleme
      </p>
      {/* Phone Frame */}
      <div className="relative w-[300px] rounded-[2rem] border-2 border-border-bright bg-background p-2 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        {/* Notch */}
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-surface" />
        {/* Screen */}
        <div className="h-[520px] overflow-y-auto rounded-2xl bg-surface p-4">
          {activeCategories.length === 0 ? (
            <p className="mt-20 text-center text-sm text-muted">
              Menü boş — sol panelden kategori ve ürün ekleyin.
            </p>
          ) : (
            activeCategories.map((cat) => (
              <div key={cat.id} className="mb-5">
                <h3 className="mb-2 border-b border-border pb-1 text-sm font-bold text-accent">
                  {cat.name}
                </h3>
                {cat.items
                  .filter((i) => i.is_active)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between py-1.5"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-medium text-foreground">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="truncate text-[10px] text-muted">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-accent">
                        ₺{Number(item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function MenuManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load branches on mount ──
  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await apiGet<Branch[]>("/api/v1/branches");
        setBranches(data);
        if (data.length > 0) {
          setSelectedBranchId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Şubeler yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, []);

  // ── Load categories + items when branch changes ──
  const loadMenu = useCallback(async (branchId: string) => {
    try {
      const cats = await apiGet<MenuCategory[]>(
        `/api/v1/menus/categories/${branchId}`,
      );

      // Her kategori için ürünleri çek
      const catsWithItems: CategoryWithItems[] = await Promise.all(
        cats.map(async (cat) => {
          const items = await apiGet<MenuItem[]>(
            `/api/v1/menus/items/${cat.id}`,
          );
          return { ...cat, items };
        }),
      );

      // sort_order'a göre sırala
      catsWithItems.sort((a, b) => a.sort_order - b.sort_order);
      setCategories(catsWithItems);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Menü yüklenemedi");
      }
    }
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadMenu(selectedBranchId);
    }
  }, [selectedBranchId, loadMenu]);

  // ── Category CRUD ──

  async function handleCreateCategory() {
    if (!selectedBranchId) return;
    setSaving(true);
    try {
      const newCat = await apiPost<MenuCategory>("/api/v1/menus/categories", {
        branch_id: selectedBranchId,
        name: "Yeni Kategori",
        sort_order: categories.length,
      });
      setCategories((prev) => [...prev, { ...newCat, items: [] }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Kategori oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCategory(
    id: string,
    data: { name?: string; sort_order?: number },
  ) {
    setSaving(true);
    try {
      const updated = await apiPatch<MenuCategory>(
        `/api/v1/menus/categories/${id}`,
        data,
      );
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...updated, items: c.items } : c,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Kategori güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    setSaving(true);
    try {
      await apiDelete(`/api/v1/menus/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Kategori silinemedi");
    } finally {
      setSaving(false);
    }
  }

  // ── Item CRUD ──

  async function handleCreateItem(categoryId: string) {
    setSaving(true);
    try {
      const newItem = await apiPost<MenuItem>("/api/v1/menus/items", {
        category_id: categoryId,
        name: "Yeni Ürün",
        price: 0,
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, items: [...c.items, newItem] } : c,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Ürün oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateItem(
    id: string,
    data: { name?: string; price?: number; description?: string | null },
  ) {
    setSaving(true);
    try {
      const updated = await apiPatch<MenuItem>(
        `/api/v1/menus/items/${id}`,
        data,
      );
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          items: c.items.map((i) => (i.id === id ? updated : i)),
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Ürün güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(id: string) {
    setSaving(true);
    try {
      await apiDelete(`/api/v1/menus/items/${id}`);
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          items: c.items.filter((i) => i.id !== id),
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Ürün silinemedi");
    } finally {
      setSaving(false);
    }
  }

  // ── Drag & Drop ──

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const srcIdx = result.source.index;
    const dstIdx = result.destination.index;
    if (srcIdx === dstIdx) return;

    // Optimistic UI update
    const reordered = Array.from(categories);
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(dstIdx, 0, moved);

    // Yeni sort_order değerlerini ata
    const updated = reordered.map((cat, idx) => ({
      ...cat,
      sort_order: idx,
    }));
    setCategories(updated);

    // Backend'e gönder
    try {
      await Promise.all(
        updated
          .filter((cat, idx) => {
            const original = categories.find((c) => c.id === cat.id);
            return original && original.sort_order !== idx;
          })
          .map((cat) =>
            apiPatch(`/api/v1/menus/categories/${cat.id}`, {
              sort_order: cat.sort_order,
            }),
          ),
      );
    } catch (err) {
      // Rollback on failure
      setError("Sıralama kaydedilemedi");
      if (selectedBranchId) loadMenu(selectedBranchId);
    }
  }

  // ── Render ──

  if (loading) {
    return <p className="text-muted">Yükleniyor...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Menü Yönetimi</h1>
        {saving && (
          <span className="text-xs text-muted animate-pulse">Kaydediliyor...</span>
        )}
      </div>

      {/* Branch Selector */}
      <BranchSelector
        branches={branches}
        selectedId={selectedBranchId}
        onSelect={setSelectedBranchId}
      />

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-xs underline"
          >
            Kapat
          </button>
        </div>
      )}

      {selectedBranchId && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
          {/* ── Left: Management Panel (60%) ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Kategoriler
              </h2>
              <AccentButton onClick={handleCreateCategory} disabled={saving}>
                <Plus size={16} />
                Kategori Ekle
              </AccentButton>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-col gap-3"
                  >
                    {categories.length === 0 && (
                      <GlassCard className="text-center text-sm text-muted">
                        Bu şubede henüz kategori yok. &quot;Kategori Ekle&quot;
                        ile başlayın.
                      </GlassCard>
                    )}
                    {categories.map((cat, idx) => (
                      <CategoryCard
                        key={cat.id}
                        category={cat}
                        index={idx}
                        onUpdate={handleUpdateCategory}
                        onDelete={handleDeleteCategory}
                        onItemUpdate={handleUpdateItem}
                        onItemDelete={handleDeleteItem}
                        onItemCreate={handleCreateItem}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* ── Right: Live Preview (40%) ── */}
          <div className="sticky top-6 self-start">
            <LivePreview categories={categories} />
          </div>
        </div>
      )}
    </div>
  );
}
