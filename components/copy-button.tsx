"use client";

import { useState } from "react";
import { GHOST_XS } from "@/components/address";

/**
 * A minimal client island: clipboard plus a label swap, following dressme's
 * busy-label idiom ("Rendering…" / "Download PNG") rather than a toast — this
 * codebase has no toast, no portal and no second z-index to build one with.
 *
 * A rejected write (insecure context, denied permission, an embedded browser)
 * names the cause instead of failing silently.
 */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      title={state === "failed" ? "Clipboard blocked by the browser — select the address instead." : undefined}
      className={`${GHOST_XS} ${state === "failed" ? "text-brand" : ""}`}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
