# PROJECT_HANDOVER.md — Chain Menu Hub

> **Son Güncelleme:** Mart 2026 — Faz 1 (Baby Step) Tamamlandı  
> **Amaç:** Yeni bir ortam veya kodlama ajanının projeyi sıfırdan anlayıp geliştirmeye devam edebilmesi için tek kaynak noktası (Single Source of Truth).

---

## 1. Proje Özeti ve Kapsam

### 1.1 Nedir?

**Chain Menu Hub**, 3 farklı restoran markasına ve toplam ~200 şubeye hizmet verecek merkezi yönetim paneli ve QR menü platformudur. Yöneticiler markalarını, şubelerini ve menülerini tek panelden yönetir; müşteriler ise masadaki QR kodu okutarak şubeye özel güncel menüyü telefonlarından görüntüler.

### 1.2 Multi-Tenant Hiyerarşi

```
Marka (Brand)
 └── Şube (Branch)
      └── Menü Kategorisi (Menu Category)
           └── Menü Öğesi (Menu Item)
```

Her şubenin kendine ait fiyatlandırması ve menü içeriği vardır. Veri izolasyonu PostgreSQL seviyesinde Row-Level Security (RLS) ile sağlanır.

### 1.3 RBAC (Role-Based Access Control)

| Rol | Yetki Kapsamı |
|---|---|
| **Admin** | Tam yetki — marka, şube, kullanıcı, menü CRUD. Tüm verileri görebilir ve düzenleyebilir. |
| **Şube Yetkilisi (Branch Official)** | Yalnızca `branch_users` tablosu üzerinden atandığı şubelerin menü içeriğini ve fiyatlandırmasını düzenleyebilir. Marka/şube oluşturamaz. |

### 1.4 Faz 1'de Tamamlananlar

- [x] PostgreSQL veritabanı şeması (6 tablo, 21 RLS politikası, indexler, triggerlar).
- [x] Python FastAPI backend (auth, RBAC, brand/branch/menu CRUD, cache invalidation).
- [x] Next.js frontend iskeleti (App Router, TypeScript, Tailwind CSS v4).
- [x] Bento-Glass lüks admin paneli (dark mode, glassmorphism, altın accent).
- [x] Menü yönetim sayfası (sürükle-bırak kategori sıralama, inline edit, WYSIWYG canlı önizleme).
- [x] QR menü public view (Server Component / RSC, mobile-first, ISR 60s).
- [x] Katmanlı cache stratejisi (Redis 24h TTL + Next.js ISR 60s revalidation).
- [x] Graceful degradation (Redis veya DB düşerse sistem çökmez).
- [x] Login sayfası (Supabase Auth — email/password).

---

## 2. Teknoloji Yığını

| Katman | Teknoloji | Versiyon | Notlar |
|---|---|---|---|
| **Frontend** | Next.js (App Router) | 16.1.6 | TypeScript, Tailwind CSS v4, React 19.2 |
| **UI** | Tailwind + Glassmorphism | v4 | `lucide-react` (ikonlar), `@hello-pangea/dnd` (DnD), `clsx` + `tailwind-merge` |
| **Auth Client** | @supabase/supabase-js | ^2.98 | **SADECE** login/logout/token alma — doğrudan DB erişimi YASAK |
| **Backend** | Python FastAPI | latest | Tüm business logic burada yaşar. Pydantic ile sıkı validasyon. |
| **DB + Auth** | Supabase (PostgreSQL) | - | Yalnızca PostgreSQL motoru + Auth servisi olarak kullanılır |
| **Cache** | Upstash Redis (REST API) | - | `httpx` ile REST üzerinden erişilir. Mandatory TTL. |
| **Process Manager** | uvicorn | standard extras | `uvicorn app.main:app --reload` (dev) |

---

## 3. Kırmızı Çizgiler (Red Lines) — İhlali Kabul Edilmez

Bu kurallar projenin anayasasıdır. Hiçbir koşulda gevşetilmez.

### 3.1 Zero-Dummy-Code Politikası

