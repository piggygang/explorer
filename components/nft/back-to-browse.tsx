"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { browseHrefFromContext } from "@/lib/browse-params";

/**
 * "Back to browse", returning to the filtered grid the reader came from.
 *
 * A client island for one reason, and it is load-bearing: searchParams is a
 * Request-time API, and reading it in the page would opt the whole route into
 * dynamic rendering — ALG-639 is about to point a sitemap at ~15,750 of these
 * pages, so this route has to stay prerenderable. Reading the context here keeps
 * the server render static.
 *
 * The fallback below is the same link without the context, which is exactly what
 * this control did before, so the pre-hydration state is never worse than the
 * status quo — and the href only sharpens once JS lands.
 */

export function BackToBrowse({ slug, className }: { slug: string; className: string }) {
  const search = useSearchParams();
  const href = browseHrefFromContext(slug, new URLSearchParams(search.toString()));
  const filtered = href.includes("?");

  return (
    <Link href={href} className={className}>
      {filtered ? "Back to results" : "Back to browse"}
    </Link>
  );
}

/** Rendered while the island is still on its way. Identical geometry. */
export function BackToBrowseFallback({ slug, className }: { slug: string; className: string }) {
  return (
    <Link href={`/collections/${slug}`} className={className}>
      Back to browse
    </Link>
  );
}
