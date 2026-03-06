# Dokunulmaz Kurallar (Red Lines)

1. **Vendor Lock-in Koruması:** Supabase'e özel Edge Functions veya veritabanı içi karmaşık Trigger'lar iş mantığı (business logic) için kullanılamaz. Olay güdümlü işlemler (örneğin Redis cache invalidation) tamamen Python API katmanında ele alınacaktır. Supabase yalnızca PostgreSQL ve Auth servisi olarak değerlendirilmelidir.
2. **Sıfır Dummy Kod Toleransı:** Sistemde hiçbir veri mocklanamaz. En küçük bileşen bile veritabanı şemasına ve cache mimarisine uygun, gerçek verilerle çalışacak şekilde tasarlanacaktır.
3. **Graceful Degradation:** Redis'e erişilemediği durumlarda sistem çökmemeli, uygun loglamayı yaparak doğrudan veritabanına fallback yapacak şekilde (ancak rate limiting ile) çalışmaya devam etmelidir.
4. **Soft Deletion:** Menü kalemleri veya şubeler veritabanından kalıcı olarak (hard delete) silinemez. `is_active` veya `deleted_at` bayrakları kullanılmalıdır.