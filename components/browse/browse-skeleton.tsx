import { NftGridSkeleton, LoadingStatus, SkeletonLine } from "@/components/skeleton";
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
// One collapsed <summary> per trait type: the rail arrives closed, so holding
// space for open sections would overstate its height and shrink it the moment
// the real one streams in. py-3 matches the summary's own padding.
const SECTION = "flex flex-col gap-2 border-b border-line py-3 last:border-b-0";
/** Eight, the facetable trait-type count every launching collection carries. */
const SECTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

function SectionSkeleton() {
  return (
    <div className={SECTION}>
      <SkeletonLine w="w-28" />
    </div>
  );
}

export function BrowseSkeleton() {
  return (
    <div className={`${CONTAINER} pt-4 pb-16 ${BROWSE_SPLIT}`}>
      <div aria-hidden="true" className={BROWSE_RAIL}>
        {SECTIONS.map((index) => (
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