- **Hardcoded veri yasaktır:** Geliştirme aşamasında bile tüm veriler DB veya Redis'ten gelir. `"dummy"`, `"mock"`, `"hardcoded"` veri yazılamaz.
- **Placeholder fonksiyon yasaktır:** `pass`, `TODO`, `return True` gibi iş mantığını erteleyen yer tutucular yasaktır. Yazılan her fonksiyon uçtan uca çalışır ve test edilebilir olmalıdır.
- **Eksik validasyon yasaktır:** Her API endpoint'i Pydantic ile doğrulanır.
- **Frontend'te sahte grafik/analitik yasaktır:** DB'de karşılığı olmayan veri gösterilmez. Boş state uygun mesajlarla gösterilir.

### 3.2 Supabase Vendor Lock-in Koruması

- Supabase **yalnızca PostgreSQL motoru + Auth servisi** olarak kullanılır.
- Supabase Edge Functions veya veritabanı içi karmaşık Trigger'lar iş mantığı için **kullanılamaz**.
- Frontend'te Supabase client **sadece** `auth.signInWithPassword()`, `auth.signOut()`, `auth.getSession()` için çağrılır. `supabase.from("table").select()` gibi doğrudan DB sorguları **YASAKTIR** — tüm veri işlemleri Python API üzerinden yapılır.
- Olay güdümlü işlemler (cache invalidation vb.) tamamen Python API katmanında ele alınır.

### 3.3 Redis Cache Kuralları

| Kural | Detay |
|---|---|
| **Key İsimlendirme** | Hiyerarşik: `menu:branch_{branch_id}` |
| **Zorunlu TTL** | Her key'e TTL atanır (QR menü: 24 saat = 86400s). Süresiz cache yasak. |
| **Cache Invalidation** | Bir menü verisi (kategori/ürün) `CREATE`/`UPDATE`/`DELETE` edildiğinde, ilgili şubenin Redis key'i **aynı işlem bloğu içinde** silinir. Event-driven yaklaşım. |
| **Graceful Degradation** | Redis erişilemezse `try/except` ile yakalanır, loglama yapılır ve doğrudan DB'den veri çekilir. Sistem çökmez. |

### 3.4 Soft Delete Zorunluluğu

- Hiçbir tabloda fiziksel silme (`DELETE FROM`) yoktur.
- Tüm tablolarda `deleted_at TIMESTAMPTZ DEFAULT NULL` kolonu bulunur.
- Silme işlemi `deleted_at = NOW()` olarak güncellenir.
- Tüm sorgular `WHERE deleted_at IS NULL` filtresi ile çalışır.

---

## 4. Veritabanı Şeması ve RLS

### 4.1 Tablolar

Migration dosyası: `supabase/migrations/00001_initial_schema.sql`

| Tablo | Açıklama | Önemli Kolonlar |
|---|---|---|
| `profiles` | Supabase `auth.users` genişletmesi | `id (UUID, FK → auth.users)`, `role (user_role ENUM)`, `deleted_at` |
| `brands` | Markalar | `id`, `name`, `deleted_at` |
| `branches` | Şubeler | `id`, `brand_id (FK → brands)`, `name`, `location_info`, `is_active`, `deleted_at` |
| `branch_users` | Şube-Kullanıcı ataması | `user_id (FK → profiles)`, `branch_id (FK → branches)`, `deleted_at` (Composite PK) |
| `menu_categories` | Menü kategorileri | `id`, `branch_id (FK → branches)`, `name`, `sort_order`, `is_active`, `deleted_at` |
| `menu_items` | Menü öğeleri | `id`, `category_id (FK → menu_categories)`, `name`, `description`, `price (NUMERIC 10,2)`, `is_active`, `deleted_at` |

### 4.2 Custom Types

```sql
CREATE TYPE public.user_role AS ENUM ('admin', 'branch_official');
```

### 4.3 RLS Helper Functions (SECURITY DEFINER)

```sql
-- Kullanıcının rolünü döndürür (RLS bypass ile)
public.get_current_user_role() → user_role

-- Kullanıcıya atanmış şube ID'lerini döndürür
public.get_current_user_branch_ids() → SETOF UUID
```

