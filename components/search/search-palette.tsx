"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ResultRow } from "@/components/search/result-row";
import { SearchRowsSkeleton } from "@/components/skeleton";
import type { CollectionNavItem } from "@/lib/collections";
import { number } from "@/lib/format";
import {
  BASE58,
  PALETTE_DEBOUNCE_MS,
  PALETTE_LISTBOX_ID,
  RECENT_LIMIT,
  SEARCH_TRIGGER_ID,
  clearRecent,
  isSearchable,
  paletteOptionId,
  readRecent,
  rememberSearch,
  routeHref,
  searchHref,
} from "@/lib/search";
import type { PaletteAnswer } from "@/lib/search";
import { SEARCH_COPY, flatten, paletteSections } from "@/lib/search-rows";
import type { SearchRow, SearchSection } from "@/lib/search-rows";

/**
 * The command palette: one box that understands what is pasted into it,
 * reachable from every page.
 *
 * MOUNT. components/site-header.tsx renders this as a SIBLING of <header>, so all
 * eleven chrome call sites get it without touching one of them — including the
 * error and not-found pages, which pass collections=[] because "an error page
 * must never depend on the API". There it still searches; it just lists no local
 * collection matches, which is the correct degradation.
 *
 * SHELL, from components/browse/filter-sheet.tsx. A native <dialog> for that
 * file's reasons: it renders in the top layer, so the codebase keeps exactly one
 * z-index (the header's), and it brings focus trapping and ::backdrop with it.
 *
 * EVERY CLOSE TAKES ONE PATH — set `open` false, let the effect call close(). The
 * ✕, the backdrop and Escape all go through it, which is why onCancel is
 * intercepted here just as it is there. The alternative (let the browser close on
 * Escape and resync from onClose) desyncs on the one path that matters: the
 * document keydown listener opens with `if (open) return`, so a stale `true`
 * makes the palette unreopenable for the rest of the session.
 *
 * It does NOT restore focus by hand. FilterSheet has to, because closing it is a
 * navigation; here dialog.close() restores focus to whatever had it natively.
 *
 * NO SERVER FUNCTION. Reads go through app/api/search/route.ts, because Next
 * dispatches Server Functions one at a time per client — a pasted mint queued
 * behind a slow prefix query would land later than with no optimisation at all.
 * That handler is also why this module holds no import edge to lib/api/client.ts,
 * whose runtime import of the mock dispatcher would ship every fixture here.
 *
 * NO setState IN AN EFFECT. `pending` is set by the change handler, recents are
 * read when the palette opens, and the only writes an effect makes are
 * asynchronous — inside a debounce timer or a settled fetch.
 */

const DIALOG =
  "m-auto h-dvh w-full max-w-none rounded-none border-line bg-surface p-0 text-ink backdrop:bg-canvas/70 sm:mt-[12vh] sm:mb-auto sm:h-auto sm:max-h-[min(32rem,calc(100dvh-16vh))] sm:w-[min(38rem,calc(100vw-2rem))] sm:rounded-card sm:border";
const HEAD = "flex shrink-0 items-center gap-2 border-b border-line p-3";
const FIELD =
  "w-full rounded-full border border-line bg-surface-raised px-3.5 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const CLOSE =
  "shrink-0 rounded-full px-2.5 py-2 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const BODY = "min-h-0 flex-1 overflow-y-auto p-2";
const GROUP_HEAD = "flex items-baseline justify-between gap-2 px-2.5 pt-3 pb-1";
const GROUP_NAME = "text-xs font-medium tracking-[0.14em] text-ink-muted uppercase";
const GROUP_COUNT = "font-mono text-[11px] text-ink-muted";
const FOOT =
  "flex shrink-0 items-center justify-between gap-3 border-t border-line px-3 py-2 text-[11px] text-ink-muted";
const KBD = "rounded border border-line px-1 py-0.5 font-mono";
const GHOST =
  "rounded-full px-2 py-1 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const NOTE = "px-2.5 py-6 text-center";
