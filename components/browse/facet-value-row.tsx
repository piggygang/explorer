import Link from "next/link";
import { RarityBadge } from "@/components/rarity-badge";
import { number } from "@/lib/format";
import { traitShare } from "@/lib/rarity";

/**
 * One trait value in the filter panel: the value, its share of the trait type,
 * and its count.
 *
 * NO "use client" here, deliberately. Short trait types are rendered straight
 * from the server panel; a type long enough to earn a search box is rendered by
 * the ValueSearch island. A module with no directive compiles into both graphs,
 * so one definition serves both and the two cannot drift — the same reason
 * components/nft-card.tsx carries no directive. That holds only while every
 * import here stays client-safe: next/link, RarityBadge and two pure functions.
 * lib/api/client.ts must never appear in this file's import graph, because its
 * runtime import of the mock dispatcher would pull the whole fixture set into
 * the browser bundle without a word from tsc or eslint.
 */

const ROW =
  "flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const COUNT = "shrink-0 font-mono text-xs text-ink-muted";
/** Over the cap there is nothing to link to, so the row stops being a link
    rather than becoming one that answers 400. */
const INERT = "cursor-default border-line bg-surface opacity-50";

export type FacetRowTone = {
  /** `border-brand bg-brand/15` in the drawer, the accent equivalent in the rail. */
  readonly on: string;
  readonly off: string;
  readonly outline: string;
};

export function FacetValueRow({
  value,
  count,
  denominator,
  selected,
  href,
  tone,
}: {
  value: string;
  count: number;
  /** Sum of the type's counts. Zero when every value has been counted out. */
  denominator: number;
  selected: boolean;
  /** null when adding this value would exceed the contract's caps. */
  href: string | null;
  tone: FacetRowTone;
}) {
  const body = (
    <>
      <span className="truncate text-xs font-medium">{value}</span>
      <span className="flex shrink-0 items-center gap-2">
        {/* A re-inserted zero-count row carries no badge: 0.00% would render as
            gold-tier Mythic, which is the opposite of what it means. */}
        {count > 0 && denominator > 0 && (
          <RarityBadge
            percent={traitShare(count, denominator)}
            of="the piggies these counts cover"
          />
        )}
        <span className={COUNT}>{number(count)}</span>
      </span>
    </>
  );

  if (href === null) {
    return (
      <li className="flex">
        <span title={value} className={`${ROW} ${INERT}`}>
          {body}
        </span>
      </li>
    );
  }

  return (
    <li className="flex">
      <Link
        href={href}
        // aria-current, not aria-pressed: this is a link, and aria-pressed is
        // not valid on the implicit link role.
        aria-current={selected ? "true" : undefined}
        title={value}
        // The reader's place in a long accordion is the whole point of a rail
        // they can see the grid beside; Next's default would throw them to the
        // top of the collection.
        scroll={false}
        // An expanded rail is ~86 links to a route with no loading.tsx boundary
        // to prefetch down to.
        prefetch={false}
        className={`${ROW} ${tone.outline} ${selected ? tone.on : tone.off}`}
      >
        {body}
      </Link>
    </li>
  );
}
