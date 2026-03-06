# Veritabanı Operasyon Kuralları

1. **Sorgu Optimizasyonu:** N+1 sorgu probleminden kaçınılmalıdır. İlişkili veriler çekilirken (örneğin bir şubeye ait menü kategorileri ve ürünler) veritabanı seviyesinde `JOIN` işlemleri veya Supabase'in sunduğu ilişkisel sorgu yapısı kullanılmalıdır.
2. **Row-Level Security (RLS):** Supabase üzerindeki tüm tablolarda RLS aktif edilmelidir. Hiçbir sorgu, kullanıcının yetki context'ini atlayarak (bypass) çalıştırılamaz.
3. **Migration Kontrolü:** Veritabanı şemasında yapılan her değişiklik, mutlaka versiyonlanmış SQL migration dosyaları olarak kaydedilmelidir. Doğrudan UI üzerinden tablo oluşturmak yasaktır.