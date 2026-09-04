import { ApiError } from "@/lib/api/client";

/**
 * In-place failure for a region that streamed under its own Suspense boundary —
 * the timeline, the facets, a wallet group. The page survives; one panel says
 * why it is empty. --brand doubles as the error colour: the palette has no
 * separate danger token.
 *
 * A 429 gets its own sentence because the reader can act on it. Everything else
 * promises the next cached render rather than telling them to wait out a limiter.
 */
export function ErrorNote({ what, error }: { what: string; error: unknown }) {
  const limited = error instanceof ApiError && error.status === 429;
  return (
    <p role="alert" className="text-sm text-brand">
      {limited
        ? `Rate-limited — ${what} didn’t load. Reload in a minute.`
        : `The indexer didn’t answer — ${what} will fill in on the next load.`}
    </p>
  );
}
