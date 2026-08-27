import type { components } from "@/lib/api/schema";

/**
 * Hand-authored presentation for the indexed collections, keyed by API slug.
 * Accents and taglines are deliberately not in the indexer API — they are
 * this site's styling. Values mirror dressme's lib/collections.ts so the two
 * apps stay visually consistent.
 */
export type CollectionPresentation = {
  tagline: string;
  accent: string;
  /**
   * Card portrait: DressMe hero looks as ordered paint stacks, bottom first,
   * mirrored from ../website/lib/collections.ts (assets in public/piggy).
   * Do not reorder a stack: the derived body-head and ear layers interleave
   * around clothes, hair and hats. Background layers are omitted so the art
   * sits transparent on the card surface.
   */
  layers: string[];
};

const PRESENTATION: Record<string, CollectionPresentation> = {
  "piggy-sol-gang": {
    tagline: "Ten thousand piggies, straight off the chain.",
    accent: "#9945ff",
    layers: [
      "/piggy/piggy-sol-gang/thumb/body/solana.png",
      "/piggy/piggy-sol-gang/thumb/clothes/solana-tee.png",
      "/piggy/piggy-sol-gang/thumb/body-right-ear/solana.png",
      "/piggy/piggy-sol-gang/thumb/body-head/solana.png",
      "/piggy/piggy-sol-gang/thumb/head/propeller-hat.png",
      "/piggy/piggy-sol-gang/thumb/body-left-ear/solana.png",
      "/piggy/piggy-sol-gang/thumb/eyes/focused.png",
      "/piggy/piggy-sol-gang/thumb/earring/red-diamond.png",
      "/piggy/piggy-sol-gang/thumb/mouth/golden-teeth.png",
    ],
  },
  "piggy-girl-gang": {
    tagline: "Pretty, fierce and dressed for it.",
    accent: "#ff8ec4",
    layers: [
      "/piggy/piggy-girl-gang/thumb/body/alien.png",
      "/piggy/piggy-girl-gang/thumb/clothes/solana-tshirt.png",
      "/piggy/piggy-girl-gang/thumb/body-right-ear/alien.png",
      "/piggy/piggy-girl-gang/thumb/body-head/alien.png",
      "/piggy/piggy-girl-gang/thumb/hair/yellow-hair.png",
      "/piggy/piggy-girl-gang/thumb/hats/green-hat.png",
      "/piggy/piggy-girl-gang/thumb/body-left-ear/alien.png",
      "/piggy/piggy-girl-gang/thumb/eyes/hypnotize.png",
      "/piggy/piggy-girl-gang/thumb/earring/diamond.png",
      "/piggy/piggy-girl-gang/thumb/mouth/braces.png",
    ],
  },
  "piggy-gang": {
    tagline: "Same ten thousand piggies. Meaner art.",
    accent: "#3ddad7",
    layers: [
      "/piggy/piggy-gang/thumb/body/solana.png",
      "/piggy/piggy-gang/thumb/clothes/solana-tee.png",
      "/piggy/piggy-gang/thumb/head/propeller-hat.png",
      "/piggy/piggy-gang/thumb/eyes/focused.png",
      "/piggy/piggy-gang/thumb/earring/pink-diamond.png",
      "/piggy/piggy-gang/thumb/mouth/golden-teeth.png",
    ],
  },
};

/** A collection the API knows but this map does not still gets the site's
    brand accent rather than an unstyled card. */
const FALLBACK: CollectionPresentation = {
  tagline: "",
  accent: "#ff5fa2",
  layers: [],
};

export function presentation(slug: string): CollectionPresentation {
  return PRESENTATION[slug] ?? FALLBACK;
}

/** The shape the site chrome needs to render a collection link. */
export type CollectionNavItem = {
  slug: string;
  name: string;
  accent: string;
};

/** API data merged with presentation — what cards and pages render. */
export type CollectionDisplay = CollectionNavItem & {
  tagline: string;
  layers: string[];
  supply: number;
  holders: number;
};

export function toDisplay(
  collection: components["schemas"]["CollectionWithStats"],
): CollectionDisplay {
  const { tagline, accent, layers } = presentation(collection.slug);
  return {
    slug: collection.slug,
    name: collection.name,
    accent,
    tagline,
    layers,
    supply: collection.stats.supply,
    holders: collection.stats.holders,
  };
}
