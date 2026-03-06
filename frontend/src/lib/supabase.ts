import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client — YALNIZCA Auth işlemleri (login, logout, token alma) için kullanılır.
 * Kırmızı Çizgi: Bu client ile doğrudan veritabanı sorgusu yapılmaz.
 * Tüm veri işlemleri Python FastAPI backend üzerinden gerçekleştirilir.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
