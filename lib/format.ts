/**
 * Every derived string in one place. There is deliberately no date library —
 * Intl covers what this app needs and ships with the platform.
 */

const RTF = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** UTC-pinned: a server render and a client hydration must not disagree. */
const ABS = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

const LAMPORTS_PER_SOL = 1_000_000_000;

/** The house number rule. */
export function number(value: number): string {
  return value.toLocaleString("en-US");
}

/** 4 + ellipsis + 4, the house address form. Short strings pass through whole. */
export function shorten(address: string): string {
  return address.length <= 11 ? address : `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * Coarse by design. Every data page revalidates at 300s, so a rendered
 * timestamp can be five minutes stale — the "second" unit is dropped and
 * anything fresher than five minutes reads "just now" rather than claiming a
 * precision the cache cannot back. Always pair it with absoluteTime() in a
 * title attribute.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (Math.abs(seconds) < 300) return "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RTF.format(-Math.round(seconds / size), unit);
  }
  return "just now";
}

export function absoluteTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : `${ABS.format(date)} UTC`;
}

/**
 * Lamports to SOL. Precision widens rather than rounding a real trade down to
 * "0 SOL" — a sale of 42,000 lamports is a fact, not a zero.
 */
export function formatSol(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  const digits = sol !== 0 && Math.abs(sol) < 0.001 ? 6 : 3;
  return `${sol.toLocaleString("en-US", { maximumFractionDigits: digits })} SOL`;
}
