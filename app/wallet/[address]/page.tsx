import { Suspense } from "react";
import type { Metadata } from "next";
import { AddressActions } from "@/components/address";
import { EmptyState } from "@/components/empty-state";
import { LoadingStatus, WalletGroupsSkeleton } from "@/components/skeleton";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WalletPortfolio } from "@/components/wallet-portfolio";
import { getWalletPortfolio, listCollections } from "@/lib/api/client";
import type { WalletPortfolio as Portfolio } from "@/lib/api/client";
import { shorten } from "@/lib/format";
import { toDisplay, withComingSoon } from "@/lib/collections";

export const revalidate = 300;

const SECTION = "mx-auto w-full max-w-6xl px-5 pt-14 pb-16";
const EYEBROW = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";

/** Base58 excludes 0, O, I and l — the characters people mistype. */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function generateMetadata(props: PageProps<"/wallet/[address]">): Promise<Metadata> {
  const { address } = await props.params;
  return {
    title: `Wallet ${shorten(address)}`,
    // The address space is unbounded; there is nothing here worth indexing.
    // `follow` stays on so the piggies linked from here are still discovered —
    // the same split app/search/page.tsx makes, citing this page.
    robots: { index: false, follow: true },
  };
}

async function Portfolio({
  address,
  portfolio,
}: {
  address: string;
  portfolio: Promise<Portfolio>;
}) {
  return <WalletPortfolio address={address} portfolio={await portfolio} />;
}

export default async function WalletPage(props: PageProps<"/wallet/[address]">) {
  const { address } = await props.params;

  // The guard runs before either fetch: an address that cannot be one is not
  // worth a registry round trip, let alone a portfolio one.
  const valid = BASE58.test(address);

  // Both promises are created before either is awaited, which is what actually
  // puts them in flight together — the portfolio one used to be created inside
  // <Portfolio>, i.e. only after this await had already resolved, so the two
  // calls ran back to back across the Atlantic for no reason.
  const collectionsPromise = listCollections();
  const portfolioPromise = valid ? getWalletPortfolio(address) : null;
  const nav = withComingSoon((await collectionsPromise).map(toDisplay));

  return (
    <>
      {/* No activeSlug: no collection is current on a wallet page. */}
      <SiteHeader collections={nav} />

      <main className="flex-1">
        <section className={SECTION}>
          <h1 className={EYEBROW}>Wallet</h1>
          {valid ? (
            <>
              <p className="mt-1 font-mono text-xl font-semibold tracking-tight sm:text-2xl">
                {shorten(address)}
              </p>
              <div className="mt-2">
                {/* Already on the wallet page — no self-link. */}
                <AddressActions address={address} kind="wallet" showWallet={false} />
              </div>

              <div className="mt-8">
                <Suspense
                  fallback={
                    <>
                      <LoadingStatus>Reading this wallet’s piggies…</LoadingStatus>
                      <WalletGroupsSkeleton />
                    </>
                  }
                >
                  {/* Non-null: portfolioPromise is created exactly when `valid`. */}
                  <Portfolio address={address} portfolio={portfolioPromise!} />
                </Suspense>
              </div>
            </>
          ) : (
            <>
              {/* Truncating a broken string into 4…4 would hide the very
                  character that is wrong. */}
              <p className="mt-1 truncate font-mono text-xl font-semibold tracking-tight sm:text-2xl">
                {address}
              </p>
              <div className="mt-8">
                <EmptyState
                  title="That doesn’t look like a Solana address"
                  body="Addresses are 32 to 44 base58 characters — check for a missing or swapped character. Base58 leaves out 0, O, I and l on purpose."
                />
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
