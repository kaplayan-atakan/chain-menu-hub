# Redis Cache Standartları

1. **İsimlendirme Konvansiyonu:** Redis key'leri hiyerarşik ve tahmin edilebilir olmalıdır. Örnek: `menu:brand_{brand_id}:branch_{branch_id}`
2. **TTL (Time to Live):** Hiçbir cache verisi süresiz (infinite) olarak tutulamaz. QR menü verileri için mantıklı bir TTL değeri (örn. 24 saat) belirlenmelidir.
3. **Kesin Invalidation (Geçersiz Kılma):** Python API üzerinden ilgili şubenin menüsünde veya fiyatlarında bir `UPDATE`, `INSERT` veya `DELETE` işlemi yapıldığında, o şubeye ait Redis key'i aynı transaction bloğu içerisinde MUTLAKA silinmelidir (Cache Purge).