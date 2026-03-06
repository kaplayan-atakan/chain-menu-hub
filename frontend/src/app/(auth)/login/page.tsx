"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border border-glass-border bg-glass-bg p-8 backdrop-blur-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-foreground">
          Chain Menu Hub
        </h1>
        <p className="mb-6 text-center text-sm text-muted">Yönetim Paneli</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-muted"
            >
              E-posta
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              placeholder="ornek@firma.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-muted"
            >
              Şifre
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background shadow-[0_0_20px_rgba(212,168,67,0.25)] transition-all hover:bg-accent-hover hover:shadow-[0_0_30px_rgba(212,168,67,0.35)] disabled:opacity-50"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </main>
  );
}
