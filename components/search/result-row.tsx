import type { ReactNode } from "react";
import Link from "next/link";
import { NftImage } from "@/components/nft-image";
import { presentation } from "@/lib/collections";
import { nftLabel, number, shorten } from "@/lib/format";
import type { SearchRow } from "@/lib/search-rows";

/**
 * One search hit, at palette density.
 *
 * NO "use client" here, deliberately, for components/nft-card.tsx's exact reason:
 * this renders from INSIDE the palette (a Client Component) and from the
 * server-rendered top-hit strip on /search. A module with no directive compiles
 * into both graphs, so one definition serves both and they cannot drift. That
 * balance holds only while every import stays client-safe — next/link, the
 * already-client NftImage, lib/collections (pure data), lib/format (no imports at
 * all) and a type-only reach into lib/search-rows.
 *
 * NftCard is NOT reused. It is a grid cell with an aspect-square art well; five
 * stacked is roughly 1200px of dialog. What the two densities share is the LOGIC
 * — the label rule, the destinations, the order — which lives in lib/format.ts
 * and lib/search-rows.ts, not the markup.
 */

const ROW =
  "grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent,var(--brand))]";
/** Arrowed-to, not focused: DOM focus stays in the combobox input. */
const ACTIVE = "bg-surface-raised";
const THUMB = "art-well block h-8 w-8 shrink-0 rounded-md";
const GLYPH =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted";
const TITLE = "truncate font-mono text-sm";
const META = "truncate text-xs text-ink-muted";
const TAIL = "shrink-0 font-mono text-[11px] text-ink-muted";

/** What a row says under its title. Never invented: a mint route carries an
    address and nothing else — SearchRoute is `{kind, id}` with
    additionalProperties:false — so the name and the art live on the page it
    points at, one navigation away. */
function body(row: SearchRow): { icon: ReactNode; title: string; meta: string; tail: string } {
  switch (row.kind) {
    case "nft":
      return {
        icon: (
          <span className={THUMB}>
            <NftImage
              src={row.nft.imageUri}
              status={row.nft.imageStatus}
              alt=""
              sizes="32px"
            />
          </span>
        ),
        title: nftLabel(row.nft.name, row.nft.number),
        meta: presentation(row.nft.collection.slug).short || row.nft.collection.name,
        tail: row.nft.burned ? "Burned" : "",
      };
    case "mint":
      return {
        icon: <span className={GLYPH}>◈</span>,
        title: shorten(row.address),
        meta: "Exact mint match",
        tail: "",
      };
    case "wallet":
      return {
        icon: <span className={GLYPH}>◎</span>,
        title: shorten(row.address),
        meta: `Wallet · holds ${number(row.total)} ${row.total === 1 ? "piggy" : "piggies"}`,
        tail: "",
      };
    case "collection":
      return {
        icon: <span className={GLYPH}>❖</span>,
        title: row.name,
        meta: "Collection",
        tail: "",
      };
    case "all":
      return {
        icon: <span className={GLYPH}>→</span>,
        title: `See all results for “${row.query}”`,
        meta: "",
        tail: "",
      };
    case "recent":
      return {
        icon: <span className={GLYPH}>↺</span>,
        title: row.query,
        meta: "Recent search",
        tail: "",
      };
  }
}

export function ResultRow({
  row,
  option = null,
  onActivate,
}: {
  row: SearchRow;
  /** Non-null inside the palette's listbox; null on /search, where a row is a
      plain link in ordinary document flow. */
  option?: { id: string; active: boolean } | null;
  /**
   * Required by the palette and unused by /search. Without it a mouse click is a
   * bare soft navigation that never closes the dialog and never records the
   * search — the keyboard path would remember a query and the mouse path would
   * not, which is the sort of split nobody notices until the history is wrong.
   */
  onActivate?: () => void;
}) {
  const { icon, title, meta, tail } = body(row);
  const inner = (
    <>
      {icon}
      <span className="flex min-w-0 flex-col">
        <span className={TITLE}>{title}</span>
        {meta && <span className={META}>{meta}</span>}
      </span>
      {tail && <span className={TAIL}>{tail}</span>}
    </>
  );

  const shared = {
    // role="option" only inside the listbox, and tabIndex -1 with it: the reader
    // walks these with arrow keys while focus stays in the input, so a row in the
    // tab order would be a second, contradictory way to reach the same thing.
    ...(option
      ? { id: option.id, role: "option" as const, "aria-selected": option.active, tabIndex: -1 }
      : {}),
    className: `${ROW} ${option?.active ? ACTIVE : ""}`,
  };

  // A recent search fills the input rather than navigating — there is no page for
  // "what I typed last Tuesday", only a query to run again.
  if (row.kind === "recent") {
    return (
      <button type="button" onClick={onActivate} {...shared}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={row.href} prefetch={false} onClick={onActivate} {...shared}>
      {inner}
    </Link>
  );
}
