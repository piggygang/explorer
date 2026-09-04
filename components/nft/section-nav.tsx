/**
 * In-page anchors, not tabs.
 *
 * Tabs would cap the DOM, but they split one record across three URLs — and
 * every pig having a single indexable, shareable, Ctrl+F-able page is the whole
 * point of this route (ALG-639). Anchors keep the document whole and still put
 * every section one tap away on a phone.
 */

const NAV = "no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0";
const LINK =
  "shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const COUNT = "ml-1.5 font-mono text-xs text-ink-muted";

export function SectionNav({
  traits,
  events,
  owners,
}: {
  traits: number;
  events: number | null;
  owners: number | null;
}) {
  const items: { href: string; label: string; count: number | null }[] = [
    { href: "#traits", label: "Traits", count: traits },
    { href: "#activity", label: "Activity", count: events },
    { href: "#owners", label: "Owners", count: owners },
  ];

  return (
    <nav aria-label="Sections" className={NAV}>
      {items.map((item) => (
        <a key={item.href} href={item.href} className={LINK}>
          {item.label}
          {/* A null count means the server declined to count — show nothing
              rather than a zero that would read as "none". */}
          {item.count !== null && <span className={COUNT}>{item.count}</span>}
        </a>
      ))}
    </nav>
  );
}
