import { LoadingStatus, Skeleton, WalletGroupsSkeleton } from "@/components/skeleton";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// The only loading.tsx in the repo, and so the only place SiteHeader's search
// palette mounts inside a Suspense fallback and unmounts when the real page
// swaps in. A palette opened during this brief window closes with the fallback.
// Accepted rather than engineered around: the alternative — withholding the
// palette while `pending` — makes ⌘K silently do nothing instead, which is worse.
export default function WalletLoading() {
  return (
    <>
      <SiteHeader collections={[]} pending />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16">
          <LoadingStatus>Reading this wallet’s piggies…</LoadingStatus>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-7 w-40" />
          <Skeleton className="mt-3 h-3 w-full max-w-md" />
          <div className="mt-8">
            <WalletGroupsSkeleton />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
