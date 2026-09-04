import { Suspense } from "react";
import type { Metadata } from "next";
import { AddressActions } from "@/components/address";
import { EmptyState } from "@/components/empty-state";
import { LoadingStatus, WalletGroupsSkeleton } from "@/components/skeleton";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WalletPortfolio } from "@/components/wallet-portfolio";
import { listCollections, listWalletNfts } from "@/lib/api/client";
import type { CollectionWithStats } from "@/lib/api/client";
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
    robots: { index: false },
  };
}

async function Portfolio({
  address,
  collections,
}: {
  address: string;
  collections: Promise<CollectionWithStats[]>;
}) {
  const [groups, all] = await Promise.all([listWalletNfts(address), collections]);
  return <WalletPortfolio address={address} groups={groups} collections={all} />;
}

export default async function WalletPage(props: PageProps<"/wallet/[address]">) {
  const { address } = await props.params;

  // Started before the await below so both requests are in flight together.
  const collectionsPromise = listCollections();
  const nav = withComingSoon((await collectionsPromise).map(toDisplay));

  const valid = BASE58.test(address);

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
                  <Portfolio address={address} collections={collectionsPromise} />
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
