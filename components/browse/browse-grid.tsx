"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NFT_GRID, NftCard } from "@/components/nft-card";
import { loadMoreCollectionNfts } from "@/lib/api/actions";
import type { NftSummary } from "@/lib/api/client";
import type { TraitSelection } from "@/lib/api/params";
import { number } from "@/lib/format";

/**
 * The browse grid's second island (the filter sheet is the first).
 *
 * Page one is server-rendered and arrives as `children`, so the grid is
 * complete and indexable with no JavaScript at all; this only appends what
 * comes after it. That is also why the cursor is not in the URL: it is opaque,
 * it is valid only for the sort and filter set that issued it, and the contract
 * says it is "not guaranteed stable across deploys" — a shareable link must not
 * carry one.
 *
 * De-duplication by address is REQUIRED, not defensive. Under `sort=-activity`
 * the sort key moves: the contract states that an asset receiving an event
 * "jumps above your cursor, so this sort can skip rows and can never duplicate
 * them. Infinite scroll must de-duplicate by `address`." Skipped rows are the
 * cost of a live feed; the same pig twice would be a bug.
 */

const SENTINEL = "h-px w-full";
const PAGER = "mx-auto w-full max-w-6xl px-5 pt-6 pb-16 text-center";
const GHOST =
  "rounded-full border border-line px-6 py-3 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-default disabled:opacity-60";
const NOTE = "mt-2 text-[11px] text-ink-muted";

/**
 * How many pages load on scroll alone before the reader has to ask. Unbounded
 * auto-loading turns a flick of the thumb into a thousand mounted cards, which
 * is the one thing that would cost the 60fps this page is measured on. After
 * the ceiling the button stays, and pressing it re-arms the observer.
 *
 * Three, so the ceiling is reachable in the committed fixtures (120 assets is
 * page one plus four appends) — a limit nobody can hit in review is a limit
 * nobody has seen work. It is 96 cards of scrolling before the first ask.
 */
const AUTO_BATCHES = 3;

export function BrowseGrid({
  slug,
  sort,
  q,
  trait,
  initialAddresses,
  initialCursor,
  initialHasMore,
  total,
  children,
}: {
  slug: string;
  sort?: string;
  q?: string;
  trait: TraitSelection;
  /** Page one's addresses, so an appended page cannot repeat one of them. */
  initialAddresses: string[];
  initialCursor: string | null;
  initialHasMore: boolean;
  /** The filtered result count, when the facets call supplied one. */
  total: number | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [appended, setAppended] = useState<NftSummary[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(false);
  const [failed, setFailed] = useState(false);
  const [autoUsed, setAutoUsed] = useState(0);

  // Not state: mutated during a load and never rendered from, so a re-render
  // must not be able to reset it mid-flight.
  const seen = useRef(new Set(initialAddresses));
  const sentinel = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  /** Whether the load in flight came from the button rather than the observer. */
  const pressed = useRef(false);

  const shown = initialAddresses.length + appended.length;
  const autoArmed = autoUsed < AUTO_BATCHES;

  const load = useCallback(
    async (auto: boolean) => {
      if (pending || !hasMore || cursor === null || expired || failed) return;
      setPending(true);
      if (auto) {
        setAutoUsed((used) => used + 1);
      } else {
        setAutoUsed(0); // An explicit press re-arms the scroll trigger.
        pressed.current = true;
      }

      const page = await loadMoreCollectionNfts({ slug, sort, q, trait, cursor });
      if (!page.ok) {
        if (page.reason === "expired") setExpired(true);
        else setFailed(true);
        setPending(false);
        return;
      }

      const fresh = page.data.filter((nft) => !seen.current.has(nft.address));
      for (const nft of fresh) seen.current.add(nft.address);
      setAppended((current) => [...current, ...fresh]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setPending(false);
    },
    [cursor, expired, failed, hasMore, pending, q, slug, sort, trait],
  );

  // The observer reads the CURRENT load through a ref rather than closing over
  // it. `load` changes identity on every state change it depends on — `pending`
  // most often — and depending on it here would tear the observer down and
  // rebuild it mid-scroll. An IntersectionObserver delivers its callbacks
  // asynchronously, so one in flight across that gap is silently dropped, and
  // the grid stops growing until the reader presses the button.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  /**
   * The last page removes the button, and a button that disappears under the
   * reader's own keypress takes the focus ring to <body> with it. Focus moves to
   * the status line instead — the thing that just changed, and the thing the
   * aria-live region has already announced. Only after a real press: the
   * observer firing must never steal focus from wherever the reader is.
   */
  useEffect(() => {
    if (hasMore || !pressed.current) return;
    pressed.current = false;
    status.current?.focus();
  }, [hasMore]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || !autoArmed || expired || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadRef.current(true);
      },
      // Start the next page while the reader is still most of a screen away
      // from the end, so the grid grows underneath them rather than after a
      // visible pause at the bottom.
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [autoArmed, expired, failed, hasMore]);

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-5 pt-6">
        <ul className={NFT_GRID}>
          {children}
          {appended.map((nft) => (
            <li key={nft.address} className="flex">
              <NftCard nft={nft} />
            </li>
          ))}
        </ul>
      </div>

      <div className={PAGER}>
        {/* The observer target sits above the button so the button is never the
            thing that triggers itself. */}
        <div ref={sentinel} aria-hidden="true" className={SENTINEL} />

        {expired ? (
          <>
            <button type="button" onClick={() => router.refresh()} className={GHOST}>
              Refresh the grid
            </button>
            <p className={NOTE}>
              The list changed underneath this page, so there is nowhere to carry on from.
              Everything already loaded is still here.
            </p>
          </>
        ) : (
          <>
            {/* needs-js hides it for a reader who has none: page one is
                already complete for them, and appending is the one thing here
                that cannot work without the island. */}
            {hasMore && (
              <button
                type="button"
                onClick={() => void load(false)}
                disabled={pending}
                className={`${GHOST} needs-js`}
              >
                {pending ? "Loading…" : "Show more"}
              </button>
            )}
            {/* aria-live so a screen reader hears the grid grow; it is the only
                announcement of something that is otherwise purely visual. */}
            <p ref={status} tabIndex={-1} aria-live="polite" className={NOTE}>
              {failed
                ? "Couldn’t load more piggies. It’s usually temporary — try again."
                : total === null
                  ? `Showing ${number(shown)}`
                  : `Showing ${number(shown)} of ${number(total)}`}
            </p>
          </>
        )}
      </div>
    </>
  );
}
