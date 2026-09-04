"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The page's only new client component, and it is a shell: a native <dialog>
 * whose open state is driven entirely by the URL.
 *
 * A native dialog for the reason dressme's wallet modal gives — it renders in
 * the top layer, so the codebase never gains a second z-index, and it brings
 * focus trapping, Escape and ::backdrop with it.
 *
 * The URL is the single source of truth. Opening is a navigation (the trigger
 * is a Link to ?filters=<Type>), so closing has to be one too: Escape and a
 * click outside both cancel the browser's own close and perform the same
 * navigation the ✕ link does, and the dialog then closes because the next
 * render says it is closed. Letting the browser close it directly would leave
 * the URL claiming the sheet is open, so a reload would reopen it.
 *
 * It receives an already-server-rendered panel as `children`, so no facet logic
 * and no facet data cross the boundary: a real 10,000-piggy collection carries
 * several hundred trait values, and none of them belong in the RSC payload.
 *
 * Never lg:hidden — that would leave an open modal display:none in the top layer
 * with the document inert and no visible way out if the viewport crossed 1024px.
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
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    // A navigation does not restore focus to the trigger on its own, and the
    // trigger is where the reader was before the sheet took over.
    if (wasOpen.current && !open) document.getElementById(triggerId)?.focus();
    wasOpen.current = open;
  }, [open, triggerId]);

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
