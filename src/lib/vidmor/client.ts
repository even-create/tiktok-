import {
  GPT_IMAGE_20,
  SEEDANCE_20,
  VIDMOR_DEFAULTS,
  resolveVidmorToken,
  resolveVidmorUserCode,
} from "@/lib/vidmor/config";
import { encryptPayload, encryptUrlPath, tryDecryptPayload } from "@/lib/vidmor/crypto";

type VidmorEnvelope<T = unknown> = {
  code?: number;
  msg?: string;
  success?: boolean;
  data?: T;
  token?: string;
};

type VidmorRequestOptions = {
  path: string;
  data?: Record<string, unknown> | FormData;
  token?: string | null;
  userCode?: string | null;
  encryptPath?: boolean;
};

function parseVidmorErrorMessage(status: number, body: VidmorEnvelope, raw: string) {
  if (body.msg && !/^[A-Za-z0-9+/=]{12,}$/.test(body.msg)) {
    return body.msg;
  }

  if (status === 401 || body.code === 401) {
    return "Vidmor 登录已失效，请重新在 vidmor.ai 登录并从 Console 复制新的 VIDMOR_TOKEN，更新 Vercel 环境变量后 Redeploy。";
  }

  if (body.code === 10000) {
    return body.msg || "Vidmor 积分不足";
  }

  if (body.code === 2) {
    return "Vidmor 模型参数异常，请稍后重试或联系管理员检查 defineModelName / method 配置";
  }

  if (status >= 500) {
    return "Vidmor 服务暂时不可用，请稍后重试";
  }

  return body.msg || "Vidmor 请求失败，请检查 Token 是否有效";
}

function parseVidmorResponseBody<T>(raw: string, status: number): VidmorEnvelope<T> {
  if (!raw.trim()) {
    if (status === 401) {
      return { code: 401, msg: parseVidmorErrorMessage(401, {}, raw) } as VidmorEnvelope<T>;
    }
    return {} as VidmorEnvelope<T>;
  }

  const decrypted = tryDecryptPayload<VidmorEnvelope<T>>(raw);
  if (decrypted) {
    return decrypted;
  }

  try {
    return JSON.parse(raw) as VidmorEnvelope<T>;
  } catch {
    return {
      code: status,
      msg: parseVidmorErrorMessage(status, {}, raw),
    } as VidmorEnvelope<T>;
  }
}

function buildHeaderBlob(token: string | null | undefined, userCode: string) {
  return encryptPayload({
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
          token,
        }
      : {}),
    usercode: userCode,
    os: VIDMOR_DEFAULTS.os,
    appv: VIDMOR_DEFAULTS.appVersion,
    pkg_name: VIDMOR_DEFAULTS.pkgName,
  });
}

export async function vidmorRequest<T = unknown>({
  path,
  data,
  token,
  userCode,
  encryptPath = true,
}: VidmorRequestOptions): Promise<{ status: number; body: VidmorEnvelope<T>; token: string | null }> {
  const resolvedToken = token ?? resolveVidmorToken();
  const resolvedUserCode = userCode ?? resolveVidmorUserCode();
  if (!resolvedUserCode) {
    throw new Error("未配置 VIDMOR_USER_CODE");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const urlPath = encryptPath ? encryptUrlPath(normalizedPath) : normalizedPath.slice(1);
  const url = `${VIDMOR_DEFAULTS.baseUrl}/${urlPath}`;

  const headers: Record<string, string> = {
    pkg_name: VIDMOR_DEFAULTS.pkgName,
    hr6cfx: buildHeaderBlob(resolvedToken, resolvedUserCode),
  };

  let body: BodyInit | undefined;
  if (data instanceof FormData) {
    body = data;
  } else if (data) {
    headers["Content-Type"] = "application/json";
    body = encryptPayload(data);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  const responseToken = response.headers.get("token");
  const raw = await response.text();

  if (!raw.trim()) {
    return {
      status: response.status,
      body: parseVidmorResponseBody<T>("", response.status),
      token: responseToken,
    };
  }

  if (normalizedPath.startsWith("/b9ca72e9/")) {
    return {
      status: response.status,
      body: JSON.parse(raw) as VidmorEnvelope<T>,
      token: responseToken,
    };
  }

  const parsedBody = parseVidmorResponseBody<T>(raw, response.status);
  return {
    status: response.status,
    body: parsedBody,
    token: responseToken,
  };
}

export async function uploadImageBlob(blob: Blob, filename: string, token?: string | null) {
  const form = new FormData();
  form.append("file", blob, filename);

  const result = await vidmorRequest<{ url?: string } | string>({
    path: "/ai/common/file/uploadV2",
    data: form,
    token,
  });

  if (result.status === 401 || result.body.code === 401) {
    throw new Error(parseVidmorErrorMessage(401, result.body, ""));
  }

  const data = result.body.data;
  const url =
    typeof data === "string"
      ? data
      : typeof data === "object" && data?.url
        ? data.url
        : null;

  if (result.body.code !== 0 || !url) {
    throw new Error(parseVidmorErrorMessage(result.status, result.body, ""));
  }

  return url;
}

export async function uploadImageFromUrl(imageUrl: string, token?: string | null) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`无法读取参考图：${imageResponse.status}`);
  }

  const blob = await imageResponse.blob();
  const extension =
    blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  return uploadImageBlob(blob, `reference.${extension}`, token);
}

