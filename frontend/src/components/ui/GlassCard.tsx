import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Bento Grid yerleşiminde kullanılan glassmorphism kapsayıcı.
 * Yarı saydam arka plan, blur efekti, yuvarlatılmış köşeler.
 */
export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-glass-border bg-glass-bg p-4 backdrop-blur-md transition-colors hover:border-border-bright",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
