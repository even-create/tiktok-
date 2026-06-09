export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(/,/g, "");
    const parsed = Number(normalized.replace(/_/g, ""));
    if (Number.isFinite(parsed)) return parsed;

    const match = normalized.match(/([\d.]+)\s*([KMBkmb])?/);
    if (match) {
      let amount = Number(match[1]);
      const suffix = (match[2] ?? "").toUpperCase();
      if (suffix === "K") amount *= 1_000;
      if (suffix === "M") amount *= 1_000_000;
      if (suffix === "B") amount *= 1_000_000_000;
      if (Number.isFinite(amount)) return amount;
    }
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

const BROWSER_IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

/** Normalize CDN URLs for storage and display (protocol, HTML entities). */
export function normalizeMediaUrl(raw: unknown): string | null {
  const value = pickString(raw);
  if (!value) return null;

  let url = value.replace(/&amp;/g, "&");
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("http://")) url = `https://${url.slice(7)}`;

  return url.startsWith("https://") ? url : null;
}

function scoreAvatarUrl(url: string): number {
  if (BROWSER_IMAGE_EXT.test(url)) return 10;
  if (/\.heic(\?|$)/i.test(url)) return 0;
  return 5;
}

/** Pick the best browser-renderable avatar from flat strings and url_list arrays. */
export function pickAvatarUrl(...sources: unknown[]): string | null {
  const candidates: string[] = [];

  for (const source of sources) {
    if (typeof source === "string" || typeof source === "number") {
      const normalized = normalizeMediaUrl(source);
      if (normalized) candidates.push(normalized);
      continue;
    }

    if (Array.isArray(source)) {
      for (const item of source) {
        const normalized = normalizeMediaUrl(item);
        if (normalized) candidates.push(normalized);
      }
    }
  }

  if (!candidates.length) return null;

  candidates.sort((left, right) => scoreAvatarUrl(right) - scoreAvatarUrl(left));
  return candidates[0];
}

/** Extract avatar from Douyin/TikTok-style user objects (avatar_* blocks with url_list). */
export function pickAvatarFromRecord(user: UnknownRecord): string | null {
  const blocks = [user.avatar_larger, user.avatar_medium, user.avatar_thumb, user.avatar_168x168];

  const urlLists: unknown[] = [];
  for (const block of blocks) {
    if (isRecord(block) && Array.isArray(block.url_list)) {
      urlLists.push(block.url_list);
    }
  }

  const flatList = dig(user, [
    ["avatar_larger", "url_list"],
    ["avatar_medium", "url_list"],
    ["avatar_thumb", "url_list"],
    ["avatar_168x168", "url_list"],
  ]);

  if (Array.isArray(flatList)) urlLists.push(flatList);

  return pickAvatarUrl(...urlLists, user.avatar, user.avatar_url);
}

const PROXY_FIRST_HOST =
  /douyinpic\.com|douyincdn\.com|byteimg\.com|ibyteimg\.com|pstatp\.com|tiktokcdn|ttwstatic|muscdn|tiktokv\.com|xhscdn|cdninstagram|fbcdn\.net$/i;

/** Douyin/TikTok API often lists .heic first; browsers only render jpeg/png/webp. */
export function toBrowserImageUrl(url: string): string {
  return url.replace(/\.heic(\?)/i, ".jpeg$1");
}

export function needsImageProxy(url: string): boolean {
  try {
    return PROXY_FIRST_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Normalize, prefer browser formats, and route hotlink-protected CDNs through our proxy. */
export function resolveDisplayImageUrl(raw: string | null | undefined): string | null {
  const normalized = normalizeMediaUrl(raw);
  if (!normalized) return null;

  const browserUrl = toBrowserImageUrl(normalized);
  if (needsImageProxy(browserUrl)) {
    return `/api/image-proxy?url=${encodeURIComponent(browserUrl)}`;
  }

  return browserUrl;
}
