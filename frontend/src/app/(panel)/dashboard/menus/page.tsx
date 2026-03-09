"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api";
import type {
  Brand,
  Branch,
  MenuCategory,
  MenuItem,
  CategoryWithItems,
  BranchItemOverride,
  User,
} from "@/types/api";
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
  Tags,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────

/** Merged item for override view — master item + override state */
interface OverrideItem extends MenuItem {
  override_id: string | null;
  custom_price: number | null;
  is_hidden: boolean;
}

interface CategoryWithOverrideItems {
  id: string;
  name: string;
  sort_order: number;
  items: OverrideItem[];
}

// ─── Brand Selector ────────────────────────────────────────

function BrandSelector({
  brands,
  selectedId,
  onSelect,
}: {
  brands: Brand[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (brands.length === 0) {
    return (
      <GlassCard className="text-center text-sm text-muted">
        Henüz marka tanımlanmamış.
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {brands.map((b) => (
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
          <Tags size={14} />
          {b.name}
        </button>
      ))}
    </div>
  );
}

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
        Atanmış şubeniz yok.
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

// ─── Category Card (Admin: Master Menu CRUD) ───────────────

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

// ─── Item Row (Admin: Master menu editing) ─────────────────

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
    <div className="ml-4 flex items-center gap-3 rounded-lg border-l-4 border-accent/20 px-3 py-1.5 transition-colors hover:bg-surface-hover">
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

// ─── Override Category Card (Branch Official) ──────────────

function OverrideCategoryCard({
  category,
  onToggleHidden,
  onSetCustomPrice,
  onClearOverride,
}: {
  category: CategoryWithOverrideItems;
  onToggleHidden: (item: OverrideItem) => void;
  onSetCustomPrice: (item: OverrideItem, price: number | null) => void;
  onClearOverride: (item: OverrideItem) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const visibleCount = category.items.filter((i) => !i.is_hidden).length;

  return (
    <div className="rounded-xl border border-glass-border bg-glass-bg backdrop-blur-md">
      {/* Category Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted hover:text-foreground"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <span className="flex-1 text-sm font-semibold text-foreground">
          {category.name}
        </span>

        <span className="text-xs text-muted">
          {visibleCount}/{category.items.length} görünür
        </span>
      </div>

      {/* Override Items */}
      {expanded && (
        <div className="border-t border-border px-4 py-2 space-y-1">
          {category.items.map((item) => (
            <OverrideItemRow
              key={item.id}
              item={item}
              onToggleHidden={onToggleHidden}
              onSetCustomPrice={onSetCustomPrice}
              onClearOverride={onClearOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Override Item Row ─────────────────────────────────────

function OverrideItemRow({
  item,
  onToggleHidden,
  onSetCustomPrice,
  onClearOverride,
}: {
  item: OverrideItem;
  onToggleHidden: (item: OverrideItem) => void;
  onSetCustomPrice: (item: OverrideItem, price: number | null) => void;
  onClearOverride: (item: OverrideItem) => void;
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const hasOverride = item.override_id !== null;
  const displayPrice = item.custom_price ?? item.price;

  return (
    <div
      className={cn(
        "ml-4 flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 transition-colors",
        item.is_hidden
          ? "border-danger/40 bg-danger/5 opacity-60"
          : hasOverride
            ? "border-accent/60 bg-accent/5"
            : "border-border/40 hover:bg-surface-hover",
      )}
    >
      {/* Visibility toggle */}
      <button
        onClick={() => onToggleHidden(item)}
        className={cn(
          "shrink-0",
          item.is_hidden ? "text-danger" : "text-success",
        )}
        title={item.is_hidden ? "Göster" : "Gizle"}
      >
        {item.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>

      {/* Item name */}
      <div className="flex-1 min-w-0">
        <span className={cn("text-sm", item.is_hidden ? "line-through text-muted" : "text-foreground")}>
          {item.name}
        </span>
        {item.description && (
          <p className="truncate text-xs text-muted">{item.description}</p>
        )}
      </div>

      {/* Master price (if override exists, show it dimmed) */}
      {item.custom_price !== null && (
        <span className="text-xs text-muted line-through">
          ₺{Number(item.price).toFixed(2)}
        </span>
      )}

      {/* Effective price (editable) */}
      <div className="shrink-0">
        {editingPrice ? (
          <InlineInput
            value={String(displayPrice)}
            type="number"
            onSave={(val) => {
              const num = parseFloat(val);
              if (!isNaN(num) && num >= 0) {
                onSetCustomPrice(item, num === item.price ? null : num);
              }
              setEditingPrice(false);
            }}
            onCancel={() => setEditingPrice(false)}
            placeholder="Fiyat"
          />
        ) : (
          <button
            onClick={() => setEditingPrice(true)}
            className={cn(
              "text-sm font-medium hover:brightness-125",
              item.custom_price !== null ? "text-accent" : "text-foreground",
            )}
          >
            ₺{Number(displayPrice).toFixed(2)}
          </button>
        )}
      </div>

      {/* Clear override button */}
      {hasOverride && (
        <button
          onClick={() => onClearOverride(item)}
          className="shrink-0 text-xs text-muted hover:text-danger"
          title="Override&apos;ı kaldır"
        >
          <X size={13} />
        </button>
      )}
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
      <div className="relative w-[300px] rounded-[2rem] border-2 border-border-bright bg-background p-2 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-surface" />
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

/** Preview for override view — shows merged result */
function OverridePreview({ categories }: { categories: CategoryWithOverrideItems[] }) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Şube Önizleme
      </p>
      <div className="relative w-[300px] rounded-[2rem] border-2 border-border-bright bg-background p-2 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-surface" />
        <div className="h-[520px] overflow-y-auto rounded-2xl bg-surface p-4">
          {categories.length === 0 ? (
            <p className="mt-20 text-center text-sm text-muted">
              Menü boş.
            </p>
          ) : (
            categories.map((cat) => {
              const visibleItems = cat.items.filter((i) => !i.is_hidden);
              if (visibleItems.length === 0) return null;
              return (
                <div key={cat.id} className="mb-5">
                  <h3 className="mb-2 border-b border-border pb-1 text-sm font-bold text-accent">
                    {cat.name}
                  </h3>
                  {visibleItems.map((item) => (
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
                        ₺{Number(item.custom_price ?? item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function MenuManagementPage() {
  const [userRole, setUserRole] = useState<"admin" | "branch_official" | null>(null);
  const [userBranchIds, setUserBranchIds] = useState<string[]>([]);

  // Admin state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);

  // Branch official state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [overrideCategories, setOverrideCategories] = useState<CategoryWithOverrideItems[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load user profile on mount ──
  useEffect(() => {
    async function init() {
      try {
        const me = await apiGet<User>("/api/v1/users/me");
        setUserRole(me.role);

        if (me.role === "admin") {
          const brandData = await apiGet<Brand[]>("/api/v1/brands");
          setBrands(brandData);
          if (brandData.length > 0) setSelectedBrandId(brandData[0].id);
        } else {
          // Branch official — load their assigned branches
          const branchIds = me.branches.map((b) => b.branch_id);
          setUserBranchIds(branchIds);
          const allBranches = await apiGet<Branch[]>("/api/v1/branches");
          const myBranches = allBranches.filter((b) => branchIds.includes(b.id));
          setBranches(myBranches);
          if (myBranches.length > 0) setSelectedBranchId(myBranches[0].id);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Kullanıcı bilgileri yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ── Admin: Load master menu when brand changes ──
  const loadMasterMenu = useCallback(async (brandId: string) => {
    try {
      const cats = await apiGet<MenuCategory[]>(`/api/v1/menus/categories/${brandId}`);
      const catsWithItems: CategoryWithItems[] = await Promise.all(
        cats.map(async (cat) => {
          const items = await apiGet<MenuItem[]>(`/api/v1/menus/items/${cat.id}`);
          return { ...cat, items };
        }),
      );
      catsWithItems.sort((a, b) => a.sort_order - b.sort_order);
      setCategories(catsWithItems);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Menü yüklenemedi");
    }
  }, []);

  useEffect(() => {
    if (userRole === "admin" && selectedBrandId) {
      loadMasterMenu(selectedBrandId);
    }
  }, [userRole, selectedBrandId, loadMasterMenu]);

  // ── Branch official: Load master menu + overrides when branch changes ──
  const loadOverrideMenu = useCallback(async (branchId: string) => {
    try {
      // Find the branch to get brand_id
      const branch = branches.find((b) => b.id === branchId);
      if (!branch) return;

      // Fetch master menu for this brand
      const cats = await apiGet<MenuCategory[]>(`/api/v1/menus/categories/${branch.brand_id}`);
      const masterItems = await Promise.all(
        cats.map(async (cat) => {
          const items = await apiGet<MenuItem[]>(`/api/v1/menus/items/${cat.id}`);
          return { catId: cat.id, catName: cat.name, sortOrder: cat.sort_order, items };
        }),
      );

      // Fetch overrides for this branch
      const overrides = await apiGet<BranchItemOverride[]>(`/api/v1/menus/overrides/${branchId}`);
      const overrideMap = new Map(overrides.map((o) => [o.menu_item_id, o]));

      // Merge
      const merged: CategoryWithOverrideItems[] = masterItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((cat) => ({
          id: cat.catId,
          name: cat.catName,
          sort_order: cat.sortOrder,
          items: cat.items.map((item) => {
            const ov = overrideMap.get(item.id);
            return {
              ...item,
              override_id: ov?.id ?? null,
              custom_price: ov?.custom_price ?? null,
              is_hidden: ov?.is_hidden ?? false,
            };
          }),
        }));

      setOverrideCategories(merged);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Menü yüklenemedi");
    }
  }, [branches]);

  useEffect(() => {
    if (userRole === "branch_official" && selectedBranchId) {
      loadOverrideMenu(selectedBranchId);
    }
  }, [userRole, selectedBranchId, loadOverrideMenu]);

  // ── Admin: Category CRUD ──

  async function handleCreateCategory() {
    if (!selectedBrandId) return;
    setSaving(true);
    try {
      const newCat = await apiPost<MenuCategory>("/api/v1/menus/categories", {
        brand_id: selectedBrandId,
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

  // ── Admin: Item CRUD ──

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

  // ── Admin: Drag & Drop ──

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const srcIdx = result.source.index;
    const dstIdx = result.destination.index;
    if (srcIdx === dstIdx) return;

    const reordered = Array.from(categories);
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(dstIdx, 0, moved);

    const updated = reordered.map((cat, idx) => ({
      ...cat,
      sort_order: idx,
    }));
    setCategories(updated);

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
    } catch {
      setError("Sıralama kaydedilemedi");
      if (selectedBrandId) loadMasterMenu(selectedBrandId);
    }
  }

  // ── Branch official: Override handlers ──

  async function handleToggleHidden(item: OverrideItem) {
    if (!selectedBranchId) return;
    setSaving(true);
    try {
      await apiPost<BranchItemOverride>("/api/v1/menus/overrides", {
        branch_id: selectedBranchId,
        menu_item_id: item.id,
        custom_price: item.custom_price,
        is_hidden: !item.is_hidden,
      });
      await loadOverrideMenu(selectedBranchId);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Override güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCustomPrice(item: OverrideItem, price: number | null) {
    if (!selectedBranchId) return;
    setSaving(true);
    try {
      await apiPost<BranchItemOverride>("/api/v1/menus/overrides", {
        branch_id: selectedBranchId,
        menu_item_id: item.id,
        custom_price: price,
        is_hidden: item.is_hidden,
      });
      await loadOverrideMenu(selectedBranchId);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Fiyat güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearOverride(item: OverrideItem) {
    if (!item.override_id) return;
    setSaving(true);
    try {
      await apiDelete(`/api/v1/menus/overrides/${item.override_id}`);
      if (selectedBranchId) await loadOverrideMenu(selectedBranchId);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Override kaldırılamadı");
    } finally {
      setSaving(false);
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
        <div className="flex items-center gap-3">
          {userRole === "admin" && (
            <span className="rounded bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
              Admin — Master Menü
            </span>
          )}
          {userRole === "branch_official" && (
            <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium text-muted">
              Şube Yetkilisi — Override
            </span>
          )}
          {saving && (
            <span className="text-xs text-muted animate-pulse">Kaydediliyor...</span>
          )}
        </div>
      </div>

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

      {/* ═══════════════════════════════════════════ */}
      {/* ADMIN VIEW: Brand selector + Master Menu   */}
      {/* ═══════════════════════════════════════════ */}
      {userRole === "admin" && (
        <>
          <BrandSelector
            brands={brands}
            selectedId={selectedBrandId}
            onSelect={setSelectedBrandId}
          />

          {selectedBrandId && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              {/* Left: Management Panel */}
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
                            Bu markada henüz kategori yok. &quot;Kategori Ekle&quot;
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

              {/* Right: Live Preview */}
              <div className="sticky top-6 self-start">
                <LivePreview categories={categories} />
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* BRANCH OFFICIAL VIEW: Override Management  */}
      {/* ═══════════════════════════════════════════ */}
      {userRole === "branch_official" && (
        <>
          <BranchSelector
            branches={branches}
            selectedId={selectedBranchId}
            onSelect={setSelectedBranchId}
          />

          {selectedBranchId && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              {/* Left: Override Panel */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    Şube Menü Ayarları
                  </h2>
                  <p className="text-xs text-muted">
                    Fiyata tıklayarak özel fiyat belirleyin • Göz ikonu ile ürün gizleyin
                  </p>
                </div>

                {overrideCategories.length === 0 && (
                  <GlassCard className="text-center text-sm text-muted">
                    Bu marka için henüz master menü oluşturulmamış.
                  </GlassCard>
                )}

                <div className="flex flex-col gap-3">
                  {overrideCategories.map((cat) => (
                    <OverrideCategoryCard
                      key={cat.id}
                      category={cat}
                      onToggleHidden={handleToggleHidden}
                      onSetCustomPrice={handleSetCustomPrice}
                      onClearOverride={handleClearOverride}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Override Preview */}
              <div className="sticky top-6 self-start">
                <OverridePreview categories={overrideCategories} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
