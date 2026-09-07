import { FacetValueRow } from "@/components/browse/facet-value-row";
import type { FacetRowTone } from "@/components/browse/facet-value-row";
import { ValueSearch } from "@/components/browse/value-search";
import type { SearchableRow } from "@/components/browse/value-search";
import type { Facet } from "@/lib/api/client";
import { number } from "@/lib/format";
import { facetTotal } from "@/lib/rarity";
import { VALUE_SEARCH_THRESHOLD, valueListId } from "@/lib/browse-layout";
import type { FacetShell } from "@/lib/browse-layout";
import { canAddTrait, toggleTraitHref } from "@/lib/browse-params";
import type { BrowseParams } from "@/lib/browse-params";

/**
 * One trait type, as a native <details> section.
 *
 * `open` follows the SHELL, and nothing else. The rail is chrome the reader did
 * not ask for, sitting beside the grid they came for, so it starts collapsed:
 * eight summary rows instead of ninety-odd links, and eight tab stops instead of
 * a hundred. The drawer is the opposite — it only exists because someone tapped
 * "Filters" — so opening onto eight closed rows would answer a question with a
 * second question. It starts expanded.
 *
 * `shell` is fixed for the life of a mounted section, so this is still the bare
 * literal the DOM needs. React writes the attribute only when the PROP changes,
 * so a section the reader OPENS by hand survives the navigation that every
 * filter toggle performs. Deriving it from the selection would slam a section
 * shut the moment its last value was removed; deriving it from the index would
 * not be constant either, since the contract orders the facets array but does
 * not promise a trait type with no surviving values still appears in it.
 *
 * Collapsing hides how many piggies wear a value, never WHICH values are on:
 * the summary keeps its "N picked" badge, and active-filters.tsx names every
 * one of them in a chip row above the split.
 *
 * A <summary> is a real control with keyboard support and an exposed role for
 * free, which is what the tab row it replaces never had: role="tab" on an <a>
 * with no tabpanel and no aria-controls, and aria-pressed on a link.
 */

const SECTION = "border-b border-line last:border-b-0";
const SUMMARY =
  "flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden";
const CHEVRON = "shrink-0 font-mono text-xs text-ink-muted transition-transform group-open:rotate-90";
const TALLY = "ml-auto shrink-0 font-mono text-[11px] text-ink-muted";
const PICKED = "ml-auto shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px]";
const VALUES = "grid grid-cols-1 gap-2 pb-4";
// The search island renders its own <ul>, so its wrapper only owns the spacing.
const SEARCHED = "pb-4";
const EMPTY = "pb-4 text-xs text-ink-muted";

export function FacetSection({
  slug,
  params,
  facet,
  shell,
  tone,
}: {
  slug: string;
  params: BrowseParams;
  facet: Facet;
  shell: FacetShell;
  tone: FacetRowTone;
}) {
  const selected = params.trait[facet.traitType] ?? [];
  const denominator = facetTotal(facet);

  // Disjunctive counting drops a value's own type filter but applies every other
  // one, so a selected value can vanish from the response entirely. Re-insert it
  // at zero rather than losing the only way to unselect it.
  const missing = selected
    .filter((value) => !facet.values.some((candidate) => candidate.value === value))
    .map((value) => ({ value, count: 0 }));

  const canAdd = canAddTrait(params, facet.traitType);
  const rows: SearchableRow[] = [...missing, ...facet.values].map((row) => {
    const on = selected.includes(row.value);
    return {
      value: row.value,
      count: row.count,
      selected: on,
      // Removal is never blocked: a reader who reached the cap through a
      // bookmarked URL must always be able to get back under it.
      href: on || canAdd ? toggleTraitHref(slug, params, facet.traitType, row.value) : null,
    };
  });

  const listId = valueListId(shell, facet.traitType);

  return (
    <details open={shell === "drawer"} className={`${SECTION} group`}>
      <summary className={`${SUMMARY} ${tone.outline}`}>
        <span aria-hidden="true" className={CHEVRON}>
          ▸
        </span>
        {facet.traitType}
        {selected.length > 0 ? (
          <span className={`${PICKED} ${tone.on}`}>
            {number(selected.length)} picked
          </span>
        ) : (
          // A count of VALUES, not of piggies — the counts beside each row are
          // the asset numbers, and two different totals in one line would read
          // as one.
          <span className={TALLY}>{number(facet.values.length)} values</span>
        )}
      </summary>

      {rows.length === 0 ? (
        <p className={EMPTY}>Nothing left under this trait once the other filters apply.</p>
      ) : rows.length > VALUE_SEARCH_THRESHOLD ? (
        <div className={SEARCHED}>
          <ValueSearch
            traitType={facet.traitType}
            rows={rows}
            denominator={denominator}
            tone={tone}
            listId={listId}
          />
        </div>
      ) : (
        <ul id={listId} className={VALUES}>
          {rows.map((row) => (
            <FacetValueRow
              key={row.value}
              value={row.value}
              count={row.count}
              denominator={denominator}
              selected={row.selected}
              href={row.href}
              tone={tone}
            />
          ))}
        </ul>
      )}
    </details>
  );
}
