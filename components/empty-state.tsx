import type { ReactNode } from "react";
import { PiggyMark } from "@/components/brand/wordmark";

/**
 * Two densities of nothing. EmptyState is the standalone dashed box, for when
 * the empty thing IS the region. EmptyNote is a plain muted paragraph for use
 * inside a panel that already has a border — a dashed box inside a bordered
 * panel is two frames around one sentence.
 *
 * Both take copy that names the CAUSE. Neither ever says just "No results".
 */

const BOX = "rounded-card border border-dashed border-line bg-surface/50 p-6 text-center";
const MARK = "mx-auto h-12 w-12 opacity-25";
const TITLE = "mt-4 text-base font-medium";
const BODY = "mx-auto mt-1.5 max-w-sm text-sm text-ink-muted text-pretty";

export function EmptyState({
  title,
  body,
  action,
  mark = true,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  mark?: boolean;
}) {
  return (
    <div className={BOX}>
      {mark && <PiggyMark className={MARK} />}
      <p className={TITLE}>{title}</p>
      <p className={BODY}>{body}</p>
      {action}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
}
