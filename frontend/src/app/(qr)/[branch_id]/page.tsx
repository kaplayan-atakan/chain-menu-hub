import { notFound } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { UtensilsCrossed } from "lucide-react";

// ─── Types (Pydantic karşılıkları) ─────────────────────────

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

interface PublicMenuResponse {
  branch_id: string;
  branch_name: string;
  brand_name: string;
  categories: MenuCategory[];
}

// ─── Server-side data fetching ─────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getPublicMenu(
  branchId: string,
): Promise<PublicMenuResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/menus/public/${encodeURIComponent(branchId)}`,
      { next: { revalidate: 60 } },
    );

    if (res.status === 404) return null;
    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}

// ─── Metadata ──────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ branch_id: string }>;
}) {
  const { branch_id } = await params;
  const menu = await getPublicMenu(branch_id);

  if (!menu) {
    return { title: "Menü Bulunamadı — Chain Menu Hub" };
  }

  return {
    title: `${menu.branch_name} — ${menu.brand_name} Menü`,
    description: `${menu.brand_name} ${menu.branch_name} şubesinin güncel menüsü.`,
  };
}

// ─── Category Nav (horizontal scroll) ──────────────────────

function CategoryNav({ categories }: { categories: MenuCategory[] }) {
  return (
    <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
      {categories.map((cat) => (
        <a
          key={cat.id}
          href={`#cat-${cat.id}`}
          className="shrink-0 rounded-full border border-glass-border bg-glass-bg px-4 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors active:bg-accent-muted active:text-accent"
        >
          {cat.name}
        </a>
      ))}
    </nav>
  );
}

// ─── Page ──────────────────────────────────────────────────

export default async function QrMenuPage({
  params,
}: {
  params: Promise<{ branch_id: string }>;
}) {
  const { branch_id } = await params;
  const menu = await getPublicMenu(branch_id);

  // ── 404: Şube bulunamadı ──
  if (!menu) {
    notFound();
  }

  const activeCategories = menu.categories.filter(
    (c) => c.items.some((i) => i.is_active),
  );

  // ── Boş menü ──
  if (activeCategories.length === 0) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
        <div className="rounded-full border border-glass-border bg-glass-bg p-5 backdrop-blur-md">
          <UtensilsCrossed size={32} className="text-accent" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">
          Menü Hazırlanıyor
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          {menu.brand_name} — {menu.branch_name} şubesi menüsü
          henüz yayınlanmamış.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-svh max-w-lg bg-background pb-10">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="px-4 pb-1 pt-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            {menu.brand_name}
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-foreground">
            {menu.branch_name}
          </h1>
        </div>

        {/* Horizontal category tabs */}
        <CategoryNav categories={activeCategories} />
      </header>

      {/* ── Menu Body ── */}
      <div className="flex flex-col gap-8 px-4 pt-5">
        {activeCategories.map((category) => {
          const items = category.items.filter((i) => i.is_active);
          return (
            <section key={category.id} id={`cat-${category.id}`}>
              {/* Category title */}
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border-bright to-transparent" />
                <h2 className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-accent">
                  {category.name}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border-bright to-transparent" />
              </div>

              {/* Items */}
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <GlassCard
                    key={item.id}
                    className="flex items-start gap-3 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-md bg-accent-muted px-2.5 py-1 text-sm font-bold text-accent">
                      ₺{Number(item.price).toFixed(2)}
                    </span>
                  </GlassCard>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <footer className="mt-10 border-t border-border px-4 py-6 text-center">
        <p className="text-[10px] text-muted">
          Powered by <span className="font-semibold text-accent">Chain Menu Hub</span>
        </p>
      </footer>
    </main>
  );
}
