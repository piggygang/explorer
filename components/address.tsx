import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { shorten } from "@/lib/format";

/**
 * The one truncated-address family, at two densities. AddressLink is the inline
 * atom used inside activity rows and anywhere a wallet is mentioned;
 * AddressActions is the cluster used by the owner card and the wallet header.
 *
 * Solscan is the explorer of record here, matching lib/tokens.ts. SolanaFM is a
 * later addition, not a second link on every row.
 */

export const GHOST_XS =
  "shrink-0 rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent,var(--brand))]";

const LINK =
  "rounded font-mono transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent,var(--brand))]";

const ACTIONS = "mt-3 flex flex-wrap items-center gap-2";

export const solscan = {
  account: (address: string) => `https://solscan.io/account/${address}`,
  token: (mint: string) => `https://solscan.io/token/${mint}`,
  tx: (signature: string) => `https://solscan.io/tx/${signature}`,
};

/** Inline wallet reference: truncated, mono, linked to its portfolio. */
export function AddressLink({
  address,
  className = "text-ink-muted",
}: {
  address: string;
  className?: string;
}) {
  return (
    <Link href={`/wallet/${address}`} title={address} className={`${LINK} ${className}`}>
      {shorten(address)}
    </Link>
  );
}

export function AddressActions({
  address,
  kind,
  showWallet = true,
}: {
  address: string;
  kind: "wallet" | "mint";
  showWallet?: boolean;
}) {
  const href = kind === "mint" ? solscan.token(address) : solscan.account(address);
  return (
    <>
      <p className="font-mono text-sm break-all">{address}</p>
      <div className={ACTIONS}>
        <CopyButton value={address} />
        {showWallet && kind === "wallet" && (
          <Link href={`/wallet/${address}`} className={GHOST_XS}>
            Wallet page
          </Link>
        )}
        <a href={href} target="_blank" rel="noreferrer" className={GHOST_XS}>
          Solscan ↗
        </a>
      </div>
    </>
  );
}
