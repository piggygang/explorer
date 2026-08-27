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
};

const PRESENTATION: Record<string, CollectionPresentation> = {
  "piggy-sol-gang": {
    tagline: "Ten thousand piggies, straight off the chain.",
    accent: "#9945ff",
  },
  "piggy-girl-gang": {
    tagline: "Pretty, fierce and dressed for it.",
    accent: "#ff8ec4",
  },
  "piggy-gang": {
    tagline: "Same ten thousand piggies. Meaner art.",
    accent: "#3ddad7",
  },
};

/** A collection the API knows but this map does not still gets the site's
    brand accent rather than an unstyled card. */
const FALLBACK: CollectionPresentation = {
  tagline: "",
  accent: "#ff5fa2",
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
  supply: number;
  holders: number;
};

export function toDisplay(
  collection: components["schemas"]["CollectionWithStats"],
): CollectionDisplay {
  const { tagline, accent } = presentation(collection.slug);
  return {
    slug: collection.slug,
    name: collection.name,
    accent,
    tagline,
    supply: collection.stats.supply,
    holders: collection.stats.holders,
  };
}
