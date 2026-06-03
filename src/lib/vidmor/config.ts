export const VIDMOR_DEFAULTS = {
  baseUrl: "https://mrc.aiimagery.top",
  pkgName: "com.aivideo.vidmor.ai.web",
  appVersion: "1.3.0",
  appId: 402,
  os: "3",
} as const;

export const GPT_IMAGE_20 = {
  label: "GPT Image 2.0",
  channel: "azure",
  model: "gpt-image-2",
  submitMethod: "azure.imageEditAsync",
  pollMethod: "azure.imageEditAsyncResult",
  defineModelName: "GPT Image 2.0",
  aspectSize: "1024x1792",
} as const;

export const SEEDANCE_20 = {
  label: "Seedance 2.0",
  channel: "byteplusCn",
  model: "doubao-seedance-2-0-260128",
  submitMethod: "byteplusCn.imageToVideo",
  pollMethod: "byteplusCn.textToVideoResult",
  defineModelName: "Seedance 2.0",
  resolution: "720p",
  duration: 5,
} as const;

export type AnimeCharacter = {
  id: string;
  name: string;
  accountLabel: string;
  refImagePath: string;
};

export const ANIME_CHARACTERS: AnimeCharacter[] = [
  {
    id: "char-1",
    name: "紫发西装",
    accountLabel: "动漫账号 1",
    refImagePath: "/anime-characters/char-1.png",
  },
  {
    id: "char-2",
    name: "角色二",
    accountLabel: "动漫账号 2",
    refImagePath: "/anime-characters/char-2.png",
  },
  {
    id: "char-3",
    name: "角色三",
    accountLabel: "动漫账号 3",
    refImagePath: "/anime-characters/char-3.png",
  },
  {
    id: "char-4",
    name: "角色四",
    accountLabel: "动漫账号 4",
    refImagePath: "/anime-characters/char-4.png",
  },
];

export function getAnimeCharacter(id: string) {
  return ANIME_CHARACTERS.find((character) => character.id === id) ?? null;
}

export function resolveVidmorToken() {
  const encoded = process.env.VIDMOR_TOKEN_B64?.trim();
  if (encoded) {
    try {
      return Buffer.from(encoded, "base64").toString("utf8").trim() || null;
    } catch {
      return null;
    }
  }

  return process.env.VIDMOR_TOKEN?.trim() || null;
}

export function resolveVidmorUserCode() {
  return process.env.VIDMOR_USER_CODE?.trim() || null;
}

export function isVidmorConfigured() {
  return Boolean(resolveVidmorToken() && resolveVidmorUserCode());
}

export function getVidmorConfigStatus() {
  const token = resolveVidmorToken();
  const hasToken = Boolean(token);
  const hasUserCode = Boolean(resolveVidmorUserCode());
  const missing: string[] = [];
  if (!hasToken) missing.push("VIDMOR_TOKEN or VIDMOR_TOKEN_B64");
  if (!hasUserCode) missing.push("VIDMOR_USER_CODE");
  return {
    configured: missing.length === 0,
    hasToken,
    hasUserCode,
    tokenLength: token?.length ?? 0,
    missing,
  };
}

export function getPublicAssetUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
