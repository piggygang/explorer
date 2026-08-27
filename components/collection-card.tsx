import type { CSSProperties } from "react";
import Link from "next/link";
import { PiggyMark } from "@/components/brand/wordmark";
import type { CollectionDisplay } from "@/lib/collections";

export function CollectionCard({ collection }: { collection: CollectionDisplay }) {
  const accent = { "--accent": collection.accent } as CSSProperties;

  return (
    <Link
      href={`/collections/${collection.slug}`}
      style={accent}
      className="group flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {/* Collection art arrives with the NFT-media issue; until then the mark
          on an accent wash keeps the card's proportions and hover behaviour. */}
      <div className="flex aspect-square items-center justify-center bg-[var(--accent)]/10">
        <PiggyMark className="h-16 w-16 transition-transform duration-300 group-hover:scale-105" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-line p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight">{collection.name}</h3>
          <span className="font-mono text-xs text-ink-muted">
            {collection.supply.toLocaleString("en-US")} · {collection.holders.toLocaleString("en-US")} holders
          </span>
        </div>
        <p className="text-sm text-ink-muted">{collection.tagline}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
          Browse
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
