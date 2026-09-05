"use client";

import { useId, useState } from "react";
import { FacetValueRow } from "@/components/browse/facet-value-row";
import type { FacetRowTone } from "@/components/browse/facet-value-row";

/**
 * A text filter over one trait type's own values — not a search of the
 * collection, which is ALG-634's.
 *
 * It renders the rows itself rather than hiding server-rendered ones. Toggling
 * `hidden` on a list it does not own would need the match count to come back out
 * of the DOM, and deriving state by reading the DOM in an effect is exactly what
 * React 19's `react-hooks/set-state-in-effect` rule rejects here — plus the DOM
 * and the input can disagree after a filter navigation, because React leaves an
 * attribute alone when the prop that produced it has not changed.
 *
 * So this receives one over-threshold type's rows as props: at most three types
 * per collection, thirteen to twenty-one short strings each, well under a
 * kilobyte. That is a bounded exception to the rule that facet data does not
 * cross the RSC boundary, and the thing that rule protects against — a
 * collection with several hundred values — is one the contract says will not
 * happen: facets are "unpaginated by contract ... tens of trait values, not
 * thousands".
 *
 * The input carries `needs-js`, so a reader without JavaScript gets the whole
 * list server-rendered and no control that cannot work.
 */

const FIELD =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-xs text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2";
const NOTE = "mt-2 text-[11px] text-ink-muted";

export type SearchableRow = {
  readonly value: string;
  readonly count: number;
  /** null when adding this value would exceed the contract's caps. */
  readonly href: string | null;
  readonly selected: boolean;
};

export function ValueSearch({
  traitType,
  rows,
  denominator,
  tone,
  listId,
}: {
  traitType: string;
  rows: readonly SearchableRow[];
  denominator: number;
  tone: FacetRowTone;
  listId: string;
}) {
  const [needle, setNeedle] = useState("");
  const inputId = useId();

  const trimmed = needle.trim().toLowerCase();
  // Derived during render, never in an effect — which is also what keeps the
  // announced count and the rendered list from ever disagreeing.
  const shown = trimmed === "" ? rows : rows.filter((row) => row.value.toLowerCase().includes(trimmed));

  return (
    <>
      <div className="needs-js mb-2">
        <label htmlFor={inputId} className="sr-only">
          Search {traitType} values
        </label>
        <input
          id={inputId}
          type="search"
          value={needle}
          onChange={(event) => setNeedle(event.target.value)}
          placeholder={`Search ${rows.length} ${traitType.toLowerCase()} values…`}
          className={`${FIELD} ${tone.outline}`}
        />
      </div>

      <ul id={listId} className="grid grid-cols-1 gap-2">
        {shown.map((row) => (
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

      {/* Names the cause rather than going silent, and doubles as the live region
          that tells a screen-reader user the list narrowed under them. */}
      <p aria-live="polite" className={NOTE}>
        {trimmed === ""
          ? ""
          : shown.length === 0
            ? `No ${traitType.toLowerCase()} value matches “${needle.trim()}”.`
            : `${shown.length} of ${rows.length} shown.`}
      </p>
    </>
  );
}
