-- ============================================================
-- Chain Menu Hub — Initial Database Schema
-- Migration: 00001_initial_schema
-- DB-First approach. No dummy data. No hard deletes. RLS on every table.
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. CUSTOM TYPES
-- ============================================================

CREATE TYPE public.user_role AS ENUM ('admin', 'branch_official');

-- ============================================================
-- 3. HELPER FUNCTIONS
-- ============================================================

-- Generic trigger function: auto-update updated_at on every row modification
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. TABLES
-- ============================================================

-- profiles: extends Supabase auth.users
CREATE TABLE public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role        public.user_role NOT NULL DEFAULT 'branch_official',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ DEFAULT NULL
);

-- brands
CREATE TABLE public.brands (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ DEFAULT NULL
);

-- branches
CREATE TABLE public.branches (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id        UUID        NOT NULL REFERENCES public.brands(id),
    name            TEXT        NOT NULL,
    location_info   TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- branch_users: maps branch officials to their assigned branches
CREATE TABLE public.branch_users (
    user_id     UUID        NOT NULL REFERENCES public.profiles(id),
    branch_id   UUID        NOT NULL REFERENCES public.branches(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ DEFAULT NULL,
    PRIMARY KEY (user_id, branch_id)
);

-- menu_categories
CREATE TABLE public.menu_categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID        NOT NULL REFERENCES public.branches(id),
    name        TEXT        NOT NULL,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ DEFAULT NULL
);

-- menu_items
CREATE TABLE public.menu_items (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID        NOT NULL REFERENCES public.menu_categories(id),
    name        TEXT        NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
-- 5. RLS HELPER FUNCTIONS (defined after tables they reference)
-- ============================================================

-- RLS helper: returns current authenticated user's role (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.profiles
    WHERE id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS helper: returns branch IDs assigned to the current authenticated user
CREATE OR REPLACE FUNCTION public.get_current_user_branch_ids()
RETURNS SETOF UUID AS $$
    SELECT branch_id FROM public.branch_users
    WHERE user_id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 6. INDEXES
-- ============================================================

-- Foreign key indexes (query performance on JOINs)
CREATE INDEX idx_branches_brand_id          ON public.branches(brand_id);
CREATE INDEX idx_branch_users_user_id       ON public.branch_users(user_id);
CREATE INDEX idx_branch_users_branch_id     ON public.branch_users(branch_id);
CREATE INDEX idx_menu_categories_branch_id  ON public.menu_categories(branch_id);
CREATE INDEX idx_menu_items_category_id     ON public.menu_items(category_id);

-- Partial indexes: only non-deleted rows (speeds up soft-delete filtered queries)
CREATE INDEX idx_profiles_active            ON public.profiles(id)                      WHERE deleted_at IS NULL;
CREATE INDEX idx_brands_active              ON public.brands(id)                        WHERE deleted_at IS NULL;
CREATE INDEX idx_branches_active            ON public.branches(id)                      WHERE deleted_at IS NULL;
CREATE INDEX idx_branch_users_active        ON public.branch_users(user_id, branch_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_categories_active     ON public.menu_categories(branch_id)        WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_active          ON public.menu_items(category_id)           WHERE deleted_at IS NULL;

-- Sort order index for category ordering
CREATE INDEX idx_menu_categories_sort       ON public.menu_categories(branch_id, sort_order) WHERE deleted_at IS NULL;

-- ============================================================
-- 7. TRIGGERS — updated_at auto-refresh
-- ============================================================

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_brands_updated_at
    BEFORE UPDATE ON public.brands
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_branch_users_updated_at
    BEFORE UPDATE ON public.branch_users
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_menu_categories_updated_at
    BEFORE UPDATE ON public.menu_categories
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 8. ROW-LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8.1 PROFILES
-- ============================================================

-- Admin: see all non-deleted profiles
CREATE POLICY profiles_admin_select ON public.profiles
    FOR SELECT USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Admin: create new profiles
CREATE POLICY profiles_admin_insert ON public.profiles
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- Admin: update non-deleted profiles
CREATE POLICY profiles_admin_update ON public.profiles
    FOR UPDATE USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Any authenticated user: see own non-deleted profile
CREATE POLICY profiles_self_select ON public.profiles
    FOR SELECT USING (
        id = auth.uid()
        AND deleted_at IS NULL
    );

-- ============================================================
-- 8.2 BRANDS
-- ============================================================

-- Admin: full read on non-deleted brands
CREATE POLICY brands_admin_select ON public.brands
    FOR SELECT USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Admin: create brands
CREATE POLICY brands_admin_insert ON public.brands
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- Admin: update non-deleted brands
CREATE POLICY brands_admin_update ON public.brands
    FOR UPDATE USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Branch official: see only brands that own a branch they are assigned to
CREATE POLICY brands_branch_official_select ON public.brands
    FOR SELECT USING (
        deleted_at IS NULL
        AND id IN (
            SELECT b.brand_id
            FROM public.branches b
            WHERE b.id IN (SELECT get_current_user_branch_ids())
              AND b.deleted_at IS NULL
        )
    );

-- ============================================================
-- 8.3 BRANCHES
-- ============================================================

-- Admin: full read on non-deleted branches
CREATE POLICY branches_admin_select ON public.branches
    FOR SELECT USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Admin: create branches
CREATE POLICY branches_admin_insert ON public.branches
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- Admin: update non-deleted branches
CREATE POLICY branches_admin_update ON public.branches
    FOR UPDATE USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Branch official: see only their assigned non-deleted branches
CREATE POLICY branches_branch_official_select ON public.branches
    FOR SELECT USING (
        deleted_at IS NULL
        AND id IN (SELECT get_current_user_branch_ids())
    );

-- ============================================================
-- 8.4 BRANCH_USERS
-- ============================================================

-- Admin: full read on non-deleted assignments
CREATE POLICY branch_users_admin_select ON public.branch_users
    FOR SELECT USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Admin: create assignments
CREATE POLICY branch_users_admin_insert ON public.branch_users
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- Admin: update non-deleted assignments
CREATE POLICY branch_users_admin_update ON public.branch_users
    FOR UPDATE USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Branch official: see only own non-deleted assignments
CREATE POLICY branch_users_self_select ON public.branch_users
    FOR SELECT USING (
        user_id = auth.uid()
        AND deleted_at IS NULL
    );

-- ============================================================
-- 8.5 MENU_CATEGORIES
-- ============================================================

-- Admin: full read on non-deleted categories
CREATE POLICY menu_categories_admin_select ON public.menu_categories
    FOR SELECT USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Admin: create categories
CREATE POLICY menu_categories_admin_insert ON public.menu_categories
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- Admin: update non-deleted categories
CREATE POLICY menu_categories_admin_update ON public.menu_categories
    FOR UPDATE USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Branch official: read non-deleted categories of their assigned branches
CREATE POLICY menu_categories_branch_official_select ON public.menu_categories
    FOR SELECT USING (
        deleted_at IS NULL
        AND branch_id IN (SELECT get_current_user_branch_ids())
    );

-- Branch official: update non-deleted categories of their assigned branches
CREATE POLICY menu_categories_branch_official_update ON public.menu_categories
    FOR UPDATE USING (
        deleted_at IS NULL
        AND branch_id IN (SELECT get_current_user_branch_ids())
    );

-- ============================================================
-- 8.6 MENU_ITEMS
-- ============================================================

-- Admin: full read on non-deleted items
CREATE POLICY menu_items_admin_select ON public.menu_items
    FOR SELECT USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Admin: create items
CREATE POLICY menu_items_admin_insert ON public.menu_items
    FOR INSERT WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- Admin: update non-deleted items
CREATE POLICY menu_items_admin_update ON public.menu_items
    FOR UPDATE USING (
        get_current_user_role() = 'admin'
        AND deleted_at IS NULL
    );

-- Branch official: read non-deleted items under their assigned branches' categories
CREATE POLICY menu_items_branch_official_select ON public.menu_items
    FOR SELECT USING (
        deleted_at IS NULL
        AND category_id IN (
            SELECT mc.id
            FROM public.menu_categories mc
            WHERE mc.branch_id IN (SELECT get_current_user_branch_ids())
              AND mc.deleted_at IS NULL
        )
    );

-- Branch official: update non-deleted items under their assigned branches' categories
CREATE POLICY menu_items_branch_official_update ON public.menu_items
    FOR UPDATE USING (
        deleted_at IS NULL
        AND category_id IN (
            SELECT mc.id
            FROM public.menu_categories mc
            WHERE mc.branch_id IN (SELECT get_current_user_branch_ids())
              AND mc.deleted_at IS NULL
        )
    );
