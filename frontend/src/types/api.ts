/** Pydantic MenuCategoryResponse ile birebir eşleşir */
export interface MenuCategory {
  id: string;
  brand_id: string;
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
  created_at: string;
  updated_at: string;
}

/** Kategori + içindeki ürünler (panel tarafında kullanılır) */
export interface CategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

/** Pydantic AssignedBranch ile birebir eşleşir */
export interface AssignedBranch {
  branch_id: string;
  branch_name: string;
}

/** Pydantic UserResponse ile birebir eşleşir */
export interface User {
  id: string;
  email: string;
  role: "admin" | "branch_official";
  created_at: string;
  branches: AssignedBranch[];
}

/** Pydantic BranchItemOverrideResponse ile birebir eşleşir */
export interface BranchItemOverride {
  id: string;
  branch_id: string;
  menu_item_id: string;
  custom_price: number | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}
