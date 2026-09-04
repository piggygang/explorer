/**
 * Ported from dressme/components/wardrobe/rarity-badge.tsx — same four tiers,
 * same thresholds, same title shape — so a percentage means the same thing in
 * both apps. The gold/brand/ink palette deliberately ignores --accent: the
 * rarity scale is global vocabulary, not collection colour.
 */

const BADGE = "rounded px-1 py-px font-mono text-[10px] leading-tight";

export function rarityTier(percent: number): { label: string; className: string } {
  if (percent < 1) return { label: "Mythic", className: "bg-gold/20 text-gold" };
  if (percent < 5) return { label: "Rare", className: "bg-brand/20 text-brand" };
  if (percent < 15) return { label: "Uncommon", className: "bg-ink/10 text-ink" };
  return { label: "Common", className: "bg-ink/5 text-ink-muted" };
}

export function formatPercent(percent: number): string {
  if (percent < 0.1) return `${percent.toFixed(2)}%`;
  if (percent < 10) return `${percent.toFixed(1)}%`;
  return `${Math.round(percent)}%`;
}

/** `of` names the denominator, which stops being the whole collection the
    moment a filter is active. */
export function RarityBadge({ percent, of = "the collection" }: { percent: number; of?: string }) {
  const tier = rarityTier(percent);
  return (
    <span className={`${BADGE} ${tier.className}`} title={`${tier.label} — ${formatPercent(percent)} of ${of}`}>
      {formatPercent(percent)}
    </span>
  );
}
