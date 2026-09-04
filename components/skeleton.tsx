/**
 * The only animate-* in this repo, and the only place one is allowed.
 *
 * A static #211729 block on a #17101f card is nearly invisible, and a static
 * filled rectangle is indistinguishable from the bg-surface-raised well that
 * already means "image goes here" — while a dashed border is already spoken for
 * by "inert, nothing to click". Motion is the only thing left that separates
 * "arriving" from "absent" in this palette. It is written as motion-safe: so a
 * reduced-motion visitor gets the static block anyway.
 *
 * Every composed skeleton reproduces the real component's geometry class for
 * class, so the swap costs no layout shift. The blocks are aria-hidden; callers
 * wrap them in a role="status" region carrying an sr-only sentence.
 */

const PULSE = "motion-safe:animate-pulse bg-surface-raised";
const CARD = "flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface";
const BODY = "flex flex-1 flex-col gap-2 border-t border-line p-4";
const BAND = "grid gap-px overflow-hidden rounded-card border border-line bg-line";

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded-full ${PULSE} ${className}`} />;
}

export function SkeletonLine({ w }: { w: string }) {
  return <Skeleton className={`h-3 ${w}`} />;
}

export function NavSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-8 w-28 shrink-0" />
      ))}
    </>
  );
}

export function NftCardSkeleton() {
  return (
    <div className={CARD}>
      <Skeleton className="aspect-square !rounded-none" />
      <div className={BODY}>
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/** 12, not 24: a full page of pulsing boxes is two viewport-heights of noise. */
export function NftGridSkeleton({ count = 12, className }: { count?: number; className: string }) {
  return (
    <ul className={className}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex">
          <NftCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function TimelineSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={BAND}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="bg-surface p-2">
          <div className="flex h-full gap-3 rounded-xl p-3">
            <Skeleton className="h-9 w-9 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <SkeletonLine w="w-24" />
              <SkeletonLine w="w-40" />
              <SkeletonLine w="w-56" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatBandSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex flex-col gap-2 bg-surface px-4 py-3">
          <SkeletonLine w="w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function WalletGroupsSkeleton({ groups = 2 }: { groups?: number }) {
  return (
    <div className="flex flex-col gap-10">
      {Array.from({ length: groups }, (_, index) => (
        <div key={index} className="flex flex-col gap-4">
          <Skeleton className="h-5 w-44" />
          <NftGridSkeleton
            count={4}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          />
        </div>
      ))}
    </div>
  );
}

/** The sr-only sentence that gives every skeleton region its meaning. */
export function LoadingStatus({ children }: { children: string }) {
  return (
    <span role="status" className="sr-only">
      {children}
    </span>
  );
}
