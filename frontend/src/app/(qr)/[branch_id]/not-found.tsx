import { UtensilsCrossed } from "lucide-react";

export default function QrNotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
      <div className="rounded-full border border-glass-border bg-glass-bg p-5 backdrop-blur-md">
        <UtensilsCrossed size={32} className="text-muted" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-foreground">
        Şube Bulunamadı
      </h1>
      <p className="mt-2 max-w-xs text-center text-sm text-muted">
        Aradığınız şube mevcut değil veya menü henüz yayınlanmamış. Lütfen QR
        kodu tekrar okutun.
      </p>
    </main>
  );
}
