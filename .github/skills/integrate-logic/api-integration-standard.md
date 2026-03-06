# API İletişim Standartları (Next.js <-> Python API)

1. **Tip Güvenliği (Type Safety):** Python tarafında Pydantic modelleri, Next.js tarafında ise TypeScript interfaceleri birebir eşleşmelidir. Ajan, her yeni endpoint için ilgili TypeScript tiplerini oluşturmak zorundadır.
2. **Hata Yönetimi (Error Handling):** Frontend'de hiçbir API çağrısı "sessizce" hata veremez. Tüm hatalar uygun HTTP statü kodları (400, 401, 403, 404, 500) ile döndürülmeli ve Next.js tarafında global bir hata yakalayıcı (error boundary/interceptor) ile işlenmelidir.
3. **Veri Çekme (Data Fetching):** Next.js tarafında QR menü için yapılacak veri çekme işlemleri her zaman Server-Side (React Server Components) yapılmalı, client-side veri çekme sadece etkileşimli panel işlemleri için kullanılmalıdır.