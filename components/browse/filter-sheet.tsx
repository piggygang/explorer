"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { RAIL_MEDIA_QUERY } from "@/lib/browse-layout";

/**
 * The mobile filter drawer: a native <dialog> whose open state is driven
 * entirely by the URL.
 *
 * A native dialog for the reason dressme's wallet modal gives — it renders in
 * the top layer, so the codebase never gains a second z-index, and it brings
 * focus trapping, Escape and ::backdrop with it.
 *
 * The URL is the single source of truth. Opening is a navigation (the trigger is
 * a Link to ?filters=open), so closing has to be one too: Escape and a click
 * outside both cancel the browser's own close and perform the same navigation
 * the ✕ does. Letting the browser close it directly would leave the URL claiming
 * the drawer is open, so a reload would reopen it.
 *
 * It receives an already-server-rendered panel as `children`, so no facet logic
 * crosses the boundary here.
 *
 * NEVER lg:hidden. Hiding an OPEN dialog by media query would leave it
 * display:none in the top layer with the document inert and no visible way out
 * if the viewport crossed 1024px. Now that a rail exists above that width, the
 * answer is not a CSS rule but a refusal: this asks matchMedia whether it is
 * allowed to open at all, and navigates the flag away if the viewport grows
 * while it is open. Purely imperative — no state, so React 19's
 * set-state-in-effect rule has nothing to object to.
 */
export function FilterSheet({
  open,
  closeHref,
  triggerId,
  children,
}: {
  open: boolean;
  closeHref: string;
  triggerId: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const wasOpen = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const rail = window.matchMedia(RAIL_MEDIA_QUERY);

    const sync = () => {
      // At rail widths the panel is already on the page; a modal over it would
      // be a second copy of the same controls.
      const shouldShow = open && !rail.matches;
      if (shouldShow && !dialog.open) dialog.showModal();
      if (!shouldShow && dialog.open) dialog.close();

      // Drop the flag rather than leaving a URL that claims a drawer nobody can
      // see. This runs on a cold desktop load too: build() writes `filters=open`
      // into every href from a params object that still carries it, so one
      // bookmarked link would otherwise infect every URL the session shares.
      if (open && rail.matches) router.replace(closeHref, { scroll: false });

      // A navigation does not restore focus to the trigger on its own, and the
      // trigger is where the reader was before the drawer took over.
      if (wasOpen.current && !shouldShow) document.getElementById(triggerId)?.focus();
      wasOpen.current = shouldShow;
    };

    sync();
    rail.addEventListener("change", sync);
    return () => rail.removeEventListener("change", sync);
  }, [open, closeHref, router, triggerId]);

  const close = () => router.replace(closeHref, { scroll: false });

  return (
    <dialog
      ref={ref}
      aria-label="Filters"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        // A click that lands on the dialog box rather than the panel inside it
        // is a click outside. p-0 plus an inner wrapper is what makes the two
        // distinguishable — dressme's wallet-modal trick.
        if (event.target === ref.current) close();
      }}
      className="m-auto h-dvh w-full max-w-none rounded-none border-line bg-surface p-0 text-ink sm:h-auto sm:max-h-[min(44rem,calc(100dvh-4rem))] sm:w-[min(34rem,calc(100vw-2rem))] sm:rounded-card sm:border"
    >
      {/* flex lives here, never on the <dialog>: display:flex on the element
          itself would beat dialog:not([open]){display:none}. */}
      <div className="flex h-full flex-col">{children}</div>
    </dialog>
  );
}
