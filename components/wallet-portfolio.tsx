import type { CSSProperties } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { WalletGroup } from "@/components/wallet-group";
import type { CollectionWithStats, WalletCollectionGroup } from "@/lib/api/client";
import { number } from "@/lib/format";
import { presentation } from "@/lib/collections";

/**
 * The tally row and the per-collection sections.
 *
 * Everything cross-collection speaks --brand; each group sets its own --accent.
 * That keeps the scoping rule legible at a glance: colour means "this
 * collection", brand means "this wallet".
 */

const TALLY = "flex flex-wrap items-center gap-2";
const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const DOT = "h-1.5 w-1.5 rounded-full bg-[var(--accent)]";
const FULL =
  "inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 font-mono text-[11px] text-brand";
const NOTE = "mt-3 text-[11px] text-ink-muted text-pretty";
const GHOST =
  "mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function WalletPortfolio({
  address,
  groups,
  collections,
}: {
  address: string;
  groups: WalletCollectionGroup[];
  collections: CollectionWithStats[];
}) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="No piggies in this wallet"
        body="This address holds nothing from the indexed collections. A piggy listed for sale or staked is held by the marketplace, not by the wallet — those don’t show up here."
        action={
          <Link href="/#collections" className={GHOST}>
            Browse the collections
          </Link>
        }
      />
    );
  }

  const held = groups.reduce((sum, group) => sum + group.totalCount, 0);
  // Derived from the live API list, never a hard-coded three: the day a fourth
  // collection is indexed, "every one" keeps meaning every one.
  const fullGang = collections.length > 0 && groups.length === collections.length;

  return (
    <>
      <p className="text-sm text-ink-muted">
        Holds <span className="font-mono text-ink">{number(held)}</span>{" "}
        {held === 1 ? "piggy" : "piggies"} across{" "}
        <span className="font-mono text-ink">{number(groups.length)}</span>{" "}
        {groups.length === 1 ? "collection" : "collections"}.
      </p>

      <div className={`${TALLY} mt-3`}>
        {groups.map((group) => {
          const { slug, name } = group.collection;
          const { short, accent } = presentation(slug);
          return (
            <a
              key={slug}
              href={`#${slug}`}
              style={{ "--accent": accent } as CSSProperties}
              className={CHIP}
            >
              <span aria-hidden="true" className={DOT} />
              {number(group.totalCount)} {short || name}
            </a>
          );
        })}
        {fullGang && (
          <span className={FULL} title="Holds every indexed collection">
            Full gang
          </span>
        )}
      </div>

      <p className={NOTE}>
        Indexed collections only — a piggy listed for sale or staked is held by the marketplace,
        not by this wallet.
      </p>

      <div className="mt-10 flex flex-col gap-10">
        {groups.map((group) => (
          <WalletGroup key={group.collection.slug} group={group} address={address} />
        ))}
      </div>
    </>
  );
}
