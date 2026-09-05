import { NftGridSkeleton, LoadingStatus, Skeleton, SkeletonLine } from "@/components/skeleton";
import { BROWSE_GRID, BROWSE_RAIL, BROWSE_SPLIT } from "@/lib/browse-layout";

/**
 * The browse region's Suspense fallback.
 *
 * It reproduces the two-column shell rather than a bare grid: the rail is a
 * fifth of the page at lg, and a fallback that omits it would hand the reader a
 * full-width grid that jumps sideways the moment the real one arrives.
 *
 * The bar above it is not reproduced — the toolbar streams with the results, so
 * there is nothing to hold its place that would not itself shift.
 */

const CONTAINER = "mx-auto w-full max-w-6xl px-5";
const SECTION = "flex flex-col gap-2 border-b border-line py-3 last:border-b-0";

function SectionSkeleton() {
  return (
    <div className={SECTION}>
      <SkeletonLine w="w-28" />
      <Skeleton className="h-8 w-full !rounded-xl" />
      <Skeleton className="h-8 w-full !rounded-xl" />
    </div>
  );
}

export function BrowseSkeleton() {
  return (
    <div className={`${CONTAINER} pt-4 pb-16 ${BROWSE_SPLIT}`}>
      <div aria-hidden="true" className={BROWSE_RAIL}>
        {[0, 1, 2, 3].map((index) => (
          <SectionSkeleton key={index} />
        ))}
      </div>
      <div className="min-w-0">
        <LoadingStatus>Loading piggies…</LoadingStatus>
        <NftGridSkeleton className={BROWSE_GRID} />
      </div>
    </div>
  );
}
