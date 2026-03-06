/** Pydantic MenuCategoryResponse ile birebir eşleşir */
export interface MenuCategory {
  id: string;
  branch_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Pydantic MenuItemResponse ile birebir eşleşir */
export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Pydantic BranchResponse ile birebir eşleşir */
export interface Branch {
  id: string;
  brand_id: string;
  name: string;
  location_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Pydantic BrandResponse ile birebir eşleşir */
export interface Brand {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Kategori + içindeki ürünler (panel tarafında kullanılır) */
export interface CategoryWithItems extends MenuCategory {
  items: MenuItem[];
}