const NOTE_TITLE = "text-sm font-medium";
const NOTE_BODY = "mx-auto mt-1.5 max-w-sm text-xs text-ink-muted text-pretty";
const ALERT = "text-brand";

/** Whether a keystroke belongs to something the reader is already typing in. */
function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function SearchPalette({ collections }: { collections: CollectionNavItem[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<PaletteAnswer | null>(null);
  const [pending, setPending] = useState(false);
  /** The arrowed-to row's flat index. null = nothing arrowed, so Enter follows
      the server's own opinion (`route`) instead of a row the reader never chose. */
  const [moved, setMoved] = useState<number | null>(null);
  const [recents, setRecents] = useState<string[]>([]);

  const trimmed = query.trim();

  // ------------------------------------------------------------------ opening

  const start = (seed: string) => {
    // Reading storage here rather than in an effect: this is an event handler, so
    // it cannot run during a server render, and it picks up a search recorded by
    // /search in another tab without a subscription.
    setRecents(readRecent());
    setQuery(seed);
    setAnswer(null);
    setPending(isSearchable(seed.trim()));
    setMoved(null);
    setOpen(true);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (open || event.defaultPrevented) return;
      // Never stack over another modal. At 375px the browse filter drawer is a
      // full-screen dialog, and two in the top layer is a trap with no way out.
      if (document.querySelector("dialog[open]") !== null) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        start("");
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // A printable key typed into the header's own form. This is what keeps the
      // palette ONE product: without it a mouse user who clicks the field gets the
      // palette and a keyboard user who tabs to it gets a plain GET form, and
      // nothing announces which one they are in. Tab-through is still not
      // hijacked — only actually typing opens it, seeded with that character.
      const field = document.getElementById(SEARCH_TRIGGER_ID);
      if (field !== null && event.target instanceof Node && field.contains(event.target)) {
        if (event.key.length === 1) {
          event.preventDefault();
          start(event.key);
        }
        return;
      }

      if (typing(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        start("");
      }
    };

    // mousedown, not click: it fires before focus moves, so the header input never
    // takes a caret the palette is about to steal.
    const onMouseDown = (event: MouseEvent) => {
      if (open || event.button !== 0) return;
      if (document.querySelector("dialog[open]") !== null) return;
      const field = document.getElementById(SEARCH_TRIGGER_ID);
      if (field === null || !(event.target instanceof Node) || !field.contains(event.target)) return;
      event.preventDefault();
      start("");
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  // Purely imperative — the dialog is told to open or close, nothing sets state
  // here. showModal() also moves focus into the dialog, which lands on the input.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // ------------------------------------------------------------------ reading

  useEffect(() => {
    if (!open || !isSearchable(trimmed)) return;
    const controller = new AbortController();
    // A pasted address skips the debounce outright. That fast path is the reason
    // this is a Route Handler: a queued Server Function could not be cancelled,
    // so the paste would wait behind whatever prefix query was already in flight.
    const delay = BASE58.test(trimmed) ? 0 : PALETTE_DEBOUNCE_MS;

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<PaletteAnswer>)
        .then((next) => {
          setAnswer(next);
          setPending(false);
        })
        .catch(() => {
          // An abort is the expected path for every keystroke but the last; it
          // must not paint a failure over results the reader can still see.
          if (controller.signal.aborted) return;
          setAnswer({ ok: false, reason: "failed" });
          setPending(false);
        });
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, trimmed]);

  // ------------------------------------------------------------------ derived

  const recentSection: SearchSection[] =
    trimmed === "" && recents.length > 0
      ? [
          {
            id: "recent",
            label: "Recent",
            slug: null,
            total: null,
            rows: recents.map((value) => ({
              kind: "recent" as const,
              id: `recent:${value}`,
              query: value,
            })),
          },
        ]
      : [];

  // Derived during render, never in an effect — the same rule
  // components/browse/value-search.tsx follows, and what keeps the announced
  // count and the rendered list from ever disagreeing.
  const sections =
    trimmed === ""
      ? recentSection
      : answer !== null && answer.ok
        ? paletteSections(answer.result, collections)
        : [];
  const rows = flatten(sections);
  const active = moved === null ? null : (rows[moved] ?? null);

  // ---------------------------------------------------------------- acting

  const close = () => setOpen(false);

  const go = (href: string, remember: string) => {
    rememberSearch(remember);
    close();
    router.push(href);
  };

  const activate = (row: SearchRow) => {
    if (row.kind === "recent") {
      setQuery(row.query);
      setPending(isSearchable(row.query));
      setMoved(null);
      inputRef.current?.focus();
      return;
    }
    go(row.href, trimmed);
  };

  const step = (delta: number) => {
    if (rows.length === 0) return;
    const next = moved === null ? (delta > 0 ? 0 : rows.length - 1) : moved + delta;
    // Wraps at both ends: a five-row list is faster to reach backwards.
    setMoved(((next % rows.length) + rows.length) % rows.length);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        step(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        step(-1);
        return;
      case "Home":
        if (rows.length === 0) return;
        event.preventDefault();
        setMoved(0);
        return;
      case "End":
        if (rows.length === 0) return;
        event.preventDefault();
        setMoved(rows.length - 1);
        return;
      case "Enter": {
        event.preventDefault();
        if (active !== null) {
          activate(active);
          return;
        }
        // Nothing arrowed, so the server's opinion wins — `route` is, in the
        // contract's own words, "where the Enter key should go". It is null
        // whenever the best hit is fuzzy, which is exactly when the honest
        // destination is the full results page rather than a guess at row one.
        const route = answer !== null && answer.ok ? answer.result.route : null;
        const href = route === null ? null : routeHref(route);
        if (href !== null) {
          go(href, trimmed);
          return;
        }
        if (isSearchable(trimmed)) go(searchHref(trimmed), trimmed);
        return;
      }
      default:
        return;
    }
  };

  // Keeps the arrowed row in view. A DOM read and a scroll, no state — which is
  // why it is allowed to live in an effect at all.
  useEffect(() => {
    if (moved === null) return;
    document
      .getElementById(paletteOptionId(moved))
      ?.scrollIntoView({ block: "nearest" });
  }, [moved]);

  // ----------------------------------------------------------------- render

  const failure =
    answer !== null && !answer.ok && answer.reason !== "empty"
      ? answer.reason === "rate-limited"
        ? SEARCH_COPY.rateLimited
        : answer.reason === "too-long"
          ? SEARCH_COPY.tooLong
          : SEARCH_COPY.failed
      : null;

  const empty =
    trimmed === ""
      ? recents.length > 0
        ? null
        : SEARCH_COPY.idle
      : failure !== null
        ? failure
        : answer !== null && answer.ok && rows.length === 0
          ? answer.result.interpretedAs === "address"
            ? SEARCH_COPY.unknownAddress
            : SEARCH_COPY.noMatch
          : null;

  /** The one live region. It says what happened, so a screen-reader user is not
      left guessing why the list under an unmoved caret changed. */
  const status = pending
    ? "Searching…"
    : empty !== null
      ? empty.title
      : rows.length === 0
        ? ""
        : `${number(rows.length)} results. Use the arrow keys to review them.`;

  // Each section's first flat index, so a row can name its own aria-activedescendant
  // slot without a counter mutated mid-JSX.
  const starts: number[] = [];
  for (let at = 0, seen = 0; at < sections.length; at += 1) {
    starts.push(seen);
    seen += sections[at].rows.length;
  }

  return (
    <dialog
      ref={ref}
      aria-label="Search piggies"
      onCancel={(event) => {
        // Escape is intercepted, exactly as components/browse/filter-sheet.tsx
        // does, and for a stronger reason than "the URL is the source of truth":
        // letting the browser close the dialog itself leaves React's `open` at
        // true while the element is closed, and the document keydown listener —
        // whose first line is `if (open) return` — then refuses to reopen it. The
        // palette would be gone for the rest of the session. So every close takes
        // the same path: state first, then the effect closes the element.
        event.preventDefault();
        close();
      }}
      onClose={() => {
        // Everything, not just `open`. A palette reopened with a stale route
        // would send the next Enter to the previous search's piggy.
        setOpen(false);
        setQuery("");
        setAnswer(null);
        setPending(false);
        setMoved(null);
      }}
      onClick={(event) => {
        // A click on the dialog box rather than the panel inside it is a click
        // outside. p-0 plus the inner wrapper is what makes the two
        // distinguishable — filter-sheet.tsx's trick.
        if (event.target === ref.current) close();
      }}
      className={DIALOG}
    >
      {/* flex lives here, never on the <dialog>: display:flex on the element
          itself would beat dialog:not([open]){display:none}. */}
      <div className="flex h-full flex-col">
        <div className={HEAD}>
          <label htmlFor="search-palette-input" className="sr-only">
            Search piggies
          </label>
          <input
            id="search-palette-input"
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-controls={PALETTE_LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={moved === null ? undefined : paletteOptionId(moved)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Name, #number, mint or wallet…"
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setMoved(null);
              const searchable = isSearchable(next.trim());
              setPending(searchable);
              // Results for the previous query are not results for this one.
              if (!searchable) setAnswer(null);
            }}
            onKeyDown={onInputKeyDown}
            className={FIELD}
          />
          {/* A real control, not only Escape and the backdrop. Below sm the dialog
              IS the viewport, so there is no backdrop to click, and a touch device
              has no Escape key — filter-sheet's shell ships a ✕ for the same
              reason. */}
          <button type="button" onClick={close} aria-label="Close search" className={CLOSE}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className={BODY}>
          {pending && rows.length === 0 ? (
            <SearchRowsSkeleton />
          ) : empty !== null ? (
            <div className={NOTE}>
              <p className={`${NOTE_TITLE} ${failure !== null ? ALERT : ""}`}>{empty.title}</p>
              <p className={NOTE_BODY}>{empty.body}</p>
            </div>
          ) : (
            <ul id={PALETTE_LISTBOX_ID} role="listbox" aria-label="Search results">
              {sections.map((section, sectionIndex) => (
                <li key={section.id} role="presentation">
                  {section.label !== null && (
                    <p className={GROUP_HEAD}>
                      <span className={GROUP_NAME}>{section.label}</span>
                      {section.total !== null && (
                        <span className={GROUP_COUNT}>
                          {section.rows.length < section.total
                            ? `${number(section.rows.length)} of ${number(section.total)}`
                            : `${number(section.total)}`}
                        </span>
                      )}
                    </p>
                  )}
                  {/* role="group" carries the collection name so a screen reader
                      gets it even where a visible heading inside a listbox is
                      dropped, which VoiceOver and NVDA do inconsistently. */}
                  <ul role="group" aria-label={section.label ?? undefined}>
                    {section.rows.map((row, rowIndex) => {
                      const at = starts[sectionIndex] + rowIndex;
                      return (
                        <li key={row.id} role="presentation">
                          <ResultRow
                            row={row}
                            option={{ id: paletteOptionId(at), active: at === moved }}
                            onActivate={() => activate(row)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          <p role="status" aria-live="polite" className="sr-only">
            {status}
          </p>
        </div>

        <div className={FOOT}>
          {/* Static, not derived. navigator.platform is deprecated and
              navigator.userAgentData is absent from lib.dom.d.ts, so detecting the
              modifier would cost a hydration branch to save four characters. */}
          <span>
            <kbd className={KBD}>⌘K</kbd> <span aria-hidden="true">/</span>{" "}
            <kbd className={KBD}>Ctrl K</kbd> to open · <kbd className={KBD}>↑↓</kbd> to move ·{" "}
            <kbd className={KBD}>Enter</kbd> to open
          </span>
          {trimmed === "" && recents.length > 0 && (
            // Outside the listbox: a button among role="option" siblings would be
            // announced as one more result.
            <button
              type="button"
              onClick={() => setRecents(clearRecent())}
              className={GHOST}
            >
              Clear {number(Math.min(recents.length, RECENT_LIMIT))} recent
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
