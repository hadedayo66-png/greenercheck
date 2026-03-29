/**
 * Next.js App Router passes search param values as `string | string[] | undefined`.
 */
export function firstSearchParam(
  value: string | string[] | undefined
): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value).trim();
}

/**
 * `undefined` when the param is absent or whitespace-only, so you can chain:
 * `coalesceSearchParam(sp.x) ?? config.x ?? fallback`.
 */
export function coalesceSearchParam(
  value: string | string[] | undefined
): string | undefined {
  const s = firstSearchParam(value);
  return s === "" ? undefined : s;
}

export function normalizeEmbedPrimaryHex(
  raw: string,
  fallback: string
): string {
  const fb = fallback.startsWith("#")
    ? fallback
    : `#${fallback.replace(/^#/, "")}`;
  const t = raw.trim();
  if (!t) return fb;
  if (!/^#?[0-9A-Fa-f]{6}$/.test(t)) return fb;
  return t.startsWith("#") ? t : `#${t}`;
}
