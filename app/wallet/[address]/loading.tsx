import { LoadingStatus, Skeleton, WalletGroupsSkeleton } from "@/components/skeleton";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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
