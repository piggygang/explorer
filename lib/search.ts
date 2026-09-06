import type { components } from "@/lib/api/schema";
import { MAX_QUERY_LENGTH } from "@/lib/api/params";

/**
 * The search vocabulary: what a query is, where a result goes, and the palette's
 * own constants.
 *
 * ZERO RUNTIME IMPORTS, deliberately — the same role lib/api/params.ts plays for
 * the browse parameters and lib/browse-layout.ts for the browse geometry. The
 * palette is a client island, and lib/api/client.ts has a RUNTIME
 * `import { dispatchMock }` that reaches handlers.ts and the whole fixture array;
 * one import edge from the island to that module would ship 437 KB of piggies to
 * the browser, and neither tsc nor eslint would say a word. So anything both
 * graphs need lives here, and `components` above is an `import type` that erases.
 */

type SearchRoute = components["schemas"]["SearchRoute"];
type SearchResponse = components["schemas"]["SearchResponse"];

/**
 * components/schemas/Address's own pattern. Base58 excludes 0, O, I and l.
 *
 * Deliberately a fourth copy: app/wallet/[address]/page.tsx and lib/api/actions.ts
 * keep theirs, and the mock keeps its own. Sharing them would make a "use server"
 * module import a module named for search, so a future edit here would silently
 * change load-more validation. These are four quotations of two immutable contract
 * patterns, each commenting the schema it quotes — not four vocabularies.
 */
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** components/parameters/CollectionSlug's pattern. */
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The header form's id — what the palette's delegated listeners match on.
    The components/browse/browse-toolbar.tsx FILTER_TRIGGER_ID pattern, except
    that this one has to cross the RSC boundary, so it lives here. */
export const SEARCH_TRIGGER_ID = "site-search";

/** The palette's listbox, named once so the combobox's aria-controls and the
    list's id cannot drift. */
export const PALETTE_LISTBOX_ID = "search-palette-results";

/** One option's DOM id, for aria-activedescendant. Positional on purpose: it
    addresses a SLOT in the rendered list, not an entity — the entity-stable id
    is SearchRow.id, which is the React key. */
export const paletteOptionId = (index: number) => `search-option-${index}`;

/** Five per collection group. The palette is a preview whose whole job is to be
    scannable without scrolling; deep results are /search and the browse page. */
export const PALETTE_LIMIT = 5;

/** Long enough that a fast typist sends one request per word rather than per
    letter, short enough not to read as lag. A pasted address skips it entirely. */
export const PALETTE_DEBOUNCE_MS = 180;

/** What the Route Handler answers. It lives here rather than in the route module
    so the island imports a plain type from a plain module — no import edge from a
    Client Component into an app/api route. */
export type PaletteAnswer =
  | { ok: true; result: SearchResponse }
  /**
   * `rate-limited` is split out because the reader can act on it, the same split
   * components/error-note.tsx makes. `too-long` and `empty` are the reader's own
   * input rather than a failure, and `failed` is everything else.
   */
  | { ok: false; reason: "empty" | "too-long" | "rate-limited" | "failed" };

/** First value, trimmed. `?q=` and `?q=%20%20` both normalize to "". */
export function normalizeQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ?? "";
}

/** Whether a query is one the contract would accept: minLength 1, maxLength 64. */
export function isSearchable(query: string): boolean {
  return query.length >= 1 && query.length <= MAX_QUERY_LENGTH;
}

export const searchHref = (q: string) => `/search?${new URLSearchParams({ q })}`;
export const nftHref = (address: string) => `/nfts/${address}`;
export const walletHref = (address: string) => `/wallet/${address}`;
export const collectionHref = (slug: string) => `/collections/${slug}`;

/**
 * The ONLY place SearchRoute.id becomes a path.
 *
 * Two validators, keyed on kind, because the id is not one shape: the schema says
 * it is "an address for `nft` and `wallet`, a slug for `collection`". One lowercase
 * slug test over all three would reject every real mint and wallet, since base58
 * addresses carry uppercase.
 *
 * It returns null rather than throwing when the id does not fit its kind. The
 * server is not this app's, `id` carries no pattern in the schema, and a route
 * that cannot be followed is a state the surfaces render rather than a crash —
 * /search shows the raw id as a Solscan link instead of claiming nothing matched.
 */
export function routeHref(route: SearchRoute): string | null {
  switch (route.kind) {
    case "nft":
      return BASE58.test(route.id) ? nftHref(route.id) : null;
    case "wallet":
      return BASE58.test(route.id) ? walletHref(route.id) : null;
    case "collection":
      return SLUG.test(route.id) && route.id.length <= 64 ? collectionHref(route.id) : null;
    default:
      // The enum is closed today; a widened one arrives as a no-op rather than a
      // navigation to a path this app invented.
      return null;
  }
}

/**
 * The reader's own last few searches, on their own device.
 *
 * This is the first client-side persistence in this repo. The QUERY is stored and
 * the destination is not: a destination goes stale (a piggy is burned, a wallet
 * empties) while a query re-resolves against fresh data, and storing "wallet X"
 * would write a fact about someone's holdings onto this reader's disk where the
 * query is only what they typed.
 *
 * EVERY access is inside try/catch, including the existence check — with site
 * data blocked, touching localStorage itself throws SecurityError rather than
 * returning undefined, and in Safari private mode getItem works while setItem
 * throws QuotaExceededError. Both failures are silent and leave the palette with
 * no history, which is degraded but correct; this repo does not ship a control
 * that announces its own storage failure.
 *
 * Anything on this origin can write the key, so a read VALIDATES rather than
 * trusting: an array of strings, each within the contract's own length bounds,
 * capped at RECENT_LIMIT. Values are only ever rendered as text and used as a `q`.
 */
export const RECENT_KEY = "piggy:recent-searches";
export const RECENT_LIMIT = 6;

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string" && isSearchable(value))
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

/** Records a query and returns the new list, so a caller never has to read back. */
export function rememberSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!isSearchable(trimmed)) return readRecent();
  // Case-insensitive de-duplication, but the casing the reader last typed wins:
  // "DemoWa11et…" and "demowa11et…" are one entry, and it is the one that works.
  const rest = readRecent().filter((value) => value.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...rest].slice(0, RECENT_LIMIT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage refused. The list is still correct for this session.
  }
  return next;
}

export function clearRecent(): string[] {
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {
    // Nothing to do — the caller renders an empty list either way.
  }
  return [];
}
