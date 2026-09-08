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

/**
 * The wallet portfolio in flight: the tally sentence, the chip row, the caveat
 * and the grid — in that order, because that is what WalletPortfolio renders.
 *
 * It used to draw per-collection sections with heading blocks, which the
 * contract removed when the portfolio became one flat grid. A skeleton that
 * outlives its component is worse than none: it holds space the real thing does
 * not want and shifts the page when it swaps.
 */
export function WalletGroupsSkeleton({ chips = 3 }: { chips?: number }) {
  return (
    <div>
      <SkeletonLine w="w-72" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {Array.from({ length: chips }, (_, index) => (
          <Skeleton key={index} className="h-[30px] w-24 !rounded-full" />
        ))}
      </div>
      <div className="mt-3">
        <SkeletonLine w="w-96" />
      </div>
      <NftGridSkeleton
        count={8}
        className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      />
    </div>
  );
}

/**
 * The palette's in-flight state. Reproduces components/search/result-row.tsx's
 * geometry class for class, so the swap costs no layout shift.
 *
 * Rows rather than a spinner, and not for taste: a spinner needs a keyframe, and
 * this file's motion-safe:animate-pulse is the only animation the house allows.
 *
 * No LoadingStatus wrapper — the palette already owns exactly one role="status"
 * region and a second would double-announce every keystroke.
 */
export function SearchRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul aria-hidden="true" className="flex flex-col gap-0.5">
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-2.5 py-2"
        >
          <Skeleton className="h-8 w-8 !rounded-md" />
          <span className="flex flex-col gap-1.5">
            <SkeletonLine w="w-20" />
            <SkeletonLine w="w-28" />
          </span>
        </li>
      ))}
    </ul>
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