### 4.4 RLS Politika Özeti (21 Politika)

| Tablo | Admin | Branch Official |
|---|---|---|
| `profiles` | SELECT, INSERT, UPDATE | Sadece kendi profilini SELECT |
| `brands` | SELECT, INSERT, UPDATE | Sadece atandığı şubenin markasını SELECT |
| `branches` | SELECT, INSERT, UPDATE | Sadece atandığı şubeleri SELECT |
| `branch_users` | SELECT, INSERT, UPDATE | Sadece kendi atamalarını SELECT |
| `menu_categories` | SELECT, INSERT, UPDATE | Atandığı şubelerin kategorilerini SELECT, UPDATE |
| `menu_items` | SELECT, INSERT, UPDATE | Atandığı şubelerin ürünlerini SELECT, UPDATE |

> **Not:** Backend `service_role_key` kullandığı için RLS bypass edilir. Yetkilendirme Python API katmanında (`api/deps.py`) JWT doğrulama + rol kontrolü ile yapılır. RLS politikaları ek güvenlik katmanı olarak tutulur.

### 4.5 Indexes

- **FK Indexes:** `branches.brand_id`, `branch_users.user_id`, `branch_users.branch_id`, `menu_categories.branch_id`, `menu_items.category_id`
- **Partial Indexes (soft delete):** Tüm tablolarda `WHERE deleted_at IS NULL` filtrelenmiş indexler.
- **Sort Index:** `menu_categories(branch_id, sort_order) WHERE deleted_at IS NULL`

### 4.6 Triggers

Tüm tablolarda `BEFORE UPDATE` trigger'ı: `fn_set_updated_at()` — `updated_at` kolonunu otomatik günceller.

---

## 5. Proje Dizin Yapısı

```
chain-menu-hub/
├── .github/
│   ├── copilot-instructions.md          # Kalıcı ajan bağlam dosyası
│   ├── agents/
│   │   └── architect.agent.md           # Ajan rol tanımı
│   └── skills/
│       ├── enforce-red-lines/
│       │   ├── rules.md                 # Dokunulmaz kurallar
│       │   └── zero-dummy-code-policy.md
│       ├── integrate-logic/
│       │   ├── api-integration-standard.md
│       │   └── cache-management.md
│       └── project-context/
│           ├── scope.md                 # Faz 1 kapsam & RBAC
│           └── database-operations.md
│
├── supabase/
│   └── migrations/
│       └── 00001_initial_schema.sql     # Tam DB şeması + RLS
│
├── backend/
│   ├── .env.example                     # Ortam değişken şablonu
│   ├── .env                             # Gerçek değerler (git'e eklenmez)
│   ├── requirements.txt                 # Python bağımlılıkları
│   └── app/
│       ├── main.py                      # FastAPI app + CORS + health check
│       ├── core/
│       │   ├── config.py                # Pydantic Settings (env validation)
│       │   ├── database.py              # Supabase client singleton
│       │   └── cache.py                 # Upstash Redis REST client
│       ├── api/
│       │   ├── deps.py                  # JWT doğrulama + RBAC deps
│       │   └── v1/
│       │       ├── router.py            # v1 router aggregator
│       │       ├── brands.py            # Brand CRUD (Admin only)
│       │       ├── branches.py          # Branch CRUD (Admin only)
│       │       └── menus.py             # Menu CRUD + Public QR endpoint
│       ├── models/
│       │   ├── user.py                  # UserRole enum, UserContext
│       │   ├── brand.py                 # Brand Pydantic şemaları
│       │   ├── branch.py               # Branch Pydantic şemaları
│       │   ├── menu_category.py         # MenuCategory şemaları
│       │   └── menu_item.py             # MenuItem şemaları
│       └── services/
│           ├── brand_service.py         # Brand iş mantığı
│           ├── branch_service.py        # Branch iş mantığı
│           └── menu_service.py          # Menu CRUD + cache invalidation
│
├── frontend/
│   ├── .env.local.example               # Frontend ortam değişken şablonu
│   ├── .env.local                       # Gerçek değerler (git'e eklenmez)
│   ├── package.json                     # Next.js 16 + bağımlılıklar
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts              # Auth-only Supabase client
│       │   ├── api.ts                   # Python API fetch wrapper (auto JWT)
│       │   └── cn.ts                    # clsx + tailwind-merge birleştirici
│       ├── types/
│       │   └── api.ts                   # Pydantic ↔ TypeScript tip eşleşmeleri
│       ├── components/
│       │   └── ui/
│       │       ├── GlassCard.tsx        # Glassmorphism kapsayıcı
│       │       └── AccentButton.tsx     # Altın accent buton
│       └── app/
│           ├── globals.css              # Tailwind v4 dark theme + glass tokens
│           ├── layout.tsx               # Root layout (Geist font)
│           ├── page.tsx                 # / → /dashboard redirect
│           ├── (auth)/
│           │   └── login/
│           │       └── page.tsx         # Login (Supabase signInWithPassword)
│           ├── (panel)/
│           │   ├── layout.tsx           # Auth-guarded panel shell + sidebar
│           │   └── dashboard/
│           │       ├── page.tsx         # Panel ana sayfa
│           │       └── menus/
│           │           └── page.tsx     # Menü yönetimi (DnD + Live Preview)
│           └── (qr)/
│               └── [branch_id]/
│                   ├── page.tsx         # QR menü (RSC, mobile-first, ISR 60s)
│                   └── not-found.tsx    # Şube bulunamadı graceful UI
│
└── PROJECT_HANDOVER.md                  # ← Bu dosya
```

