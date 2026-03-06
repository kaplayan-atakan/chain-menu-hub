# Chain Menu Hub — Copilot Kalıcı Bağlam Dosyası

> Bu dosya, her yeni oturum ve pencerede kodlama ajanının (Lead Full-Stack Developer & Architect) proje bağlamını sıfırdan okumasını sağlayan **tek kaynak noktasıdır**. Aşağıdaki kurallar .github/agents/ ve .github/skills/ altındaki tüm politikalardan sentezlenmiştir.

---

## 1. Projenin Amacı ve Rolüm

**Proje:** 3 farklı markaya ve ~200 şubeye hizmet verecek merkezi yönetim paneli + QR menü platformu.

**Faz 1 (Baby Step) Hedefleri:**
- Merkezi yönetim paneli (marka, şube, menü CRUD işlemleri).
- Şubeye özel QR kod ile müşteriye sunulan, **salt okunur** menü arayüzü (şubeye spesifik fiyat ve içerik).
- RBAC: **Admin** (tam yetki — marka/şube/kullanıcı yönetimi) ve **Şube Yetkilisi** (sadece atandığı şubenin menü içeriği ve fiyatlandırması).

**Multi-Tenant Hiyerarşi:** `Marka → Şube → Menü` ilişkisi PostgreSQL üzerinde kesin sınırlarla kurulacaktır.

**Benim Rolüm:** Lead Full-Stack Developer & Architect. Muhakeme motorum Claude Opus 4.6. Tüm geliştirmeyi otonom ve eksiksiz yürütüyorum; her satır production-grade olmalıdır.

---

## 2. Teknoloji Yığını

| Katman | Teknoloji | Kullanım Sınırı |
|---|---|---|
| **Frontend (Panel & QR)** | Next.js (TypeScript) | QR menü veri çekme: Server-Side (RSC). Client-side fetch yalnızca etkileşimli panel işlemleri için. |
| **Backend / API** | Python (FastAPI) | Tüm business logic burada yaşar. Pydantic ile sıkı validasyon zorunlu. |
| **Database & Auth** | Supabase | **Yalnızca** PostgreSQL veritabanı + Auth servisi olarak kullanılır. Edge Functions ve DB içi karmaşık Trigger'lar iş mantığı için **YASAKTIR**. |
| **Cache** | Upstash Redis | QR menü istekleri Redis üzerinden karşılanır. Hiçbir key süresiz (infinite TTL) tutulamaz. |

---

## 3. Kırmızı Çizgiler (Red Lines) — İhlali Kabul Edilmez

### 3.1 Vendor Lock-in Koruması (Supabase)
- Supabase Edge Functions veya veritabanı içi karmaşık Trigger'lar iş mantığı için **kullanılamaz**.
- Olay güdümlü işlemler (cache invalidation vb.) tamamen **Python API katmanında** ele alınır.
- Supabase yalnızca PostgreSQL motoru ve Auth servisi olarak değerlendirilir.

### 3.2 Zero-Dummy-Code Politikası
- **Hardcoded veri yasaktır:** Geliştirme aşamasında bile tüm veriler DB veya Redis'ten gelir. `"dummy"`, `"mock"`, `"hardcoded"` veri kesinlikle yazılamaz.
- **Placeholder fonksiyon yasaktır:** `pass`, `TODO`, `return True` gibi iş mantığını erteleyen yer tutucular yasaktır. Yazılan her fonksiyon uçtan uca çalışır ve test edilebilir olmalıdır.
- **Eksik validasyon yasaktır:** Her API endpoint'i Pydantic ile sıkı şekilde doğrulanır. "Şimdilik böyle çalışsın" mantığı kabul edilmez.

### 3.3 Graceful Degradation
- Redis erişilemez olduğunda sistem **çökmez**; uygun loglama yaparak doğrudan veritabanına fallback yapar (rate limiting ile korunarak).

### 3.4 Soft Deletion Zorunluluğu
- Menü kalemleri veya şubeler **hard delete edilemez**. `is_active` veya `deleted_at` bayrakları kullanılır.

---

## 4. API İletişim Standartları (Next.js ↔ Python API)

- **Tip Güvenliği:** Python Pydantic modelleri ile Next.js TypeScript interface'leri **birebir eşleşmeli**. Her yeni endpoint için ilgili TS tipleri oluşturulur.
- **Hata Yönetimi:** Hiçbir API çağrısı sessizce hata veremez. Tüm hatalar uygun HTTP statü kodları (400, 401, 403, 404, 500) ile döner; frontend'te global error boundary/interceptor ile işlenir.
- **Data Fetching:** QR menü → Server-Side (RSC). Panel etkileşimleri → Client-side.

---

## 5. Redis Cache Standartları

| Kural | Detay |
|---|---|
| **Key İsimlendirme** | Hiyerarşik: `menu:brand_{brand_id}:branch_{branch_id}` |
| **TTL** | Her key'e zorunlu TTL (QR menü verileri için önerilen: 24h). Süresiz cache yasak. |
| **Invalidation** | Python API'de bir `UPDATE`/`INSERT`/`DELETE` gerçekleştiğinde, ilgili şubenin Redis key'i **aynı transaction bloğu içinde** silinir (Cache Purge). Event-driven yaklaşım. |

---

## 6. Veritabanı ve Migration Stratejisi (DB-First)

Bu projede **DB-First** yaklaşımı benimsenir. Uygulama kodu yazmadan önce veritabanı şeması tanımlanır ve migration ile yönetilir.

### 6.1 Migration Kontrolü
- Veritabanı şemasındaki **her değişiklik** versiyonlanmış `.sql` migration dosyaları ile kaydedilir.
- Supabase Dashboard UI üzerinden doğrudan tablo oluşturmak/değiştirmek **YASAKTIR**.
- Migration dosyaları `supabase/migrations/` dizininde `{timestamp}_{description}.sql` formatında tutulur.

### 6.2 Row-Level Security (RLS)
- Tüm tablolarda RLS **aktif** olmalıdır.
- Hiçbir sorgu, kullanıcının yetki context'ini atlayarak (bypass) çalıştırılamaz.
- RLS politikaları da migration dosyaları içinde tanımlanır.

### 6.3 Sorgu Optimizasyonu
- N+1 sorgu probleminden kaçınılır. İlişkili veriler `JOIN` veya Supabase relational query ile çekilir.

### 6.4 Soft Delete
- Hiçbir tabloda fiziksel silme yoktur. `deleted_at TIMESTAMPTZ DEFAULT NULL` kolonu kullanılır.

---

## 7. Hızlı Referans — Dosya Haritası

| Kaynak | Konum |
|---|---|
| Ajan rolü & tech stack | `.github/agents/architect.agent.md` |
| Dokunulmaz kurallar (Red Lines) | `.github/skills/enforce-red-lines/rules.md` |
| Zero-Dummy-Code detayı | `.github/skills/enforce-red-lines/zero-dummy-code-policy.md` |
| API iletişim standartları | `.github/skills/integrate-logic/api-integration-standard.md` |
| Redis cache standartları | `.github/skills/integrate-logic/cache-management.md` |
| Faz 1 kapsam & RBAC | `.github/skills/project-context/scope.md` |
| DB operasyon kuralları | `.github/skills/project-context/database-operations.md` |
