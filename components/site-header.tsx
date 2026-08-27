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
    <form action="/search" role="search" className="w-full max-w-[13rem] sm:max-w-xs">
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
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="flex items-center justify-between gap-4 py-3.5">
          <Wordmark />
          {collections.length > 0 && (
            <nav aria-label="Collections" className="hidden items-center gap-2 md:flex">
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
            className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3 md:hidden"
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
