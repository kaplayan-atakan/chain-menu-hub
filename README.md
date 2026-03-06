# Chain Menu Hub

3 farklı restoran markası ve ~200 şubeye hizmet veren **merkezi yönetim paneli** ve **QR menü platformu**.

---

## Özellikler

- **Multi-Tenant Hiyerarşi:** Marka → Şube → Menü Kategorisi → Menü Öğesi
- **RBAC:** Admin (tam yetki) ve Şube Yetkilisi (atandığı şubeler)
- **Bento-Glass Admin Paneli:** Dark mode, glassmorphism, sürükle-bırak kategori sıralama, canlı WYSIWYG önizleme
- **QR Menü:** Müşteriye sunulan mobil-uyumlu, salt okunur menü (Server Component + ISR)
- **Katmanlı Cache:** Redis (24h TTL) + Next.js ISR (60s revalidation)
- **Graceful Degradation:** Redis düşerse sistem çökmez, DB'ye fallback yapar

## Teknoloji Yığını

| Katman | Teknoloji |
| --- | --- |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, React 19 |
| Backend | Python FastAPI, Pydantic |
| Veritabanı | Supabase (PostgreSQL + Auth) |
| Cache | Upstash Redis (REST API) |

## Proje Yapısı

```text
chain-menu-hub/
├── backend/          # Python FastAPI — tüm business logic
├── frontend/         # Next.js — admin panel + QR menü
├── supabase/         # PostgreSQL migration dosyaları
└── PROJECT_HANDOVER.md  # Detaylı proje devir teslim dokümanı
```

## Kurulum

### Gereksinimler

- Python 3.11+
- Node.js 18+
- Supabase hesabı (PostgreSQL + Auth)
- Upstash Redis hesabı

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env    # Ortam değişkenlerini doldur
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local    # Ortam değişkenlerini doldur
npm run dev
```

### Veritabanı

```bash
# Supabase CLI ile migration uygula
supabase db push
```

## Ortam Değişkenleri

### Backend (`backend/.env`)

| Değişken | Açıklama |
| --- | --- |
| `SUPABASE_URL` | Supabase proje URL'i |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `UPSTASH_REDIS_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_TOKEN` | Upstash Redis token |
| `CORS_ORIGINS` | İzin verilen origin'ler (virgülle ayrılmış) |

### Frontend (`frontend/.env.local`)

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | Backend API URL'i |

## Lisans

Bu proje özel kullanım içindir.
