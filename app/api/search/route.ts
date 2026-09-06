import { ApiError, search } from "@/lib/api/client";
import { MAX_QUERY_LENGTH } from "@/lib/api/params";
import { PALETTE_LIMIT, normalizeQuery } from "@/lib/search";
import type { PaletteAnswer } from "@/lib/search";

/**
 * The palette's read, as a Route Handler rather than a Server Function.
 *
 * lib/api/actions.ts argues — correctly, for load-more — that a Server Function
 * adds no public JSON surface mirroring the indexer's contract. That cannot be
 * the answer here. Next dispatches Server Functions ONE AT A TIME per client
 * (docs/01-app/02-guides/server-actions.md: "If a user triggers three actions in
 * quick succession, the second waits for the first to finish"), and the same
 * docs say outright to use a Route Handler for non-mutation requests. A palette
 * that fires per settled keystroke would head-of-line block, so a pasted mint
 * queued behind a slow prefix query would land LATER than with no optimisation
 * at all — defeating the exact criterion this feature is measured on. It also
 * makes AbortController real, so a stale query is cancelled rather than merely
 * discarded on arrival.
 *
 * It is not a proxy of /v1/search and must never become one: it accepts `q` and
 * nothing else, fixes `limit` server-side, exposes neither `collection` nor a
 * cursor, and answers a shape of its own. API_BASE_URL stays server-side, and
 * the palette keeps NO import edge to lib/api/client.ts — only a fetch.
 */

// Reading the query string makes this dynamic anyway; say so explicitly, the
// way app/api/mock/v1/[...path]/route.ts does.
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const query = normalizeQuery(new URL(request.url).searchParams.get("q") ?? undefined);

  // Answered here rather than spent on a round trip the contract would 400.
  if (query.length === 0) return answer({ ok: false, reason: "empty" });
  if (query.length > MAX_QUERY_LENGTH) return answer({ ok: false, reason: "too-long" });

  try {
    return answer({ ok: true, result: await search(query, { limit: PALETTE_LIMIT }) });
  } catch (error) {
    // The same split components/error-note.tsx makes: a 429 is something the
    // reader can act on, everything else is a promise that the next attempt may
    // work. The ApiError itself never crosses — a code and a status are all the
    // island needs, and shipping the message would leak the indexer's prose.
    if (error instanceof ApiError && error.status === 429) {
      return answer({ ok: false, reason: "rate-limited" });
    }
    return answer({ ok: false, reason: "failed" });
  }
}

/**
 * Always 200. The status carries whether the HANDLER worked; whether the SEARCH
 * worked is in the body, so the island parses one shape instead of branching on
 * a status it would have to keep in step with the indexer's.
 *
 * no-store because the palette is typed-through: a settled query is worth one
 * request, and the 300s TTL that matters already rides on the upstream fetch
 * inside search() once API_BASE_URL is set.
 */
function answer(body: PaletteAnswer): Response {
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
