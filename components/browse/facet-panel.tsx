import Link from "next/link";
import { FacetSection } from "@/components/browse/facet-section";
import type { FacetRowTone } from "@/components/browse/facet-value-row";
import type { Facet } from "@/lib/api/client";
import { FACET_EXCLUDED_DISCLAIMER } from "@/lib/rarity";
import { MAX_TRAIT_TYPES, MAX_TRAIT_VALUES } from "@/lib/api/params";
import type { FacetShell } from "@/lib/browse-layout";
import { type BrowseParams, clearHref, traitCount, withinCaps } from "@/lib/browse-params";

/**
 * The filter panel's body, and nothing else — no header, no footer, no close
 * control. It renders into two shells that want different chrome: a sticky rail
 * at lg and up, and the drawer below it. Each supplies its own.
 *
 * COLOUR follows the shell. The rail lives inside the browse region's accent
 * scope, so it speaks --accent like everything else there; the drawer is a
 * dialog, and the house rule is that a dialog is outside accent scope and speaks
 * --brand. Two entries in a table rather than a new CSS token: both class shapes
 * already exist in this repo (compare components/browse/sort-pills.tsx).
 */

const TONES: Record<FacetShell, FacetRowTone> = {
  rail: {
    on: "border-[var(--accent)] bg-[var(--accent)]/15 text-ink",
    off: "border-line bg-surface hover:border-ink-muted",
    outline: "focus-visible:outline-[var(--accent)]",
  },
  drawer: {
    on: "border-brand bg-brand/15 text-ink",
    off: "border-line bg-surface hover:border-ink-muted",
    outline: "focus-visible:outline-brand",
  },
};

const NOTE = "mt-4 border-t border-line pt-3 text-[11px] text-ink-muted text-pretty";
const CLEAR =
  "shrink-0 self-start rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2";
const HEADING = "flex items-center justify-between gap-3";
/** In the rail the panel is what scrolls, so Clear all pins itself to the top of
    that scroll container rather than disappearing under a fully expanded
    accordion. Inside a scroll container, so it needs no z-index of its own. */
const HEADING_RAIL = "sticky top-0 bg-canvas py-1";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";

export function FacetPanel({
  slug,
  params,
  facets,
  shell,
}: {
  slug: string;
  params: BrowseParams;
  /** null when the facets request failed; [] when the API has nothing to filter
      on — including when a bookmarked URL names a trait type that no longer
      exists, which the contract answers with `{total: 0, facets: []}`. */
  facets: Facet[] | null;
  shell: FacetShell;
}) {
  const tone = TONES[shell];
  const picked = traitCount(params);

  // Checked before the failure branch, because an over-cap URL is what MAKES
  // the facets call fail: without this the reader is told the filters could not
  // load and that it is "usually temporary", when the cause is in their link and
  // waiting will not fix it.
  if (!withinCaps(params)) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-muted">
          This link asks for more than the indexer accepts — at most {MAX_TRAIT_TYPES} trait types
          and {MAX_TRAIT_VALUES} values at a time.
        </p>
        <Link href={clearHref(slug, params)} scroll={false} className={`${CLEAR} ${tone.outline}`}>
          Clear all filters
        </Link>
      </div>
    );
  }

  if (facets === null) {
    return (
      <p className="text-sm text-ink-muted">
        Trait filters couldn’t load, so the grid beside this is unfiltered. It’s usually temporary.
      </p>
    );
  }

  if (facets.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-muted">
          {picked > 0
            ? "None of these filters match a trait this collection has any more — metadata may have changed since the link was made."
            : "No trait filters for this collection yet."}
        </p>
        {picked > 0 && (
          <Link href={clearHref(slug, params)} scroll={false} className={`${CLEAR} ${tone.outline}`}>
            Clear all filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`${HEADING} mb-2 ${shell === "rail" ? HEADING_RAIL : ""}`}>
        <h2 className={EYEBROW}>Traits</h2>
        {picked > 0 && (
          <Link href={clearHref(slug, params)} scroll={false} className={`${CLEAR} ${tone.outline}`}>
            Clear all
          </Link>
        )}
      </div>

      <div>
        {facets.map((facet) => (
          <FacetSection
            key={facet.traitType}
            slug={slug}
            params={params}
            facet={facet}
            shell={shell}
            tone={tone}
          />
        ))}
      </div>

      <p className={NOTE}>
        Percentages are each value’s share of the piggies these counts cover, burned ones included.
        Counts leave out that trait’s own filter, so you can always widen a selection.{" "}
        {FACET_EXCLUDED_DISCLAIMER}
      </p>
    </>
  );
}