---

## 6. API Endpoint Haritası

Base URL: `http://127.0.0.1:8000` (dev) — Prod'da gerçek domain ile değiştirilecek.

### 6.1 Altyapı

| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/health` | Yok | Servis sağlık kontrolü (DB + Redis durumu) |

### 6.2 Markalar (Brands) — Admin Only

| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/api/v1/brands` | Admin | Tüm markaları listele |
| `GET` | `/api/v1/brands/{brand_id}` | Admin | Marka detayı |
| `POST` | `/api/v1/brands` | Admin | Marka oluştur |
| `PATCH` | `/api/v1/brands/{brand_id}` | Admin | Marka güncelle |
| `DELETE` | `/api/v1/brands/{brand_id}` | Admin | Marka soft-delete |

### 6.3 Şubeler (Branches) — Admin Only

| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/api/v1/branches` | Admin | Tüm şubeler (`?brand_id=` filtresi mevcut) |
| `GET` | `/api/v1/branches/{branch_id}` | Admin | Şube detayı |
| `POST` | `/api/v1/branches` | Admin | Şube oluştur |
| `PATCH` | `/api/v1/branches/{branch_id}` | Admin | Şube güncelle |
| `DELETE` | `/api/v1/branches/{branch_id}` | Admin | Şube soft-delete |

### 6.4 Menüler (Menus) — Auth + RBAC

| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/api/v1/menus/public/{branch_id}` | **Yok** | QR menü public endpoint (cache-first) |
| `GET` | `/api/v1/menus/categories/{branch_id}` | User | Şubenin kategorilerini listele |
| `POST` | `/api/v1/menus/categories` | User | Kategori oluştur |
| `PATCH` | `/api/v1/menus/categories/{category_id}` | User | Kategori güncelle |
| `DELETE` | `/api/v1/menus/categories/{category_id}` | User | Kategori soft-delete |
| `GET` | `/api/v1/menus/items/{category_id}` | User | Kategorinin ürünlerini listele |
| `POST` | `/api/v1/menus/items` | User | Ürün oluştur |
| `PATCH` | `/api/v1/menus/items/{item_id}` | User | Ürün güncelle |
| `DELETE` | `/api/v1/menus/items/{item_id}` | User | Ürün soft-delete |

> **"User" auth:** Hem Admin hem Branch Official erişebilir. Branch Official yalnızca atandığı şubelerin verilerini görür/düzenler (`_assert_branch_access()` kontrolü).

### 6.5 Public Menu Response Shape

