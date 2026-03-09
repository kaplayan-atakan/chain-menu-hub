"""
Chain Menu Hub — Database Seeding Script
=========================================
Supabase service_role key ile RLS bypass ederek
brands → branches → menu_categories → menu_items sırasıyla veri tohumlar.

Kullanım:
    cd backend
    python -m scripts.seed_data
"""

import sys
import os

# backend/ klasörünü sys.path'e ekle ki app.core.* modülleri import edilebilsin
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx
from app.core.database import get_supabase_client
from app.core.config import settings

supabase = get_supabase_client()

# ─── Veri Tanımları ─────────────────────────────────────────

SEED_DATA = [
    {
        "brand_name": "Baydöner",
        "branches": [
            {"name": "Baydöner Alsancak", "location_info": "Alsancak, Cadde"},
            {"name": "Baydöner Agora AVM", "location_info": "Agora AVM"},
            {"name": "Baydöner Westpark AVM", "location_info": "Westpark AVM"},
        ],
        "categories": [
            {
                "name": "İskenderler",
                "sort_order": 1,
                "items": [
                    {"name": "Tek İskender", "price": 490.00},
                    {"name": "1,5 İskender", "price": 645.00},
                    {"name": "Atom Tek İskender", "price": 505.00},
                ],
            },
            {
                "name": "Fırsat Menüleri",
                "sort_order": 2,
                "items": [
                    {"name": "İskender & Tatlı Menü", "price": 550.00},
                    {"name": "Tek İskender & Turşu Menü", "price": 515.00},
                ],
            },
            {
                "name": "Tatlılar",
                "sort_order": 3,
                "items": [
                    {"name": "Sufle", "price": 155.00},
                ],
            },
        ],
    },
    {
        "brand_name": "Bursa İshakbey",
        "branches": [
            {"name": "Bursa İshakbey Karşıyaka", "location_info": "Karşıyaka, Cadde"},
            {"name": "Bursa İshakbey Optimum AVM", "location_info": "Optimum AVM"},
        ],
        "categories": [
            {
                "name": "İskenderler",
                "sort_order": 1,
                "items": [
                    {"name": "İshakbey İskender", "price": 425.00},
                    {"name": "İshakbey Acılı Atom İskender", "price": 430.00},
                ],
            },
            {
                "name": "Et Dönerler",
                "sort_order": 2,
                "items": [
                    {"name": "Tombik Et Döner", "price": 345.00},
                    {"name": "Et Döner Dürüm", "price": 360.00},
                ],
            },
            {
                "name": "Gamer Menüler",
                "sort_order": 3,
                "items": [
                    {"name": "İshakbey Gamer Menü", "price": 565.00},
                ],
            },
            {
                "name": "Tatlılar",
                "sort_order": 4,
                "items": [
                    {"name": "Bomba Tatlısı", "price": 75.00},
                ],
            },
        ],
    },
    {
        "brand_name": "Pide by Pide",
        "branches": [
            {"name": "Pide by Pide Westpark AVM", "location_info": "Westpark AVM"},
            {"name": "Pide by Pide Yağhaneler", "location_info": "Yağhaneler, Cadde"},
        ],
        "categories": [
            {
                "name": "Pide & Lahmacun",
                "sort_order": 1,
                "items": [
                    {"name": "Lahmacun", "price": 190.00},
                    {"name": "Kıymalı Pide", "price": 340.00},
                    {"name": "Kuşbaşılı Pide", "price": 400.00},
                ],
            },
            {
                "name": "Ekstra Lezzetler",
                "sort_order": 2,
                "items": [
                    {"name": "Turşu", "price": 65.00},
                ],
            },
            {
                "name": "Tatlılar",
                "sort_order": 3,
                "items": [
                    {"name": "By Bomba Tatlısı", "price": 70.00},
                ],
            },
        ],
    },
]


# ─── Seed Fonksiyonları ─────────────────────────────────────


def insert_brand(name: str) -> str:
    """Marka oluşturur, UUID döner."""
    result = supabase.table("brands").insert({"name": name}).execute()
    brand_id = result.data[0]["id"]
    print(f"  [OK] Brand '{name}' created  →  {brand_id}")
    return brand_id


def insert_branch(brand_id: str, name: str, location_info: str) -> str:
    """Şube oluşturur, UUID döner."""
    result = (
        supabase.table("branches")
        .insert({"brand_id": brand_id, "name": name, "location_info": location_info})
        .execute()
    )
    branch_id = result.data[0]["id"]
    print(f"  [OK] Branch '{name}' created  →  {branch_id}")
    return branch_id


def insert_category(brand_id: str, name: str, sort_order: int) -> str:
    """Menü kategorisi oluşturur (marka bazlı), UUID döner."""
    result = (
        supabase.table("menu_categories")
        .insert({"brand_id": brand_id, "name": name, "sort_order": sort_order})
        .execute()
    )
    cat_id = result.data[0]["id"]
    print(f"    [OK] Category '{name}' created  →  {cat_id}")
    return cat_id


def insert_item(category_id: str, name: str, price: float) -> str:
    """Menü ürünü oluşturur, UUID döner."""
    result = (
        supabase.table("menu_items")
        .insert({"category_id": category_id, "name": name, "price": price})
        .execute()
    )
    item_id = result.data[0]["id"]
    print(f"      [OK] Item '{name}' ({price:.2f} TL) created  →  {item_id}")
    return item_id


def flush_redis() -> None:
    """Upstash Redis'i FLUSHALL ile temizler (sync HTTP)."""
    url = settings.upstash_redis_url.rstrip("/")
    headers = {
        "Authorization": f"Bearer {settings.upstash_redis_token}",
        "Content-Type": "application/json",
    }
    try:
        resp = httpx.post(url, headers=headers, json=["FLUSHALL"], timeout=5.0)
        resp.raise_for_status()
        print("\n[OK] Redis cache flushed (FLUSHALL)")
    except Exception as exc:
        print(f"\n[WARN] Redis flush failed (non-critical): {exc}")


# ─── Ana Akış ───────────────────────────────────────────────


def main() -> None:
    print("=" * 60)
    print("  Chain Menu Hub — Database Seeding")
    print("=" * 60)

    total_brands = 0
    total_branches = 0
    total_categories = 0
    total_items = 0

    for brand_data in SEED_DATA:
        brand_name = brand_data["brand_name"]
        print(f"\n{'─' * 50}")
        print(f"Marka: {brand_name}")
        print(f"{'─' * 50}")

        brand_id = insert_brand(brand_name)
        total_brands += 1

        # Şubeleri oluştur
        for branch_info in brand_data["branches"]:
            insert_branch(brand_id, branch_info["name"], branch_info["location_info"])
            total_branches += 1

        # Master menü: kategoriler ve ürünler (marka bazlı, şubeden bağımsız)
        for cat_def in brand_data["categories"]:
            cat_id = insert_category(brand_id, cat_def["name"], cat_def["sort_order"])
            total_categories += 1

            for item_def in cat_def["items"]:
                insert_item(cat_id, item_def["name"], item_def["price"])
                total_items += 1

    # Redis flush
    flush_redis()

    print(f"\n{'=' * 60}")
    print(f"  Seeding tamamlandı!")
    print(f"  Markalar    : {total_brands}")
    print(f"  Şubeler     : {total_branches}")
    print(f"  Kategoriler : {total_categories}")
    print(f"  Ürünler     : {total_items}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
