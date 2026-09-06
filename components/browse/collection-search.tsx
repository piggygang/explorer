import { MAX_QUERY_LENGTH } from "@/lib/api/params";
import { type BrowseParams, browseHiddenFields } from "@/lib/browse-params";

/**
 * The in-collection search box. `?q=` has been wired through this page since
 * ALG-633 — parsed, sent to both browse fetches, counted by activeCount, rendered
 * as a removable chip and given its own empty state — with no control producing
 * it. This is that control.
 *
 * A SERVER component with a plain GET form: no directive, no state, no island.
 * That is the entire point — it is the only new control in ALG-634 that works
 * with JavaScript switched off, so it carries no `needs-js`.
 *
 * A native GET form serializes only its OWN fields and discards the rest of the
 * query string, so the current selection is re-emitted as hidden inputs
 * (browseHiddenFields). Without them, searching would silently clear the reader's
 * filters and sort.
 *
 * NO label/id pair. Both breakpoint copies are in the DOM at once, so a shared id
 * would be invalid and `htmlFor` would bind the mobile label to the display:none
 * desktop field — the problem lib/browse-layout.ts's valueListId already solved
 * for the two facet shells. An aria-label on the input needs no id at all.
 */

const FIELD =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function CollectionSearch({
  slug,
  name,
  params,
  className = "",
}: {
  slug: string;
  name: string;
  params: BrowseParams;
  className?: string;
}) {
  return (
    <form
      action={`/collections/${slug}`}
      role="search"
      // Named, because the site header's search landmark is on the same page.
      aria-label={`Search ${name}`}
      className={className}
    >
      {/* The index is part of the key: `trait[Head]` repeats once per selected
          value, so the name alone is not unique. */}
      {browseHiddenFields(params).map((field, index) => (
        <input key={`${field.name}:${index}`} type="hidden" name={field.name} value={field.value} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={params.q ?? ""}
        aria-label={`Search ${name}`}
        placeholder="Name, #number or mint…"
        // parseBrowseParams already drops an over-length q rather than sending a
        // 400; this just stops the reader building one by accident.
        maxLength={MAX_QUERY_LENGTH}
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className={FIELD}
      />
    </form>
  );
}
