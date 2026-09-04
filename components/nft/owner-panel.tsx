import { AddressActions } from "@/components/address";
import type { NftDetail, OwnershipRecord } from "@/lib/api/client";
import { absoluteTime, relativeTime } from "@/lib/format";

/**
 * "Check who is the owner" lives here.
 *
 * A burned NFT has owner null by contract, so the panel says so in words rather
 * than rendering an empty address cluster — no Copy of nothing, no wallet link
 * to nowhere. "Held since" comes from the open ownership record (the one whose
 * to-fields are null); it is omitted when there is none.
 */

const PANEL = "rounded-card border border-line bg-surface p-4";
const EYEBROW = "mb-3 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const HELD = "mt-3 text-[11px] text-ink-muted";

export function OwnerPanel({
  nft,
  records,
}: {
  nft: NftDetail;
  records: OwnershipRecord[] | null;
}) {
  const current = records?.find((record) => record.toTimestamp === null);

  return (
    <section aria-label="Owner" className={PANEL}>
      <h2 className={EYEBROW}>Owner</h2>
      {nft.owner === null ? (
        <p className="text-sm text-ink-muted">Nobody — this piggy was burned.</p>
      ) : (
        <>
          <AddressActions address={nft.owner} kind="wallet" />
          {current && (
            <p className={HELD}>
              Held since{" "}
              <time dateTime={current.fromTimestamp} title={absoluteTime(current.fromTimestamp)}>
                {relativeTime(current.fromTimestamp)}
              </time>
              .
            </p>
          )}
        </>
      )}
    </section>
  );
}
