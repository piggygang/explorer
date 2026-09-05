/**
 * Mock keyset cursors.
 *
 * The real API's cursors are keyset tokens: opaque, and "valid only for the
 * endpoint, sort and filter set it was issued for — anything else is
 * 400 invalid_cursor, which is a normal recoverable condition (restart from
 * page one), not an outage."
 *
 * A bare offset would satisfy the client's *type* while quietly accepting a
 * cursor from a different query, so the one error path the browse island has to
 * handle would be unreachable until a real API existed to produce it. Binding
 * the scope into the token is what makes that path reviewable now.
 *
 * The payload is plain JSON rather than a hash: a cursor that fails in review
 * should be readable by eye. It is still opaque to the client, which never
 * parses one — only echoes it.
 */

export type CursorScope = string;

type Payload = { o: number; s: CursorScope };

/**
 * The scope a cursor is valid within. Canonicalised — sorted trait types,
 * sorted values — so two URLs that mean the same filter set produce the same
 * scope and a cursor survives a reordered query string.
 */
export function scopeOf(
  endpoint: string,
  params: URLSearchParams,
  keys: readonly string[],
): CursorScope {
  const parts = [endpoint];
  for (const key of keys) {
    const values = params.getAll(key).sort();
    if (values.length > 0) parts.push(`${key}=${values.join("|")}`);
  }
  // Trait filters are bracketed keys, so they are collected by prefix.
  const traits = [...params.entries()]
    .filter(([key]) => key.startsWith("trait["))
    .map(([key, value]) => `${key}=${value}`)
    .sort();
  return [...parts, ...traits].join(";");
}

export function encodeCursor(offset: number, scope: CursorScope): string {
  const payload: Payload = { o: offset, s: scope };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * The offset a cursor points at, or null when it is unusable — unparseable,
 * or issued for a different query. Absent means page one, which is not an error.
 */
export function decodeCursor(cursor: string | null, scope: CursorScope): number | null {
  if (cursor === null) return 0;
  let payload: Payload;
  try {
    // Buffer.from silently drops characters outside the base64url alphabet, so
    // the round-trip check is what makes a tampered cursor a 400 rather than a
    // plausible offset.
    const text = Buffer.from(cursor, "base64url").toString();
    if (Buffer.from(text).toString("base64url") !== cursor) return null;
    payload = JSON.parse(text) as Payload;
  } catch {
    return null;
  }
  if (typeof payload?.o !== "number" || !Number.isInteger(payload.o) || payload.o < 0) return null;
  if (payload.s !== scope) return null;
  return payload.o;
}
