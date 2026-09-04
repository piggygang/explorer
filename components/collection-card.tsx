import type { CSSProperties } from "react";
import Link from "next/link";
import { PiggyMark } from "@/components/brand/wordmark";
import { CollectionArt } from "@/components/collection-art";
import type { CollectionDisplay } from "@/lib/collections";
import { number } from "@/lib/format";

const CARD = "flex w-full flex-col overflow-hidden rounded-card border transition-colors";
const BODY = "flex flex-1 flex-col gap-1.5 border-t border-line p-4";
const ROW = "flex items-baseline justify-between gap-3";
// mt-auto pins the stat band to the card's foot, so the bands line up across a
// row of cards whose taglines wrap to different heights.
const STATS = "mt-auto grid grid-cols-3 gap-3 border-t border-line pt-3";
const STAT_LABEL = "text-xs text-ink-muted";
const STAT_VALUE = "font-mono text-sm";

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
        </div>
        <p className="text-sm text-ink-muted">{collection.tagline}</p>

        {/* A labelled band rather than a mono run in the title row — it is also
            where stats.activity24h finally lands, which the API has been
            returning and the card has been throwing away. "events", not sales:
            there is no volume or price anywhere in the contract. */}
        <dl className={STATS}>
          <div>
            <dt className={STAT_LABEL}>Supply</dt>
            <dd className={STAT_VALUE}>{number(collection.supply)}</dd>
          </div>
          <div>
            <dt className={STAT_LABEL}>Holders</dt>
            <dd className={STAT_VALUE}>{number(collection.holders)}</dd>
          </div>
          <div>
            <dt className={STAT_LABEL}>24h events</dt>
            <dd className={STAT_VALUE}>{number(collection.activity24h)}</dd>
          </div>
        </dl>

        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
          Browse piggies
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