export async function ensureVidmorReferenceUrl(imageUrl: string, token?: string | null) {
  return uploadImageFromUrl(imageUrl, token);
}

async function withVidmorRetry<T>(operation: () => Promise<T>, retries = 3) {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = /server internal error|暂时不可用|timeout/i.test(lastError.message);
      if (!retryable || attempt === retries - 1) {
        throw lastError;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Vidmor 请求失败");
}

export async function queryCoinCost(payload: Record<string, unknown>, token?: string | null) {
  return withVidmorRetry(async () => {
    const result = await vidmorRequest<{ costCoin?: number }>({
      path: "/api/ai/cost/coin",
      data: payload,
      token,
    });

    if (result.body.code !== 0) {
      throw new Error(parseVidmorErrorMessage(result.status, result.body, ""));
    }

    return result.body.data?.costCoin ?? 0;
  });
}

export type VidmorWalletBalance = {
  total: number;
  permanent: number;
  expiring: number;
};

export async function queryVidmorWalletBalance(token?: string | null): Promise<VidmorWalletBalance> {
  const result = await vidmorRequest<{
    coin?: number;
    fixedCoin?: number;
    expireCoin?: number;
  }>({
    path: "/api/wallet/detail",
    data: {},
    token,
  });

  if (result.body.code !== 0) {
    throw new Error(parseVidmorErrorMessage(result.status, result.body, ""));
  }

  return {
    total: result.body.data?.coin ?? 0,
    permanent: result.body.data?.fixedCoin ?? 0,
    expiring: result.body.data?.expireCoin ?? 0,
  };
}

export async function submitGeneration(payload: Record<string, unknown>, token?: string | null) {
  return withVidmorRetry(async () => {
    const result = await vidmorRequest<{
      taskId?: string;
      id?: string;
      domainId?: string;
      msg?: string;
      code?: number;
    }>({
      path: "/generate/api/interface/request",
      data: payload,
      token,
    });

    if (result.body.code !== 0) {
      throw new Error(
        parseVidmorErrorMessage(result.status, result.body, "") ||
          result.body.data?.msg ||
          "生成任务提交失败",
      );
    }

    const taskId =
      result.body.data?.taskId ||
      result.body.data?.id ||
      result.body.data?.domainId;

    if (!taskId) {
      throw new Error("生成任务未返回 taskId");
    }

    return String(taskId);
  });
}

type VidmorGenerateListItem = {
  id?: number;
  status?: string;
  domainId?: string;
  platResponse?: string;
  platRequest?: string;
};

function parsePlatResponse(platResponse?: string) {
  if (!platResponse?.trim()) {
    return null;
  }

  try {
    return JSON.parse(platResponse) as {
      code?: number;
      data?: {
        status?: string;
        taskId?: string;
        resultUrl?: string;
        videoUrl?: string;
        imageUrl?: string;
        taskResult?: Array<{ url?: string; videoUrl?: string }>;
      };
    };
  } catch {
    return null;
  }
}

function extractMediaUrl(data: {
  resultUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  taskResult?: Array<{ url?: string; videoUrl?: string }>;
}) {
  const taskResult = Array.isArray(data.taskResult) ? data.taskResult : [];
  const firstResult = taskResult[0];

  return (
    data.resultUrl ||
    data.videoUrl ||
    data.imageUrl ||
    firstResult?.url ||
    firstResult?.videoUrl ||
    null
  );
}

function extractMediaUrlFromPlatResponse(platResponse?: string) {
  const parsed = parsePlatResponse(platResponse);
  const fromData = parsed?.data ? extractMediaUrl(parsed.data) : null;
  if (fromData) {
    return fromData;
  }

  if (!platResponse?.trim()) {
    return null;
  }

  const mp4Match = platResponse.match(/https?:\/\/[^"'\\\s]+\.mp4[^"'\\\s]*/);
  return mp4Match?.[0] ?? null;
}

function normalizeUrlForMatch(url: string) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname);
  } catch {
    return decodeURIComponent(url.split("?")[0] ?? url);
  }
}

