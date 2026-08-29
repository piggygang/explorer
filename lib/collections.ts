import type { components } from "@/lib/api/schema";

/**
 * Hand-authored presentation for the collections, keyed by API slug.
 * Accents, taglines and card art are deliberately not in the indexer API —
 * they are this site's styling. Taglines and card art mirror
 * ../website/lib/collections.ts; accents mirror dressme's lib/collections.ts
 * (website lightens the SOL purple to #a866ff for AA contrast on its text-sm
 * accent label — not yet reconciled here) so the apps stay visually consistent.
 */

export type Artwork =
  /** DressMe trait layers, stacked in paint order by components/piggy-art.tsx. */
  | { kind: "layers"; layers: string[] }
  /** One opaque cover image. */
  | { kind: "image"; src: string };

export type CollectionPresentation = {
  tagline: string;
  accent: string;
  /**
   * Card portrait (assets in public/piggy). A layer stack is a DressMe hero
   * look, bottom first — do not reorder it: the derived body-head and ear
   * layers interleave around clothes, hair and hats, and background layers
   * are omitted so the art sits transparent on the card surface. null =
   * nothing authored; the card falls back to the brand mark.
   */
  art: Artwork | null;
};

const PRESENTATION = {
  "piggy-sol-gang": {
    tagline: "Ten thousand piggies, straight off the chain.",
    accent: "#9945ff",
    art: { kind: "image", src: "/piggy/covers/piggy-sol-gang.png" },
  },
  "piggy-girl-gang": {
    tagline: "Pretty, fierce and dressed for it.",
    accent: "#ff8ec4",
    art: { kind: "image", src: "/piggy/covers/piggy-girl-gang.png" },
  },
  "piggy-gang": {
    tagline: "Same ten thousand piggies. Meaner art.",
    accent: "#3ddad7",
    art: {
      kind: "layers",
      layers: [
        "/piggy/piggy-gang/thumb/body/solana.png",
        "/piggy/piggy-gang/thumb/clothes/solana-tee.png",
        "/piggy/piggy-gang/thumb/head/propeller-hat.png",
        "/piggy/piggy-gang/thumb/eyes/focused.png",
        "/piggy/piggy-gang/thumb/earring/pink-diamond.png",
        "/piggy/piggy-gang/thumb/mouth/golden-teeth.png",
      ],
    },
  },
  "pig-mud": {
    // Coming-soon placeholder copy — rewrite the tagline the day the
    // collection goes live (see ANNOUNCED).
    tagline: "Something’s coming.",
    // Unused while inert; mud-toned for when the collection goes live.
    accent: "#d9a066",
    art: { kind: "image", src: "/piggy/covers/pig-mud.png" },
  },
} satisfies Record<string, CollectionPresentation>;

/**
 * Announced collections the indexer does not know yet: there is no API row,
 * so the name is authored here too, and each renders as an inert "coming
 * soon" card and header pill. Delete an entry (and re-author its
 * PRESENTATION tagline) once the API starts returning the slug — until then
 * withComingSoon() appends it after the live collections.
 */
const ANNOUNCED: { slug: keyof typeof PRESENTATION; name: string }[] = [
  { slug: "pig-mud", name: "Pig Mud" },
];

/** A collection the API knows but this map does not still gets the site's
    brand accent rather than an unstyled card. */
const FALLBACK: CollectionPresentation = {
  tagline: "",
  accent: "#ff5fa2",
  art: null,
};

export function presentation(slug: string): CollectionPresentation {
  const table: Record<string, CollectionPresentation> = PRESENTATION;
  return table[slug] ?? FALLBACK;
}

export type CollectionStatus = "live" | "coming-soon";

/** The shape the site chrome needs to render a collection pill. */
export type CollectionNavItem = {
  slug: string;
  name: string;
  accent: string;
  status: CollectionStatus;
};

type CollectionBase = CollectionNavItem & {
  tagline: string;
  art: Artwork | null;
};

/** API data merged with presentation — what cards and pages render. */
export type LiveCollection = CollectionBase & {
  status: "live";
  supply: number;
  holders: number;
};

/** Announced, not indexed: presentation only, nothing to browse. */
export type ComingSoonCollection = CollectionBase & { status: "coming-soon" };

export type CollectionDisplay = LiveCollection | ComingSoonCollection;

export function toDisplay(
  collection: components["schemas"]["CollectionWithStats"],
): LiveCollection {
  const { tagline, accent, art } = presentation(collection.slug);
  return {
    status: "live",
    slug: collection.slug,
    name: collection.name,
    accent,
    tagline,
    art,
    supply: collection.stats.supply,
    holders: collection.stats.holders,
  };
}

/**
 * The live API collections followed by the announced ones the API has not
 * started indexing. An announced slug the API returns is live and the API
 * row wins, so the day the indexer ships a collection nothing duplicates or
 * breaks — only the placeholder copy in PRESENTATION wants rewriting.
 */
export function withComingSoon(live: LiveCollection[]): CollectionDisplay[] {
  const indexed = new Set(live.map((collection) => collection.slug));
  const announced = ANNOUNCED.filter((collection) => !indexed.has(collection.slug)).map(
    (collection): ComingSoonCollection => ({
      status: "coming-soon",
      ...collection,
      ...presentation(collection.slug),
    }),
  );
  return [...live, ...announced];
}
