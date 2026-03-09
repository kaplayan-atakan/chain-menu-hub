-- ============================================================
-- Chain Menu Hub — Brand-Based Master Menu + Branch Overrides
-- Migration: 00002_brand_menu_overrides
--
-- Mimari Değişiklik:
--   Eski: menu_categories.branch_id → her şube kendi menüsünü taşır
--   Yeni: menu_categories.brand_id  → marka bazlı master menü
--         branch_item_overrides     → şube bazlı fiyat/gizlilik özelleştirme
-- ============================================================

-- ============================================================
-- 1. TRUNCATE existing menu data (conflict önleme)
-- ============================================================

TRUNCATE TABLE public.menu_items CASCADE;
TRUNCATE TABLE public.menu_categories CASCADE;

-- ============================================================
-- 2. DROP dependent RLS policies BEFORE column drop
-- ============================================================

-- menu_categories policies that reference branch_id
DROP POLICY IF EXISTS menu_categories_admin_select    ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_admin_insert    ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_admin_update    ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_admin_delete    ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_official_select ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_official_insert ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_official_update ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_branch_official_select ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_branch_official_update ON public.menu_categories;

-- menu_items policies that reference menu_categories.branch_id
DROP POLICY IF EXISTS menu_items_admin_select    ON public.menu_items;
DROP POLICY IF EXISTS menu_items_admin_insert    ON public.menu_items;
DROP POLICY IF EXISTS menu_items_admin_update    ON public.menu_items;
DROP POLICY IF EXISTS menu_items_admin_delete    ON public.menu_items;
DROP POLICY IF EXISTS menu_items_official_select ON public.menu_items;
DROP POLICY IF EXISTS menu_items_official_insert ON public.menu_items;
DROP POLICY IF EXISTS menu_items_official_update ON public.menu_items;
DROP POLICY IF EXISTS menu_items_branch_official_select ON public.menu_items;
DROP POLICY IF EXISTS menu_items_branch_official_update ON public.menu_items;

-- ============================================================
-- 3. ALTER menu_categories: branch_id → brand_id
-- ============================================================

-- Eski FK ve index'leri kaldır
ALTER TABLE public.menu_categories DROP CONSTRAINT IF EXISTS menu_categories_branch_id_fkey;
DROP INDEX IF EXISTS idx_menu_categories_branch_id;
DROP INDEX IF EXISTS idx_menu_categories_active;
DROP INDEX IF EXISTS idx_menu_categories_sort;

-- Kolonu sil
ALTER TABLE public.menu_categories DROP COLUMN branch_id;

-- Yeni kolon ekle
ALTER TABLE public.menu_categories
    ADD COLUMN brand_id UUID NOT NULL REFERENCES public.brands(id);

-- Yeni index'ler
CREATE INDEX idx_menu_categories_brand_id ON public.menu_categories(brand_id);
CREATE INDEX idx_menu_categories_active   ON public.menu_categories(brand_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_categories_sort     ON public.menu_categories(brand_id, sort_order) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. YENİ TABLO: branch_item_overrides
-- ============================================================

CREATE TABLE public.branch_item_overrides (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID        NOT NULL REFERENCES public.branches(id),
    menu_item_id    UUID        NOT NULL REFERENCES public.menu_items(id),
    custom_price    NUMERIC(10, 2) DEFAULT NULL CHECK (custom_price IS NULL OR custom_price >= 0),
    is_hidden       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (branch_id, menu_item_id)
);

-- Index'ler
CREATE INDEX idx_branch_item_overrides_branch
    ON public.branch_item_overrides(branch_id);
CREATE INDEX idx_branch_item_overrides_item
    ON public.branch_item_overrides(menu_item_id);

-- updated_at trigger
CREATE TRIGGER trg_branch_item_overrides_updated_at
    BEFORE UPDATE ON public.branch_item_overrides
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 5. RLS — branch_item_overrides
-- ============================================================

ALTER TABLE public.branch_item_overrides ENABLE ROW LEVEL SECURITY;

-- Admin: tam okuma yetkisi
CREATE POLICY overrides_admin_select ON public.branch_item_overrides
    FOR SELECT USING (
        get_current_user_role() = 'admin'
    );

-- Admin: oluşturma
CREATE POLICY overrides_admin_insert ON public.branch_item_overrides
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- Admin: güncelleme
CREATE POLICY overrides_admin_update ON public.branch_item_overrides
    FOR UPDATE USING (
        get_current_user_role() = 'admin'
    );

-- Admin: silme
CREATE POLICY overrides_admin_delete ON public.branch_item_overrides
    FOR DELETE USING (
        get_current_user_role() = 'admin'
    );

-- Branch official: sadece kendi şubelerini okuyabilir
CREATE POLICY overrides_branch_official_select ON public.branch_item_overrides
    FOR SELECT USING (
        get_current_user_role() = 'branch_official'
        AND branch_id IN (SELECT get_current_user_branch_ids())
    );

-- Branch official: sadece kendi şubelerine override ekleyebilir
CREATE POLICY overrides_branch_official_insert ON public.branch_item_overrides
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'branch_official'
        AND branch_id IN (SELECT get_current_user_branch_ids())
    );

-- Branch official: sadece kendi şubelerinin override'larını güncelleyebilir
CREATE POLICY overrides_branch_official_update ON public.branch_item_overrides
    FOR UPDATE USING (
        get_current_user_role() = 'branch_official'
        AND branch_id IN (SELECT get_current_user_branch_ids())
    );

-- ============================================================
-- 6. RLS POLICY YENİDEN OLUŞTURMA — menu_categories
--    (Artık brand_id bazlı, branch_id yerine)
-- ============================================================

-- Admin: tam yetki
CREATE POLICY menu_categories_admin_select ON public.menu_categories
    FOR SELECT USING (
        get_current_user_role() = 'admin' AND deleted_at IS NULL
    );

CREATE POLICY menu_categories_admin_insert ON public.menu_categories
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

CREATE POLICY menu_categories_admin_update ON public.menu_categories
    FOR UPDATE USING (
        get_current_user_role() = 'admin' AND deleted_at IS NULL
    );

CREATE POLICY menu_categories_admin_delete ON public.menu_categories
    FOR DELETE USING (
        get_current_user_role() = 'admin'
    );

-- Branch official: sadece okuma (master menüyü görebilir ama değiştiremez)
CREATE POLICY menu_categories_official_select ON public.menu_categories
    FOR SELECT USING (
        get_current_user_role() = 'branch_official' AND deleted_at IS NULL
    );

-- ============================================================
-- 7. RLS POLICY YENİDEN OLUŞTURMA — menu_items
--    (branch_id referansları kaldırıldığı için yeniden tanımla)
-- ============================================================

-- Admin: tam yetki
CREATE POLICY menu_items_admin_select ON public.menu_items
    FOR SELECT USING (
        get_current_user_role() = 'admin' AND deleted_at IS NULL
    );

CREATE POLICY menu_items_admin_insert ON public.menu_items
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

CREATE POLICY menu_items_admin_update ON public.menu_items
    FOR UPDATE USING (
        get_current_user_role() = 'admin' AND deleted_at IS NULL
    );

CREATE POLICY menu_items_admin_delete ON public.menu_items
    FOR DELETE USING (
        get_current_user_role() = 'admin'
    );

-- Branch official: sadece okuma (master ürünleri görebilir ama değiştiremez)
CREATE POLICY menu_items_official_select ON public.menu_items
    FOR SELECT USING (
        get_current_user_role() = 'branch_official' AND deleted_at IS NULL
    );

-- ============================================================
-- END
-- ============================================================
