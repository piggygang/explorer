"use client";

import { useEffect } from "react";
import { rememberSearch } from "@/lib/search";

/**
 * Records a search the SERVER answered into the reader's local history.
 *
 * Without it, recents would only ever be written from inside the palette, so a
 * search run from the header box, from the browse page, or from a shared link
 * would never appear in the list the palette shows — a history that quietly
 * omits most of what the reader actually did.
 *
 * No state and no render output: one effect, writing to localStorage. That is
 * also why it can be an effect at all under React 19's set-state-in-effect rule —
 * there is no state to set.
 */
export function RememberSearch({ query }: { query: string }) {
  useEffect(() => {
    rememberSearch(query);
  }, [query]);
  return null;
}
