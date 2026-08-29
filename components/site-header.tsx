import type { CSSProperties } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import type { CollectionNavItem } from "@/lib/collections";

const PILL =
  "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function CollectionPill({
  collection,
  active,
}: {
  collection: CollectionNavItem;
  active: boolean;
}) {
  if (collection.status === "coming-soon") {
    // Announced, not indexed: nothing to navigate to, so a plain span — static
    // text in the nav landmark, not focusable, absent from link lists.
    // `relative` contains the absolutely positioned sr-only marker: without a
    // positioned ancestor inside the scroll row it would escape the row's
    // overflow clipping and widen the page on narrow screens.
    return (
      <span
        className={`${PILL} relative cursor-default border-dashed border-line text-ink-muted`}
      >
        {collection.name}{" "}
        <span className="font-mono text-[11px]">
          <span className="sr-only">Coming </span>soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={`/collections/${collection.slug}`}
      style={{ "--accent": collection.accent } as CSSProperties}
      aria-current={active ? "page" : undefined}
      className={`${PILL} ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/15 text-ink"
          : "border-line bg-surface text-ink-muted hover:border-[var(--accent)] hover:text-ink"
      }`}
    >
      {collection.name}
    </Link>
  );
}

function SearchBox() {
  return (
    <form
      action="/search"
      role="search"
      // flex-1 + min-w-0 (not w-full): a basis above max-w would freeze the box
      // at its max and leave the pills to overlap it; this way it absorbs the
      // shrink and the pills and wordmark stay whole.
      className="min-w-0 flex-1 max-w-[13rem] sm:max-w-xs"
    >
      <input
        type="search"
        name="q"
        placeholder="Search piggies…"
        aria-label="Search piggies"
        className="w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
    </form>
  );
}

export function SiteHeader({
  collections,
  activeSlug,
}: {
  collections: CollectionNavItem[];
  activeSlug?: string;
}) {
  // Four pills, the wordmark and a usable search box need the lg container;
  // below it the pills move to the scroll row.
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="flex items-center justify-between gap-4 py-3.5">
          <Wordmark />
          {collections.length > 0 && (
            <nav aria-label="Collections" className="hidden shrink-0 items-center gap-2 lg:flex">
              {collections.map((collection) => (
                <CollectionPill
                  key={collection.slug}
                  collection={collection}
                  active={collection.slug === activeSlug}
                />
              ))}
            </nav>
          )}
          <SearchBox />
        </div>
        {collections.length > 0 && (
          <nav
            aria-label="Collections"
            className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3 lg:hidden"
          >
            {collections.map((collection) => (
              <CollectionPill
                key={collection.slug}
                collection={collection}
                active={collection.slug === activeSlug}
              />
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
