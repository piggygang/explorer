import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GHOST_XS, solscan } from "@/components/address";
import { EmptyState } from "@/components/empty-state";
import { RememberSearch } from "@/components/search/remember-search";
import { SearchGroups, TopHits } from "@/components/search/search-results";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listCollections, search } from "@/lib/api/client";
import type { SearchResponse } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { MAX_QUERY_LENGTH } from "@/lib/api/params";
import { toDisplay, withComingSoon } from "@/lib/collections";
import { isSearchable, normalizeQuery, routeHref } from "@/lib/search";
import { SEARCH_COPY, SEARCH_SCOPE_NOTE } from "@/lib/search-rows";

/**
 * Global search, server-rendered: the header form's target, what a shared link
 * opens, and what a reader without JavaScript gets. It reads the same endpoint
 * and the same row builder as the palette, so the two cannot disagree about what
 * matched or where a hit goes.
 *
 * NO `export const revalidate`. Reading searchParams makes this route dynamic, so
 * a page-level revalidate would silently stop applying — the trap
 * app/collections/[slug]/page.tsx already documents. The 300s TTL rides on the
 * fetch inside search(), inert against the in-process mock and live the moment
 * API_BASE_URL is set.
 *
 * NO loading.tsx for this segment. The house rule is written about notFound(),
 * and this page cannot call one: /v1/search declares 200, 304, 400, 429 and 500,
 * and its description rules a 404 out in prose. But the rule's REASON binds
 * harder than its letter — a loading.tsx opens a Suspense boundary above the
 * page, Next streams the shell with a 200, and after that the page can set
 * neither a status nor a Location. redirect() sits in exactly the position
 * notFound() was in when this repo verified /nfts/nope returned 200 with a
 * loading.tsx and 404 without. There is also nothing to stream behind it: the
 * search response is what decides the redirect.
 *
 * NO error.tsx either. Every failure is caught here and rendered with the form
 * still on screen — browse-results.tsx's local-catch reasoning one step further.
 * On a search page the form IS the recovery, and a route boundary would replace
 * it with a Try again button that re-runs the identical failing query.
 */

const SECTION = "mx-auto w-full max-w-6xl px-5 pt-14 pb-16";
const FIELD =
  "w-full rounded-full border border-line bg-surface px-4 py-3 text-base placeholder:text-ink-muted transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const NOTE = "mt-8 text-sm text-ink-muted";

/** One slice, used for the heading, the field and the title — `maxLength` caps
    typing, not a defaultValue, so a 5 KB `q` would otherwise reach all three. */
