import { AddressActions } from "@/components/address";
import type { NftDetail } from "@/lib/api/client";
import { absoluteTime, relativeTime } from "@/lib/format";

/**
 * "Check who is the owner" lives here.
 *
 * A burned NFT has owner null by contract, so the panel says so in words rather
 * than rendering an empty address cluster — no Copy of nothing, no wallet link
 * to nowhere.
 *
 * "Held since" comes from nft.ownership, which the contract computes from the
 * open ownership interval and deliberately returns as null when that interval
 * disagrees with the observed owner — rather than attributing a date to the
 * wrong wallet. Deriving it here from the interval list would throw that care
 * away, so the panel no longer takes one.
 *
 * Null has two causes and the reader is owed the difference. MintInfo is the
 * contract's own discriminator: "every field is null until the activity backfill
 * has run for this asset", so a null signature means nobody has walked this
 * piggy yet — a state of the indexer, not of the piggy. A null heldSince with a
 * walked asset is the disagreement case above, and stays silent: there is
 * nothing true to say about it in one line.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "mb-3 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const HELD = "mt-3 text-[11px] text-ink-muted";

export function OwnerPanel({ nft }: { nft: NftDetail }) {
  const { heldSince } = nft.ownership;
  const unwalked = heldSince === null && nft.mint.signature === null;

  return (
    <section aria-label="Owner" className={PANEL}>
      <h2 className={EYEBROW}>Owner</h2>
      {nft.owner === null ? (
        <p className="text-sm text-ink-muted">Nobody — this piggy was burned.</p>
      ) : (
        <>
          <AddressActions address={nft.owner} kind="wallet" truncate />
          {heldSince !== null ? (
            <p className={HELD}>
              Held since{" "}
              <time dateTime={heldSince} title={absoluteTime(heldSince)}>
                {relativeTime(heldSince)}
              </time>
              .
            </p>
          ) : (
            unwalked && (
              <p className={HELD}>
                Held since — the indexer hasn’t walked this piggy’s history yet.
              </p>
            )
          )}
        </>
      )}
    </section>
  );
}