function platRequestUsesSourceImage(platRequest: string | undefined, sourceImageUrl: string) {
  if (!platRequest?.trim()) {
    return false;
  }

  const sourceKey = normalizeUrlForMatch(sourceImageUrl);
  return platRequest.includes(sourceImageUrl) || platRequest.includes(sourceKey);
}

function itemCreatedAt(item: VidmorGenerateListItem & { createTime?: string; gmtCreate?: string }) {
  const raw = item.createTime || item.gmtCreate;
  if (!raw) {
    return 0;
  }

  const parsed = Date.parse(raw.replace(" ", "T"));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function matchListItemByTaskId(item: VidmorGenerateListItem, taskId: string) {
  if (item.domainId === taskId || String(item.id ?? "") === taskId) {
    return true;
  }

  const plat = parsePlatResponse(item.platResponse);
  const platTaskId = typeof plat?.data?.taskId === "string" ? plat.data.taskId : null;
  return platTaskId === taskId;
}

function resolveListItemStatus(item: VidmorGenerateListItem) {
  const plat = parsePlatResponse(item.platResponse);
  const platData = plat?.data ?? {};
  const platStatus = String(platData.status ?? "").toLowerCase();
  const itemStatus = String(item.status ?? "").toLowerCase();
  const mediaUrl = extractMediaUrl(platData) || extractMediaUrlFromPlatResponse(item.platResponse);
  let status = itemStatus === "success" || itemStatus === "completed" ? itemStatus : platStatus || itemStatus;

  if ((status === "success" || status === "completed") && !mediaUrl) {
    status = "processing";
  }

  return { status, mediaUrl, raw: item, platData };
}

export async function pollGenerationStatus(
  pollMethod: string,
  taskId: string,
  token?: string | null,
) {
  void pollMethod;

  const result = await vidmorRequest<{ data?: VidmorGenerateListItem[] }>({
    path: "/ai/common/generate/list",
    data: {
      pageNo: 1,
      pageSize: 1,
      domainId: taskId,
    },
    token,
  });

  if (result.body.code !== 0) {
    throw new Error(parseVidmorErrorMessage(result.status, result.body, ""));
  }

  const item = result.body.data?.data?.[0];
  if (!item) {
    return { status: "pending", mediaUrl: null, raw: {} };
  }

  const resolved = resolveListItemStatus(item);
  return {
    status: resolved.status,
    mediaUrl: resolved.mediaUrl,
    raw: resolved.raw as Record<string, unknown>,
  };
}

/** Poll by task id; falls back to scanning recent Vidmor history when domainId filter misses the result. */
export async function resolveTaskMediaUrl(
  pollMethod: string,
  taskId: string,
  token?: string | null,
) {
  const direct = await pollGenerationStatus(pollMethod, taskId, token);
  if (direct.mediaUrl) {
    return direct;
  }

  const listResult = await vidmorRequest<{ data?: VidmorGenerateListItem[] }>({
    path: "/ai/common/generate/list",
    data: { pageNo: 1, pageSize: 40 },
    token,
  });

  if (listResult.body.code !== 0) {
    return direct;
  }

  const item = listResult.body.data?.data?.find((entry) => matchListItemByTaskId(entry, taskId));
  if (!item) {
    return direct;
  }

  return resolveListItemStatus(item);
}

export async function findCompletedVideoBySourceImage(
  sourceImageUrl: string,
  jobCreatedAt: string,
  token?: string | null,
) {
  const listResult = await vidmorRequest<{ data?: VidmorGenerateListItem[] }>({
    path: "/ai/common/generate/list",
    data: { pageNo: 1, pageSize: 50 },
    token,
  });

  if (listResult.body.code !== 0) {
    return null;
  }

  const jobTime = Date.parse(jobCreatedAt);
  const items = listResult.body.data?.data ?? [];
  let best: { taskId: string; videoUrl: string; createdAt: number } | null = null;

  for (const item of items) {
    if (!item.platRequest?.includes("imageToVideo")) {
      continue;
    }

    if (!platRequestUsesSourceImage(item.platRequest, sourceImageUrl)) {
      continue;
    }

    const resolved = resolveListItemStatus(item);
    if (
      (resolved.status !== "success" && resolved.status !== "completed") ||
      !resolved.mediaUrl
    ) {
      continue;
    }

    const createdAt = itemCreatedAt(item);
    if (createdAt && !Number.isNaN(jobTime) && createdAt < jobTime - 120_000) {
      continue;
    }

    if (!best || createdAt > best.createdAt) {
      best = {
        taskId: item.domainId ?? String(item.id ?? ""),
        videoUrl: resolved.mediaUrl,
        createdAt,
      };
    }
  }

  return best;
}

export async function pollUntilComplete(
  pollMethod: string,
  taskId: string,
  options?: {
    token?: string | null;
    intervalMs?: number;
    timeoutMs?: number;
    onTick?: (status: string) => void | Promise<void>;
  },
) {
  const intervalMs = options?.intervalMs ?? 3000;
  const timeoutMs = options?.timeoutMs ?? 300_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { status, mediaUrl } = await pollGenerationStatus(pollMethod, taskId, options?.token);
    await options?.onTick?.(status);

    if (status === "fail" || status === "failed" || status === "error") {
      throw new Error("Vidmor 生成失败");
    }

    if (status === "success" || status === "completed") {
      if (!mediaUrl) {
        throw new Error("任务成功但未返回媒体 URL");
      }
      return mediaUrl;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("生成超时，请稍后在 Vidmor 历史记录中查看");
}

export function buildImageToImageRequest({
  prompt,
  imageUrl,
  costCoin,
}: {
  prompt: string;
  imageUrl: string;
  costCoin: number;
}) {
  return {
    method: GPT_IMAGE_20.submitMethod,
    appId: VIDMOR_DEFAULTS.appId,
    sourcePlat: "WEB",
    defineModelName: GPT_IMAGE_20.apiDefineModelName,
    costCoin,
    params: {
      model: GPT_IMAGE_20.model,
      prompt,
      imageUrl,
      number: 1,
      imageList: [{ image: imageUrl, imageUrl }],
      quality: "medium",
      size: GPT_IMAGE_20.aspectSize,
      fillBackInfo: {
        modelName: GPT_IMAGE_20.defineModelName,
        tabType: "image",
        channel: GPT_IMAGE_20.channel,
        function: "imageEditAsync",
        status: "imageEditAsyncResult",
        pollingMethod: GPT_IMAGE_20.pollMethod,
      },
    },
  };
}

export function buildImageToVideoRequest({
  prompt,
  imageUrl,
  costCoin,
  duration,
  resolution,
}: {
  prompt: string;
  imageUrl: string;
  costCoin: number;
  duration?: number;
  resolution?: string;
}) {
  const resolvedDuration = duration ?? SEEDANCE_20.duration;
  const resolvedResolution = resolution ?? SEEDANCE_20.resolution;

  return {
    method: SEEDANCE_20.submitMethod,
    appId: VIDMOR_DEFAULTS.appId,
    sourcePlat: "WEB",
    defineModelName: SEEDANCE_20.defineModelName,
    costCoin,
    params: {
      prompt,
      duration: resolvedDuration,
      quality: resolvedResolution,
      resolution: resolvedResolution,
      model: SEEDANCE_20.model,
      imageUrl,
      imageList: [{ image: imageUrl, imageUrl }],
      fillBackInfo: {
        modelName: SEEDANCE_20.defineModelName,
        tabType: "video",
        channel: SEEDANCE_20.channel,
        function: "imageToVideo",
        status: "textToVideoResult",
        pollingMethod: SEEDANCE_20.pollMethod,
      },
    },
  };
}

export { GPT_IMAGE_20, SEEDANCE_20 };
