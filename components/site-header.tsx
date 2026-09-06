import type { CSSProperties } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { NavSkeleton } from "@/components/skeleton";
import { SearchPalette } from "@/components/search/search-palette";
import { MAX_QUERY_LENGTH } from "@/lib/api/params";
import { SEARCH_TRIGGER_ID } from "@/lib/search";
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

/**
 * The `/` badge. `needs-js` and NOTHING else that touches display — no `hidden`,
 * no `lg:block`.
 *
 * That is a compiled fact, not a preference: Tailwind emits `.hidden`, then
 * `@media (scripting: none) { .needs-js }`, then `@media (width >= 64rem) { .lg\:block }`
 * in that order, all at the same specificity in the same layer. So
 * `needs-js hidden lg:block` is VISIBLE at lg with scripting off — advertising a
 * shortcut to exactly the reader who cannot use it.
 *
 * pointer-events-none so it never eats the click that opens the palette, and
 * absolute so it costs the header no height: three other files hard-code that
 * number (components/browse/browse-toolbar.tsx's sticky offsets,
 * lib/browse-layout.ts's rail offset, app/page.tsx's scroll-mt).
 */
const HINT =
  "needs-js pointer-events-none absolute inset-y-0 right-2 my-auto h-fit rounded border border-line px-1.5 py-0.5 font-mono text-[11px] leading-none text-ink-muted";

function SearchBox() {
  return (
    <form
      id={SEARCH_TRIGGER_ID}
      action="/search"
      role="search"
      // The only role="search" landmark on most pages, and the browse page is
      // about to add a second — so both need a name to be told apart.
      aria-label="Search all collections"
      // flex-1 + min-w-0 (not w-full): a basis above max-w would freeze the box
      // at its max and leave the pills to overlap it; this way it absorbs the
      // shrink and the pills and wordmark stay whole. `relative` contains the
      // badge and changes no layout.
      className="relative min-w-0 flex-1 max-w-[13rem] sm:max-w-xs"
    >
      <input
        type="search"
        name="q"
        placeholder="Search piggies…"
        aria-label="Search piggies"
        // The contract caps q at 64 and lib/browse-params.ts already drops an
        // over-length one at parse time; capping the field stops a long paste
        // becoming a 400 nobody asked for.
        maxLength={MAX_QUERY_LENGTH}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-full border border-line bg-surface px-3.5 py-2 pr-10 text-sm placeholder:text-ink-muted transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
      <kbd aria-hidden="true" className={HINT}>
        /
      </kbd>
    </form>
  );
}

export function SiteHeader({
  collections,
  activeSlug,
  pending = false,
}: {
  collections: CollectionNavItem[];
  activeSlug?: string;
  /**
   * Chrome is rendered per page, not by the root layout, so a loading.tsx has
   * to render this header itself — and with collections=[] both nav rows
   * vanish, collapsing the mobile header by a whole pill row and making it jump
   * when the real page swaps in. `pending` holds the geometry instead.
   */
  pending?: boolean;
}) {
  // Four pills, the wordmark and a usable search box need the lg container;
  // below it the pills move to the scroll row.
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <Wordmark />
            {(pending || collections.length > 0) && (
              <nav aria-label="Collections" className="hidden shrink-0 items-center gap-2 lg:flex">
                {pending ? (
                  <NavSkeleton />
                ) : (
                  collections.map((collection) => (
                    <CollectionPill
                      key={collection.slug}
                      collection={collection}
                      active={collection.slug === activeSlug}
                    />
                  ))
                )}
              </nav>
            )}
            <SearchBox />
          </div>
          {(pending || collections.length > 0) && (
            <nav
              aria-label="Collections"
              className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3 lg:hidden"
            >
              {pending ? (
                <NavSkeleton />
              ) : (
                collections.map((collection) => (
                  <CollectionPill
                    key={collection.slug}
                    collection={collection}
                    active={collection.slug === activeSlug}
                  />
                ))
              )}
            </nav>
          )}
        </div>
      </header>
      {/* The palette, as a SIBLING of <header> rather than a child: this one
          component gives all eleven chrome call sites cmd+K without touching one
          of them, and a closed <dialog> is display:none, so the header's height —
          which three other files hard-code — does not move. */}
      <SearchPalette collections={collections} />
    </>
  );
}
