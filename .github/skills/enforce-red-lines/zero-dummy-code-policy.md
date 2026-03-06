# Sıfır Geçici Çözüm (Zero-Dummy-Code) Politikası

1. **Hardcoded Veri Yasaktır:** Projenin hiçbir aşamasında (arayüz tasarımı dahil) "dummy", "mock" veya "hardcoded" veri kullanılamaz. Geliştirme aşamasında bile tüm veriler veritabanından veya Redis'ten gelmek zorundadır.
2. **Geçici Fonksiyon Yasaktır:** `pass`, `TODO`, `return True` gibi iş mantığını erteleyen yer tutucu (placeholder) fonksiyonlar yazılamaz. Bir fonksiyon yazılıyorsa, uçtan uca çalışır durumda ve test edilebilir olmalıdır.
3. **Eksik Doğrulama (Validation) Yasaktır:** Her API endpoint'i gelen veriyi sıkı bir şekilde (Pydantic ile) doğrulamak zorundadır. Doğrulama katmanı atlanarak "şimdilik böyle çalışsın" mantığıyla kod üretilemez.