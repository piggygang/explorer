"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { number } from "@/lib/format";

/**
 * The shared "load more" machinery: one hook that owns an appended page list,
 * and one pager that renders the button and the status line.
 *
 * Extracted when the wallet grid became the third consumer. The browse grid
 * keeps its own inlined copy on purpose — it also drives an IntersectionObserver
 * and an auto-load ceiling, and folding those in here would make every caller
 * pay for machinery only one of them wants.
 *
 * Page one is always server-rendered and handed to the island as `children`, so
 * every list is complete and indexable with no JavaScript at all; this only ever
 * appends what comes after it. That is also why no cursor reaches the URL: it is
 * opaque, valid only for the filter set that issued it, and the contract says it
 * is "not guaranteed stable across deploys".
 *
 * NO IntersectionObserver here. Auto-loading is only free at the end of a
 * document; every consumer of this module has content underneath it that pages
 * arriving on scroll would shove down mid-read. The button is the whole control.
 */

const PAGER = "mt-3 flex flex-col items-center gap-2";
const GHOST =
  "rounded-full border border-line px-3.5 py-2 text-xs text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent,var(--brand))] disabled:opacity-60";
const NOTE = "text-center text-[11px] text-ink-muted";

type Loaded<T> = { ok: true; data: T[]; nextCursor: string | null; hasMore: boolean };
type Failed = { ok: false; reason: "expired" | "failed" };

export function useFeed<T>({
  initialKeys,
  initialCursor,
  initialHasMore,
  keyOf,
  fetchMore,
}: {
  initialKeys: string[];
  initialCursor: string | null;
  initialHasMore: boolean;
  keyOf: (item: T) => string;
  fetchMore: (cursor: string) => Promise<Loaded<T> | Failed>;
}) {
  const [appended, setAppended] = useState<T[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(false);
  const [failed, setFailed] = useState(false);

  // Not state: mutated during a load and never rendered from, so a re-render
  // must not be able to reset it mid-flight.
  const seen = useRef(new Set(initialKeys));
  const status = useRef<HTMLParagraphElement>(null);
  /** Set on a press, so the focus move below never fires for anything else. */
  const pressed = useRef(false);

  const load = useCallback(async () => {
    if (pending || !hasMore || cursor === null || expired || failed) return;
    setPending(true);
    pressed.current = true;

    const page = await fetchMore(cursor);
    if (!page.ok) {
      if (page.reason === "expired") setExpired(true);
      else setFailed(true);
      setPending(false);
      return;
    }

    const fresh = page.data.filter((item) => !seen.current.has(keyOf(item)));
    for (const item of fresh) seen.current.add(keyOf(item));
    setAppended((current) => [...current, ...fresh]);
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
    setPending(false);
  }, [cursor, expired, failed, fetchMore, hasMore, keyOf, pending]);

  /**
   * The last page removes the button, and a button that disappears under the
   * reader's own keypress takes the focus ring to <body> with it. Focus moves to
   * the status line instead — the thing that just changed, and the thing the
   * aria-live region has already announced.
   */
  useEffect(() => {
    if (hasMore || !pressed.current) return;
    pressed.current = false;
    status.current?.focus();
  }, [hasMore]);

  return { appended, hasMore, pending, expired, failed, load, status };
}

export function Pager({
  shown,
  noun,
  label,
  total,
  hasMore,
  pending,
  expired,
  failed,
  onLoad,
  statusRef,
}: {
  shown: number;
  /** Plural noun for the status line: "Showing 24 events". */
  noun: string;
  /** Button copy. A timeline loads OLDER things; a grid just loads more. */
  label: string;
  /** Only some feeds have one — see the status line's comment. */
  total: number | null;
  hasMore: boolean;
  pending: boolean;
  expired: boolean;
  failed: boolean;
  onLoad: () => void;
  statusRef: React.RefObject<HTMLParagraphElement | null>;
}) {
  const router = useRouter();

  if (expired) {
    return (
      <div className={PAGER}>
        <button type="button" onClick={() => router.refresh()} className={GHOST}>
          Refresh
        </button>
        <p className={NOTE}>
          This list moved on while the page was open, so there is nowhere to carry on from.
          Everything already loaded is still here.
        </p>
      </div>
    );
  }

  return (
    <div className={PAGER}>
      {/* needs-js hides it for a reader who has none: page one is already
          complete for them, and appending is the one thing here that cannot
          work without the island. */}
      {hasMore && (
        <button type="button" onClick={onLoad} disabled={pending} className={`${GHOST} needs-js`}>
          {pending ? "Loading…" : label}
        </button>
      )}
      {/* aria-live so a screen reader hears the list grow; it is the only
          announcement of something that is otherwise purely visual.
          Keyset pagination has no cheap total, so most feeds pass null and the
          line just counts up. A wallet is the exception: WalletPortfolio
          carries totalCount, which is a real denominator. */}
      <p ref={statusRef} tabIndex={-1} aria-live="polite" className={NOTE}>
        {failed
          ? `Couldn’t load more ${noun}. It’s usually temporary — try again.`
          : total === null
            ? `Showing ${number(shown)} ${noun}`
            : `Showing ${number(shown)} of ${number(total)} ${noun}`}
      </p>
    </div>
  );
}
