import Link from "next/link";
import { RarityBadge } from "@/components/rarity-badge";
import type { TraitFacet } from "@/lib/api/client";
import { FACET_EXCLUDED_DISCLAIMER } from "@/lib/rarity";
import { facetTotal, traitShare } from "@/lib/rarity";
import { number } from "@/lib/format";
import {
  type BrowseParams,
  clearHref,
  closeSheetHref,
  openSheetHref,
  toggleTraitHref,
} from "@/lib/browse-params";

/**
 * The sheet's body — a server component, passed to FilterSheet as children.
 *
 * One trait type at a time behind a scrolling tab row is what makes the real
 * "Body | Received Mud" trait type a non-event: a 19-character label is just a
 * wider pill in a row that already scrolls, where a fixed-width sidebar column
 * would have to wrap it or truncate it behind a hover-only title.
 *
 * Everything here speaks --brand, never --accent: a dialog is outside accent
 * scope, per the house scoping rule.
 */

const HEAD = "flex shrink-0 items-center justify-between gap-3 border-b border-line p-5";
const BODY = "min-h-0 flex-1 overflow-y-auto p-5";
const FOOT = "flex shrink-0 items-center gap-2 border-t border-line p-5";
const EYEBROW = "mb-3 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const TABS = "no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0";
const TAB =
  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const TAB_ON = "border-brand bg-brand/15 text-ink";
const TAB_OFF = "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink";
const VALUES = "mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2";
const VALUE =
  "flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const VALUE_ON = "border-brand bg-brand/15";
const VALUE_OFF = "border-line bg-surface hover:border-ink-muted";
const COUNT = "shrink-0 font-mono text-xs text-ink-muted";
const NOTE = "mt-4 border-t border-line pt-3 text-[11px] text-ink-muted text-pretty";
const CLOSE =
  "rounded-full px-2 py-1 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const CLEAR =
  "shrink-0 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const APPLY =
  "flex-1 rounded-full bg-brand px-6 py-3.5 text-center text-base font-semibold text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function FacetPanel({
  slug,
  params,
  facets,
  total,
}: {
  slug: string;
  params: BrowseParams;
  facets: TraitFacet[] | null;
  total: number | null;
}) {
  const closeTo = closeSheetHref(slug, params);

  if (!facets || facets.length === 0) {
    return (
      <>
        <div className={HEAD}>
          <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
          <Link href={closeTo} aria-label="Close filters" className={CLOSE}>
            <span aria-hidden="true">✕</span>
          </Link>
        </div>
        <div className={BODY}>
          <p className="text-sm text-ink-muted">
            {facets === null
              ? "Trait filters couldn’t load. The grid behind this is unfiltered."
              : "No trait filters for this collection yet."}
          </p>
        </div>
      </>
    );
  }

  const active = facets.find((facet) => facet.traitType === params.filters) ?? facets[0];
  const denominator = facetTotal(active);
  const selected = params.trait[active.traitType] ?? [];

  // Disjunctive counting drops a value's own type filter but applies every
  // other one, so a value can vanish from the response while still selected in
  // the URL. Re-insert it at zero rather than losing the way to unselect it —
  // and with no badge, so 0.00% never renders as gold-tier Mythic.
  const missing = selected
    .filter((value) => !active.values.some((candidate) => candidate.value === value))
    .map((value) => ({ value, count: 0 }));
  const rows = [...missing, ...active.values];

  return (
    <>
      <div className={HEAD}>
        <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        <Link href={closeTo} aria-label="Close filters" className={CLOSE}>
          <span aria-hidden="true">✕</span>
        </Link>
      </div>

      <div className={BODY}>
        <h3 className={EYEBROW}>Traits</h3>
        <div role="tablist" aria-label="Trait types" className={TABS}>
          {facets.map((facet) => {
            const on = facet.traitType === active.traitType;
            const picked = (params.trait[facet.traitType] ?? []).length;
            return (
              <Link
                key={facet.traitType}
                role="tab"
                aria-selected={on}
                href={openSheetHref(slug, params, facet.traitType)}
                className={`${TAB} ${on ? TAB_ON : TAB_OFF}`}
              >
                {facet.traitType}
                <span className="ml-1.5 font-mono text-xs text-ink-muted">
                  {picked > 0 ? `${picked}/${facet.values.length}` : facet.values.length}
                </span>
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Nothing left under this trait once the other filters apply.
          </p>
        ) : (
          <ul className={VALUES}>
            {rows.map((row) => {
              const on = selected.includes(row.value);
              return (
                <li key={row.value} className="flex">
                  <Link
                    href={toggleTraitHref(slug, params, active.traitType, row.value)}
                    aria-pressed={on}
                    title={row.value}
                    className={`${VALUE} ${on ? VALUE_ON : VALUE_OFF} w-full`}
                  >
                    <span className="truncate text-xs font-medium">{row.value}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {row.count > 0 && denominator > 0 && (
                        <RarityBadge
                          percent={traitShare(row.count, denominator)}
                          of="the piggies these counts cover"
                        />
                      )}
                      <span className={COUNT}>{number(row.count)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className={NOTE}>
          Percentages are each value’s share of the piggies these counts cover, burned ones
          included. Counts leave out that trait’s own filter, so you can always widen a
          selection. {FACET_EXCLUDED_DISCLAIMER}
        </p>
      </div>

      <div className={FOOT}>
        <Link href={clearHref(slug, params)} className={CLEAR}>
          Clear all
        </Link>
        <Link href={closeTo} className={APPLY}>
          {total === null ? "Show results" : `Show ${number(total)} piggies`}
        </Link>
      </div>
    </>
  );
}
