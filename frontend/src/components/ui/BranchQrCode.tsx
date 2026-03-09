"use client";

import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { AccentButton } from "@/components/ui/AccentButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Download, QrCode } from "lucide-react";
import type { Branch } from "@/types/api";

const QR_BASE_URL = process.env.NEXT_PUBLIC_QR_BASE_URL
  ?? `${typeof window !== "undefined" ? window.location.origin : ""}`;

interface BranchQrCodeProps {
  branch: Branch;
}

export function BranchQrCode({ branch }: BranchQrCodeProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const menuUrl = `${QR_BASE_URL}/${branch.id}`;

  const handleDownload = useCallback(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    const canvas = wrapper.querySelector("canvas");
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `qr-${branch.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
  }, [branch.name]);

  return (
    <GlassCard className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <QrCode size={18} className="text-accent" />
        <h3 className="text-sm font-semibold text-foreground">QR Kod</h3>
      </div>

      <div ref={canvasWrapperRef} className="rounded-lg bg-white p-3">
        <QRCodeCanvas
          value={menuUrl}
          size={200}
          level="H"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      <p className="max-w-[240px] break-all text-center text-xs text-muted">
        {menuUrl}
      </p>

      <AccentButton onClick={handleDownload}>
        <Download size={16} />
        PNG İndir
      </AccentButton>
    </GlassCard>
  );
}
