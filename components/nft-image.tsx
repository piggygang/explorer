"use client";

import { useState } from "react";
import { PiggyMark } from "@/components/brand/wordmark";

/**
 * The smallest possible client island: it exists ONLY so a dead 2021-era
 * Arweave/IPFS link can call onError and fall back. Everything else about the
 * card stays a server component.
 *
 * A plain <img>, not next/image: the media hosts are unknown until ingestion
 * lands, so next.config.ts has no images.remotePatterns and next/image would
 * fail on every URL the indexer eventually returns. eslint.config.mjs carries
 * the same scoped no-img-element override this file needs as piggy-art.tsx.
 */

const IMG = "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105";
const MARK = "h-12 w-12 opacity-25 transition-transform duration-300 group-hover:scale-105";

export function NftImage({
  src,
  alt,
  eager = false,
}: {
  src: string | null;
  alt: string;
  eager?: boolean;
}) {
  const [dead, setDead] = useState(false);

  // A missing link and an un-ingested one look identical on purpose — neither
  // is the piggy's art, and neither should shift the layout.
  if (!src || dead) {
    return (
      <div aria-hidden="true" className="flex h-full w-full items-center justify-center">
        <PiggyMark className={MARK} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={640}
      height={640}
      draggable={false}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onError={() => setDead(true)}
      className={IMG}
    />
  );
}
