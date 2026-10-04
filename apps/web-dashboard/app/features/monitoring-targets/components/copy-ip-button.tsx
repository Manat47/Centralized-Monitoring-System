"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Check, Copy } from "lucide-react";

interface CopyIpButtonProps {
  ipAddress: string;
  compact?: boolean;
}

export function CopyIpButton({ ipAddress, compact = false }: CopyIpButtonProps) {
  const [feedback, setFeedback] = useState<"copied" | "error" | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function copyIp(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (resetTimer.current) clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(ipAddress);
      setFeedback("copied");
    } catch {
      setFeedback("error");
    }
    resetTimer.current = setTimeout(() => setFeedback(null), 1500);
  }

  const label = feedback === "copied" ? "IP copied" : feedback === "error" ? "Copy failed" : "Copy IP";

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label={`${label}: ${ipAddress}`}
        title={label}
        onClick={(event) => void copyIp(event)}
        onKeyDown={(event) => event.stopPropagation()}
        className={`inline-flex items-center gap-1 rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          feedback === "copied" ? "text-emerald-600" : feedback === "error" ? "text-rose-600" : "text-slate-400 hover:text-blue-700"
        }`}
      >
        {feedback === "copied" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {!compact && <span className="text-xs">{label}</span>}
      </button>
      <span role="status" className={`text-xs ${feedback === "error" ? "text-rose-600" : "text-emerald-700"}`}>
        {feedback === "copied" ? "Copied to clipboard" : feedback === "error" ? "Unable to copy IP" : ""}
      </span>
    </span>
  );
}
