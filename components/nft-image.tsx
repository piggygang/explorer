"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PiggyMark } from "@/components/brand/wordmark";
import type { ImageStatus } from "@/lib/api/client";

/**
 * Every state a 2021-era NFT image can be in, in one place.
 *
 * The indexer flags reachability, so `dead` renders the placeholder without
 * ever issuing the request — the difference between a fallback and a wasted
 * round trip to a host that has not answered since 2021. `unknown` means "not
 * checked", which the contract says to load optimistically, and `onError` stays
 * the backstop for a link that rots between two crawls.
 *
 * Media that lives on a host we know goes through next/image, which resizes a
 * 200KB+ PNG down to the cell it is actually rendered in. Everything else keeps
 * a plain <img>: next/image answers 400 for any src outside remotePatterns
 * rather than degrading, and the contract warns that 2021 metadata carries
 * `ipfs://`, `ar://` "and worse". eslint.config.mjs carries the scoped
 * no-img-element override this file needs.
 */

const IMG =
  "h-full w-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-105 motion-reduce:transition-none";
const MARK = "h-12 w-12 opacity-25 transition-transform duration-300 group-hover:scale-105";
// The well behind the image already carries a tinted blur (the art-well
// utility), so the image only has to arrive over it. Both the fade and the
// hover scale ride one `transition-[opacity,transform]` in IMG: two separate
// `transition-*` utilities would not merge — the later one wins outright and
// silently drops the other.

/**
 * Hosts the indexer's re-hosted media actually lives on, pinned exactly rather
 * than by wildcard — `**.r2.dev` would let anyone route arbitrary buckets
 * through this app's image optimizer. These must stay in step with
 * next.config.ts's images.remotePatterns; a host in one and not the other
 * either 400s or silently skips optimization.
 */
const OPTIMIZED_HOSTS = new Set([
  "pub-b1a45763f0a64d8fa271f66f5514a561.r2.dev",
  "rk2cjjujjgvqwsmy.public.blob.vercel-storage.com",
]);

function optimizable(src: string): boolean {
  try {
    return OPTIMIZED_HOSTS.has(new URL(src).hostname);
  } catch {
    // ipfs://, ar://, a bare path, or anything malformed. Not a URL we can
    // hand to the optimizer, and not an error either.
    return false;
  }
}

export function NftImage({
  src,
  status,
  alt,
  eager = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
}: {
  src: string | null;
  status: ImageStatus;
  alt: string;
  eager?: boolean;
  sizes?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Only true once JS is running. Without it the server would render the image
  // transparent and a reader with no JS would never see it arrive.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    // An image already in cache is complete before this runs, and fading it in
    // from zero would be a flash, not a reveal.
    if (ref.current?.complete) setLoaded(true);
    else setArmed(true);
  }, []);

  // A missing link, a link the indexer has confirmed dead, and one that failed
  // in front of us all look identical on purpose — none of them is the piggy's
  // art, and none should shift the layout.
  if (!src || status === "dead" || failed) {
    return (
      <div aria-hidden="true" className="flex h-full w-full items-center justify-center">
        <PiggyMark className={MARK} />
      </div>
    );
  }

  // `alt` is passed at each call site rather than spread: jsx-a11y cannot see
  // an alt that arrives through a spread, and a silenced a11y rule is worse
  // than a repeated prop.
  const shared = {
    ref,
    draggable: false,
    decoding: "async" as const,
    loading: eager ? ("eager" as const) : ("lazy" as const),
    fetchPriority: eager ? ("high" as const) : ("auto" as const),
    onLoad: () => setLoaded(true),
    onError: () => setFailed(true),
    className: `${IMG} ${armed && !loaded ? "opacity-0" : "opacity-100"}`,
  };

  return optimizable(src) ? (
    <Image {...shared} alt={alt} src={src} fill sizes={sizes} />
  ) : (
    <img {...shared} alt={alt} src={src} width={640} height={640} />
  );
}
