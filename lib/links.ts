/**
 * Off-site destinations.
 *
 * Magic Eden and Tensor are both addressed by mint, so neither needs a
 * per-collection entry and neither can be wrong for a collection nobody thought
 * to add. Verified in a browser against both standards — curl only ever sees
 * Cloudflare here, so it cannot check these: `/item-details/<mint>` renders
 * "#1 | Piggy Sol Gang" for token_metadata and "#2 | Piggy Gang" for the Core
 * collection, and Tensor's `/item/<mint>` does the same.
 *
 * DressMe is the exception and stays per-collection: its editor understands
 * `/dress/<collection>` and `?look=<code>`, and there is no per-mint deep link
 * today — so "Dress a piggy" opens that collection's wardrobe rather than
 * pretending to preload the piggy, and the copy says so. It also only knows
 * three collections; `dress/pig-mud` is a verified 404, so the allowlist is what
 * stops a fourth collection shipping a broken link.
 */

const DRESSME = "https://dressme.piggygang.net";

/** Mirrors ../dressme/lib/collections.ts, which is the source of truth. */
const DRESSABLE = new Set(["piggy-sol-gang", "piggy-girl-gang", "piggy-gang"]);

export const dressHref = (slug: string) =>
  DRESSABLE.has(slug) ? `${DRESSME}/dress/${slug}` : null;
export const magicEdenHref = (mint: string) => `https://magiceden.io/item-details/${mint}`;
export const tensorHref = (mint: string) => `https://www.tensor.trade/item/${mint}`;
