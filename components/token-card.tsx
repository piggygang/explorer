import type { CSSProperties } from "react";
import { CoverArt } from "@/components/piggy-art";
import type { Token } from "@/lib/tokens";

const CARD = "flex w-full flex-col gap-4 rounded-card border border-line bg-surface p-5";

export function TokenCard({ token }: { token: Token }) {
  const accent = { "--accent": token.accent } as CSSProperties;

  const inner = (
    <>
      <div className="flex items-center justify-between gap-3">
        {/* The coin carries its own rim — no tile border around it. */}
        <CoverArt
          src={token.logo}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-105"
        />
        <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 font-mono text-[11px] text-[var(--accent)]">
          {token.symbol}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="text-base font-semibold tracking-tight">{token.name}</h3>
        <p className="text-sm text-ink-muted">{token.blurb}</p>
        {token.link && (
          <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-medium text-[var(--accent)]">
            {token.link.label}
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        )}
      </div>
    </>
  );

  if (token.link) {
    return (
      <a
        href={token.link.href}
        target="_blank"
        rel="noreferrer"
        style={accent}
        className={`group ${CARD} transition-colors hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]`}
      >
        {inner}
      </a>
    );
  }

  return (
    <div style={accent} className={CARD}>
      {inner}
    </div>
  );
}