```json
{
  "branch_id": "uuid",
  "branch_name": "Şube Adı",
  "brand_name": "Marka Adı",
  "categories": [
    {
      "id": "uuid",
      "name": "Kategori Adı",
      "sort_order": 0,
      "items": [
        {
          "id": "uuid",
          "category_id": "uuid",
          "name": "Ürün Adı",
          "description": "Açıklama veya null",
          "price": "12.50",
          "is_active": true,
          "created_at": "ISO datetime",
          "updated_at": "ISO datetime"
        }
      ]
    }
  ]
}
```

---

## 7. Auth Akışı

```
1. Kullanıcı → Login sayfası (Next.js)
2. supabase.auth.signInWithPassword(email, password) → JWT token alınır
3. Frontend her API isteğinde: Authorization: Bearer <JWT>
4. Backend (deps.py) → supabase.auth.get_user(token) ile JWT doğrulanır
5. profiles tablosundan rol, branch_users tablosundan atamalar çekilir
6. UserContext(id, role, branch_ids) oluşturulur → endpoint'e dependency olarak inject edilir
```

---

## 8. Cache Stratejisi (Katmanlı)

```
Müşteri (QR okutma)
  → Next.js ISR (60 saniye revalidation — fetch cache)
    → Python API (GET /menus/public/{branch_id})
      → Redis Cache (24 saat TTL)
        → PostgreSQL (cache miss durumunda)
```

**Yazma akışı (Cache Invalidation):**

```
Yönetici menü değişikliği yapar
  → Python API (POST/PATCH/DELETE)
    → PostgreSQL güncellenir
    → Aynı işlem bloğunda: redis.delete("menu:branch_{branch_id}")
    → Sonraki QR okutma → cache miss → DB'den çekilir → Redis'e yazılır
```

---

## 9. Ortam Değişkenleri

### 9.1 Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# CORS (virgülle ayrılmış origin listesi, prod'da kısıtlanmalı)
CORS_ORIGINS=
```

### 9.2 Frontend (`frontend/.env.local`)

```env
# Supabase (SADECE Auth için)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Python FastAPI Backend URL
NEXT_PUBLIC_API_URL=
```

> **Güvenlik Notu:** `SUPABASE_SERVICE_ROLE_KEY` sadece backend'de kullanılır, asla frontend'e açılmaz. Frontend yalnızca `ANON_KEY` kullanır.

---

## 10. Çalıştırma Komutları

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Gerçek değerleri yaz
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # Gerçek değerleri yaz
npm run dev   # Development
npm run build # Production build
npm start     # Production server
```

### Veritabanı Migration

```bash
# Supabase CLI ile
supabase db push

# Veya doğrudan SQL editöründe
# supabase/migrations/00001_initial_schema.sql dosyasını çalıştır
```

---

## 11. TypeScript ↔ Pydantic Tip Eşleşmeleri

Frontend'deki TS tipleri (`frontend/src/types/api.ts`) backend Pydantic modelleriyle birebir eşleşir:

| Python (Pydantic) | TypeScript | Konum |
|---|---|---|
| `BrandResponse` | `Brand` | `types/api.ts` |
| `BranchResponse` | `Branch` | `types/api.ts` |
| `MenuCategoryResponse` | `MenuCategory` | `types/api.ts` |
| `MenuItemResponse` | `MenuItem` | `types/api.ts` |
| `CategoryWithItems` (virtual) | `CategoryWithItems` | `types/api.ts` |

**Kural:** Yeni bir endpoint veya alan eklendiğinde her iki taraf da güncellenir. Tip uyumsuzluğu kabul edilmez.

---

## 12. UI Tasarım Dili (Bento-Glass)

- **Tema:** Dark mode varsayılan. Arka plan: `#0b0e14`.
- **Glass efekti:** `bg-glass-bg` (`rgba(255,255,255,0.05)`), `backdrop-blur-md`, `border-glass-border`.
- **Accent renk:** Altın/bronz `#d4a843`, hover: `#e4bc5a`, glow shadow.
- **Tipografi:** Geist Sans + Geist Mono (Google Fonts).
- **İkonlar:** `lucide-react`.
- **Sürükle-Bırak:** `@hello-pangea/dnd` (kategori sıralama).
- **Utility birleştirici:** `cn()` — `clsx` + `tailwind-merge` wrapper'ı (`lib/cn.ts`).

