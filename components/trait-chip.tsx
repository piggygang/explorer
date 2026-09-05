import { RarityBadge } from "@/components/rarity-badge";
import type { Attribute, Facet } from "@/lib/api/client";
import { FACET_EXCLUDED_DISCLAIMER, RARITY_DISCLAIMER, lookupShare } from "@/lib/rarity";

/**
 * One attribute as a chip with its derived rarity share.
 *
 * `share === null` is the facet-excluded case: the chip renders with NO badge.
 * Not an em dash, not "n/a", not 0% — the API simply does not count that trait
 * type, and inventing a number for it would be the one thing this page must not
 * do. The contract states it outright now via Attribute.isFacet, so the chip
 * asks rather than inferring it from a value's absence in the facet response —
 * which was also true of a value the current filters had counted down to zero.
 *
 * rarityPct is preferred the moment it stops being null (ALG-627); until then
 * the derived facet share is the only number available.
 */

const LIST = "flex flex-wrap gap-2";
const CHIP =
  "flex items-center gap-1.5 rounded-full border border-line bg-surface-raised px-3 py-1.5 text-xs";
const TYPE = "text-ink-muted";
const VALUE = "font-medium";
const NOTE = "mt-3 text-[11px] text-ink-muted text-pretty";

export function TraitChip({
  traitType,
  value,
  share,
}: {
  traitType: string;
  value: string;
  share: number | null;
}) {
  return (
    <li className={CHIP}>
      <span className={TYPE}>{traitType}</span>
      <span className={VALUE}>{value}</span>
      {share !== null && <RarityBadge percent={share} />}
    </li>
  );
}

export function TraitChips({
  attributes,
  facets,
}: {
  attributes: Attribute[];
  facets: Facet[];
}) {
  const chips = attributes
    // The contract's own render order for a detail page.
    .slice()
    .sort(
      (a, b) =>
        a.position - b.position ||
        (a.traitType < b.traitType ? -1 : a.traitType > b.traitType ? 1 : 0) ||
        (a.value < b.value ? -1 : 1),
    )
    .map((attribute) => ({
      ...attribute,
      share: attribute.isFacet
        ? attribute.rarityPct ?? lookupShare(facets, attribute.traitType, attribute.value)
        : null,
    }));
  const uncounted = [
    ...new Set(chips.filter((chip) => !chip.isFacet).map((chip) => chip.traitType)),
  ];

  return (
    <>
      <ul className={LIST}>
        {chips.map((chip) => (
          <TraitChip
            key={`${chip.traitType}-${chip.value}`}
            traitType={chip.traitType}
            value={chip.value}
            share={chip.share}
          />
        ))}
      </ul>
      {/* A disclaimer sits directly under the thing it qualifies. */}
      <p className={NOTE}>{RARITY_DISCLAIMER}</p>
      {uncounted.length > 0 && (
        <p className={NOTE}>
          {uncounted.join(", ")} {uncounted.length === 1 ? "has" : "have"} no share —{" "}
          {FACET_EXCLUDED_DISCLAIMER.charAt(0).toLowerCase() + FACET_EXCLUDED_DISCLAIMER.slice(1)}
        </p>
      )}
    </>
  );
}
