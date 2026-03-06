import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface AccentButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost";
}

/**
 * Lüks vurgu rengi (altın/bronz) taşıyan buton.
 * - primary: dolu arka plan + hover parlama
 * - ghost: saydam, hover'da accent border gösterir
 */
export function AccentButton({
  children,
  className,
  variant = "primary",
  ...props
}: AccentButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "bg-accent text-background shadow-[0_0_20px_rgba(212,168,67,0.25)] hover:bg-accent-hover hover:shadow-[0_0_30px_rgba(212,168,67,0.35)]",
        variant === "ghost" &&
          "border border-border bg-transparent text-foreground hover:border-accent hover:text-accent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
