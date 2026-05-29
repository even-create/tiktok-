import { resolveTikHubApiKey } from "@/lib/app-settings";

export type TikHubRequestOptions = {
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
};

export type TikHubEnvelope<T = unknown> = {
  code?: number;
  message?: string;
  message_zh?: string;
  data?: T;
  detail?: { code?: number; message?: string; message_zh?: string };
};

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_RETRIES = 3;
const MIN_INTERVAL_MS = 110;
const RATE_LIMIT_STATUS = new Set([429, 503]);

let lastRequestAt = 0;
let rateLimitChain: Promise<void> = Promise.resolve();

function getBaseUrl() {
  const region = process.env.TIKHUB_API_BASE_URL?.trim();
  if (region) return region.replace(/\/$/, "");

  const useChina = process.env.TIKHUB_USE_CHINA_DOMAIN === "true";
  return useChina ? "https://api.tikhub.dev" : "https://api.tikhub.io";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRateLimit() {
  rateLimitChain = rateLimitChain.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - now);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    lastRequestAt = Date.now();
  });
  await rateLimitChain;
}

function buildUrl(path: string, query?: TikHubRequestOptions["query"]) {
  const url = new URL(`${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function parseTikHubError(status: number, body: string) {
  try {
    const payload = JSON.parse(body) as TikHubEnvelope;
    const detail = payload.detail;
    const message = detail?.message_zh ?? detail?.message ?? payload.message_zh ?? payload.message;

    if (status === 401 || status === 403) {
      return message ?? "TikHub API Key 无效或未授权，请检查 TIKHUB_API_KEY";
    }
    if (status === 402) {
      return message ?? "TikHub 余额不足，请充值后重试";
    }
    if (status === 429) {
      return message ?? "TikHub 请求过于频繁，请稍后重试";
    }
    if (message) {
      return `TikHub：${message}`;
    }
  } catch {
    // ignore
  }

  return `TikHub 请求失败（HTTP ${status}）`;
}

function parseDataField<T>(data: unknown): T {
  if (typeof data === "string" && data.trim()) {
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as T;
    }
  }

  return data as T;
}

function unwrapData<T>(payload: TikHubEnvelope<T> | T): T {
  if (payload && typeof payload === "object" && "data" in (payload as TikHubEnvelope<T>)) {
    const envelope = payload as TikHubEnvelope<T>;
    if (envelope.code && envelope.code !== 200) {
      throw new Error(envelope.message_zh ?? envelope.message ?? `TikHub 返回错误 code=${envelope.code}`);
    }
    return parseDataField<T>(envelope.data);
  }

  return payload as T;
}

export async function tikhubRequest<T = unknown>(options: TikHubRequestOptions): Promise<T> {
  const apiKey = await resolveTikHubApiKey();
  if (!apiKey) {
    throw new Error("未配置 TIKHUB_API_KEY，请在 Vercel 环境变量或 Settings 中设置");
  }

  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const url = buildUrl(options.path, options.query);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await waitForRateLimit();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      console.info(`[tikhub] ${method} ${options.path} attempt=${attempt + 1}`);

      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
        body: method === "POST" && options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      const text = await response.text();
      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        const error = new Error(parseTikHubError(response.status, text));
        console.error(`[tikhub] ${options.path} failed ${response.status} in ${durationMs}ms`, error.message);

        if (RATE_LIMIT_STATUS.has(response.status) && attempt < retries) {
          await sleep(800 * (attempt + 1));
          lastError = error;
          continue;
        }

        throw error;
      }

      const parsed = text ? (JSON.parse(text) as TikHubEnvelope<T> | T) : ({} as T);
      console.info(`[tikhub] ${options.path} ok in ${durationMs}ms`);
      return unwrapData<T>(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "TikHub 请求失败";
      lastError = error instanceof Error ? error : new Error(message);

      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error("TikHub 请求超时，请稍后重试");
      }

      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("TikHub 请求失败");
}

export function getTikHubBaseUrl() {
  return getBaseUrl();
}
