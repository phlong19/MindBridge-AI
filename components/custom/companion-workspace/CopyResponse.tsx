"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CopyResponse({ content }: { content: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      if (!alive.current) return;
      setStatus("copied");
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        if (alive.current) setStatus("idle");
      }, 2000);
    } catch {
      if (alive.current) setStatus("error");
    }
  }
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground size-7 rounded-lg"
        aria-label={status === "copied" ? "Response copied" : "Copy response"}
        title={status === "copied" ? "Copied" : "Copy response"}
        onClick={() => {
          void copy();
        }}
      >
        {status === "copied" ? (
          <Check className="size-3.5 text-green-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
      <span
        role="status"
        className={
          status === "error"
            ? "text-xs text-red-600"
            : "text-muted-foreground text-xs"
        }
      >
        {status === "copied"
          ? "Copied"
          : status === "error"
            ? "Could not copy. Please try again."
            : ""}
      </span>
    </div>
  );
}
