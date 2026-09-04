/**
 * Off-site destinations. Marketplace slugs mirror ../website/lib/collections.ts
 * so the two apps send people to the same places.
 *
 * DressMe's editor understands `?look=<code>` and nothing else — there is no
 * per-mint deep link today — so "Dress this pig" opens that collection's
 * wardrobe rather than pretending to preload the piggy. The copy says so.
 */

const DRESSME = "https://dressme.piggygang.net";

const MAGIC_EDEN: Record<string, string> = {
  "piggy-sol-gang": "https://magiceden.io/marketplace/piggy_sol_gang",
  "piggy-girl-gang": "https://magiceden.io/marketplace/piggy_girl_gang",
  "piggy-gang": "https://magiceden.io/marketplace/pig_gang",
};

export const dressHref = (slug: string) => `${DRESSME}/dress/${slug}`;
export const marketplaceHref = (slug: string) => MAGIC_EDEN[slug] ?? null;
export const tensorHref = (mint: string) => `https://www.tensor.trade/item/${mint}`;