---

## 13. Bekleyen İşler (Backlog)

### Öncelik: Yüksek

- [ ] **QR Kod Görseli Oluşturma:** Admin panelinde şubeye özel QR Kod görselini (PNG/SVG) generate edip indirme özelliği (`qrcode.react` veya benzeri kütüphane) eklenecektir. QR kod `/{branch_id}` rotasına yönlendirecektir.
- [ ] **Deployment Konfigürasyonu:** Production ortamı için Docker, CI/CD pipeline, CORS kısıtlaması.
- [ ] **CORS Sıkılaştırması:** `CORS_ORIGINS=*` prod ortamında gerçek domain ile değiştirilmelidir.

### Öncelik: Orta

- [ ] **Kullanıcı Yönetimi (Admin):** Admin panelinden yeni kullanıcı oluşturma, rol atama, şubeye atama ekranları.
- [ ] **Şube Yetkilisi Panel Görünümü:** Branch Official rolünde giriş yapıldığında sadece atanmış şube(ler) gösterilmeli.
- [ ] **Menü Öğesi Görsel Yükleme:** Ürünlere fotoğraf ekleme (Supabase Storage veya harici CDN).
- [ ] **Multi-Language Menü:** QR menüde dil desteği (TR/EN minimum).

### Öncelik: Düşük

- [ ] **Rate Limiting:** Public API endpoint'lerine rate limit eklenmesi.
- [ ] **Audit Log:** Kim, ne zaman, ne değiştirdi kaydı.
- [ ] **Bulk Import/Export:** Menü verilerini CSV/Excel ile toplu aktarım.
- [ ] **Analytics Dashboard:** Menü görüntülenme istatistikleri (ancak DB'de veri modellemesi yapıldıktan sonra — zero-dummy-code kuralı).

---

## 14. Bilinen Tasarım Kararları ve Gerekçeleri

| Karar | Gerekçe |
|---|---|
| Backend `service_role_key` kullanıyor (RLS bypass) | Yetkilendirme Python katmanında yapılıyor. RLS ek güvenlik katmanı. |
| Redis REST API (`httpx`) vs native client | Upstash ücretsiz katman REST API sunuyor; connection pooling gerektirmez. |
| Supabase client'ı `@lru_cache` singleton | Her request'te yeni client oluşturmayı önler. |
| `asyncio.to_thread()` ile Supabase çağrıları | Supabase Python SDK senkron; async FastAPI event loop bloke olmasın diye thread'e delege edilir. |
| `deleted_at` yerine `is_active` + `deleted_at` | `is_active` iş mantığı (menüde gizle/göster), `deleted_at` kalıcı silme. İkisi farklı amaçlara hizmet eder. |
| Tailwind v4 CSS-based config (`@theme inline`) | `tailwind.config.ts` dosyasına gerek yok; tüm özelleştirme `globals.css` içinde. |

---

## 15. Güvenlik Kontrol Listesi

- [x] JWT doğrulama her korumalı endpoint'te yapılıyor (`deps.py`).
- [x] Rol bazlı erişim kontrolü (Admin vs Branch Official).
- [x] Branch Official şube sınırı kontrolü (`_assert_branch_access`).
- [x] Pydantic ile tüm girdi validasyonu.
- [x] SQL Injection koruması (Supabase ORM, parametreli sorgular).
- [x] CORS middleware aktif.
- [x] `service_role_key` sadece backend'de, asla frontend'te.
- [x] Soft delete — veri kaybı riski yok.
- [ ] Rate limiting (backlog).
- [ ] HTTPS zorunluluğu (deployment aşamasında).

---

*Bu doküman, Chain Menu Hub projesinin Faz 1 geliştirme sürecinin tamamlanmış durumunu yansıtır. Yeni bir ajan veya geliştirici bu dosyayı okuyarak projeyi tam bağlamıyla kavrayabilir ve geliştirmeye devam edebilir.*
