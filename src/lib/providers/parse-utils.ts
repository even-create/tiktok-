export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[,_]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** Walk the first matching path through nested objects/arrays. */
export function dig(root: unknown, paths: string[][]): unknown {
  for (const path of paths) {
    let current: unknown = root;
    let ok = true;

    for (const key of path) {
      if (!isRecord(current) && !Array.isArray(current)) {
        ok = false;
        break;
      }
      current = (current as UnknownRecord)[key];
    }

    if (ok && current !== undefined && current !== null) {
      return current;
    }
  }

  return undefined;
}

/** Unix seconds/millis → ISO string, or null. */
export function unixToIso(value: unknown): string | null {
  const n = toNumber(value);
  if (n <= 0) return null;
  const ms = n > 10_000_000_000 ? n : n * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function titleFromText(text: string | null | undefined, fallback: string): string {
  const clean = text?.trim();
  if (!clean) return fallback;
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}
