import type { CSSProperties } from "react";
import Link from "next/link";
import { PiggyMark } from "@/components/brand/wordmark";
import { CollectionArt } from "@/components/collection-art";
import type { CollectionDisplay } from "@/lib/collections";

const CARD = "flex w-full flex-col overflow-hidden rounded-card border transition-colors";
const BODY = "flex flex-1 flex-col gap-1.5 border-t border-line p-4";
const ROW = "flex items-baseline justify-between gap-3";

/** The square portrait. Decorative — the name below names the collection. */
function Art({ collection }: { collection: CollectionDisplay }) {
  const { art } = collection;
  const live = collection.status === "live";
  // Covers are opaque, so the accent wash only shows behind the
  // background-free layer stacks and the brand-mark fallback. Coming-soon art
  // sits dimmed on the plain surface, as the website's strip does.
  const backdrop = !live ? "bg-surface" : art?.kind === "image" ? undefined : "bg-[var(--accent)]/10";
  const motion = live ? "transition-transform duration-300 group-hover:scale-105" : "opacity-75";

  return (
    <div aria-hidden="true" className={backdrop}>
      {art ? (
        // Live art is above the fold on the home page; coming-soon art is
        // inert, the heaviest file and never LCP, so it loads lazily.
        <CollectionArt art={art} alt="" eager={live} className={`w-full ${motion}`} />
      ) : (
        <div className="flex aspect-square items-center justify-center">
          <PiggyMark className={`h-16 w-16 ${motion}`} />
        </div>
      )}
    </div>
  );
}

export function CollectionCard({ collection }: { collection: CollectionDisplay }) {
  const accent = { "--accent": collection.accent } as CSSProperties;

  if (collection.status === "coming-soon") {
    // No page yet: inert on purpose — hover brightens the border only,
    // without promising navigation the card cannot deliver.
    return (
      <div
        style={accent}
        className={`${CARD} border-dashed border-line bg-surface/50 hover:border-ink-muted`}
      >
        <Art collection={collection} />
        <div className={BODY}>
          <div className={ROW}>
            <h3 className="text-base font-semibold tracking-tight text-ink-muted">
              {collection.name}
            </h3>
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted">
              Coming soon
            </span>
          </div>
          <p className="text-sm text-ink-muted">{collection.tagline}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/collections/${collection.slug}`}
      style={accent}
      className={`group ${CARD} border-line bg-surface hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]`}
    >
      <Art collection={collection} />
      <div className={BODY}>
        <div className={ROW}>
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