const shown = (query: string) => query.slice(0, MAX_QUERY_LENGTH);

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const query = shown(normalizeQuery((await props.searchParams).q));
  return {
    title: query === "" ? "Search" : `Search: ${query}`,
    // A results page for an arbitrary reader-supplied string is not a page worth
    // indexing, and the crawl budget belongs on the collections — the same
    // reasoning app/wallet/[address]/page.tsx states for a portfolio. `follow`
    // stays on so the piggies linked from here are still discovered.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const searchParams = await props.searchParams;
  const query = normalizeQuery(searchParams.q);
  const label = shown(query);

  const [all, answer] = await Promise.all([
    listCollections(),
    // Empty and over-length are the reader's own input, not a round trip: the
    // contract would answer 400 for both.
    isSearchable(query)
      ? search(query)
          .then((result): { ok: true; result: SearchResponse } => ({ ok: true, result }))
          .catch((error: unknown) => ({
            ok: false as const,
            limited: error instanceof ApiError && error.status === 429,
          }))
      : null,
  ]);
  const collections = withComingSoon(all.map(toDisplay));

  const result = answer !== null && answer.ok ? answer.result : null;
  const route = result?.route ?? null;
  const href = route === null ? null : routeHref(route);

  /**
   * Redirect only when the response carries nothing else renderable. That is what
   * satisfies "pasting a mint lands on the right NFT" with JavaScript switched
   * off — and with groups present there are real matches the server already paid
   * for, so the page shows the hit above them instead of discarding them.
   *
   * A collection route is checked against the site's own list first: routeHref
   * validates the SHAPE of a slug, not that anything is behind it, and
   * app/collections/[slug]/page.tsx calls notFound() for an unknown one. A 200
   * from search must never turn into a 404.
   */
  if (route !== null && href !== null && result !== null && result.groups.length === 0) {
    const known =
      route.kind !== "collection" ||
      collections.some((collection) => collection.slug === route.id);
    if (known) redirect(href);
  }

  const failed = answer !== null && !answer.ok;
  const empty =
    query === ""
      ? SEARCH_COPY.idle
      : !isSearchable(query)
        ? SEARCH_COPY.tooLong
        : failed
          ? answer.limited
            ? SEARCH_COPY.rateLimited
            : SEARCH_COPY.failed
          : result !== null && result.groups.length === 0 && route === null && result.wallet === null
            ? result.interpretedAs === "address"
              ? SEARCH_COPY.unknownAddress
              : SEARCH_COPY.noMatch
            : null;

  return (
    <>
      <SiteHeader collections={collections} />

      <main className="flex-1">
        <section className={SECTION}>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {label === "" ? (
              "Search"
            ) : (
              <>
                Results for <span className="text-brand">“{label}”</span>
              </>
            )}
          </h1>

          {/* A second role="search" landmark on this page, so it needs a name of
              its own — the header's is "Search all collections". It is a plain
              GET form: the whole point of this page is that it works with no
              JavaScript at all. */}
          <form
            action="/search"
            role="search"
            aria-label="Search again"
            className="mt-6 max-w-xl"
          >
            <label htmlFor="search-page-input" className="sr-only">
              Search piggies
            </label>
            <input
              id="search-page-input"
              type="search"
              name="q"
              defaultValue={label}
              placeholder="Name, #number, mint or wallet…"
              maxLength={MAX_QUERY_LENGTH}
              enterKeyHint="search"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className={FIELD}
            />
          </form>

          {/* A route with an id that does not fit its kind. Saying "nothing
              indexed" here would be a false claim about a response that carried a
              hit, so the raw id goes out to the chain explorer instead. */}
          {route !== null && href === null && (
            <div className="mt-8">
              <EmptyState
                title="That result points somewhere this app can’t open"
                body={`The indexer matched “${label}” but answered with an identifier this app cannot turn into a page. Solscan can still show you what is behind it.`}
                action={
                  <a
                    href={solscan.account(route.id)}
                    target="_blank"
                    rel="noreferrer"
                    className={`${GHOST_XS} mt-4 inline-flex`}
                  >
                    Open on Solscan ↗
                  </a>
                }
              />
            </div>
          )}

          {empty !== null ? (
            <div className="mt-8">
              <EmptyState
                title={empty.title}
                body={empty.body}
                action={
                  query === "" ? (
                    <Link href="/#collections" className={`${GHOST_XS} mt-4 inline-flex`}>
                      Browse the collections
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            result !== null && (
              <>
                <div className="mt-8 flex flex-col gap-12">
                  <TopHits result={result} collections={collections} />
                  <SearchGroups result={result} query={label} />
                </div>
                {/* The same sentence the palette shows when nothing matches. It
                    belongs under a full result list too: a reader looking at ten
                    cards and wondering why their eleventh guess found nothing is
                    owed the scope, not just the reader who saw zero. */}
                <p className={NOTE}>{SEARCH_SCOPE_NOTE}</p>
              </>
            )
          )}
        </section>
      </main>

      {/* Only for a query the server actually answered — an over-length or failed
          search is not something to offer the reader again from their history. */}
      {result !== null && <RememberSearch query={label} />}

      <SiteFooter />
    </>
  );
}
