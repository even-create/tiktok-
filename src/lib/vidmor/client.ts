import {
  GPT_IMAGE_20,
  SEEDANCE_20,
  VIDMOR_DEFAULTS,
  resolveVidmorToken,
  resolveVidmorUserCode,
} from "@/lib/vidmor/config";
import { decryptPayload, encryptPayload, encryptUrlPath } from "@/lib/vidmor/crypto";

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
    return { status: response.status, body: {} as VidmorEnvelope<T>, token: responseToken };
  }

  if (normalizedPath.startsWith("/b9ca72e9/")) {
    return {
      status: response.status,
      body: JSON.parse(raw) as VidmorEnvelope<T>,
      token: responseToken,
    };
  }

  try {
    return {
      status: response.status,
      body: decryptPayload<VidmorEnvelope<T>>(raw),
      token: responseToken,
    };
  } catch {
    try {
      return {
        status: response.status,
        body: JSON.parse(raw) as VidmorEnvelope<T>,
        token: responseToken,
      };
    } catch {
      return { status: response.status, body: { msg: raw } as VidmorEnvelope<T>, token: responseToken };
    }
  }
}

export async function uploadImageBlob(blob: Blob, filename: string, token?: string | null) {
  const form = new FormData();
  form.append("file", blob, filename);

  const result = await vidmorRequest<{ url?: string }>({
    path: "/ai/common/file/uploadV2",
    data: form,
    token,
  });

  if (result.body.code !== 0 || !result.body.data?.url) {
    throw new Error(result.body.msg || "图片上传失败");
  }

  return result.body.data.url;
}

export async function uploadImageFromUrl(imageUrl: string, token?: string | null) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`无法读取参考图：${imageResponse.status}`);
  }

  const blob = await imageResponse.blob();
  return uploadImageBlob(blob, "reference.png", token);
}

export async function queryCoinCost(payload: Record<string, unknown>, token?: string | null) {
  const result = await vidmorRequest<{ costCoin?: number }>({
    path: "/api/ai/cost/coin",
    data: payload,
    token,
  });

  if (result.body.code !== 0) {
    throw new Error(result.body.msg || "积分查询失败");
  }

  return result.body.data?.costCoin ?? 0;
}

export async function submitGeneration(payload: Record<string, unknown>, token?: string | null) {
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
    throw new Error(result.body.msg || result.body.data?.msg || "生成任务提交失败");
  }

  const taskId =
    result.body.data?.taskId ||
    result.body.data?.id ||
    result.body.data?.domainId;

  if (!taskId) {
    throw new Error("生成任务未返回 taskId");
  }

  return String(taskId);
}

export async function pollGenerationStatus(
  pollMethod: string,
  taskId: string,
  token?: string | null,
) {
  const result = await vidmorRequest<{
    status?: string;
    resultUrl?: string;
    videoUrl?: string;
    imageUrl?: string;
    taskResult?: Array<{ url?: string; videoUrl?: string }>;
    msg?: string;
  }>({
    path: "/api/ai/detail/v2",
    data: {
      appId: VIDMOR_DEFAULTS.appId,
      method: pollMethod,
      sourcePlat: "WEB",
      params: { taskId },
    },
    token,
  });

  if (result.body.code !== 0) {
    throw new Error(result.body.msg || "轮询失败");
  }

  const data = result.body.data ?? {};
  const status = String(data.status ?? "").toLowerCase();
  const taskResult = Array.isArray(data.taskResult) ? data.taskResult : [];
  const firstResult = taskResult[0];
  const mediaUrl =
    data.resultUrl ||
    data.videoUrl ||
    data.imageUrl ||
    firstResult?.url ||
    firstResult?.videoUrl ||
    null;

  return { status, mediaUrl, raw: data };
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
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { status, mediaUrl } = await pollGenerationStatus(pollMethod, taskId, options?.token);
    await options?.onTick?.(status);

    if (status === "success" || status === "completed") {
      if (!mediaUrl) {
        throw new Error("任务成功但未返回媒体 URL");
      }
      return mediaUrl;
    }

    if (status === "fail" || status === "failed" || status === "error") {
      throw new Error("Vidmor 生成失败");
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
    defineModelName: GPT_IMAGE_20.defineModelName,
    costCoin,
    params: {
      model: GPT_IMAGE_20.model,
      prompt,
      imageUrl,
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
}: {
  prompt: string;
  imageUrl: string;
  costCoin: number;
}) {
  return {
    method: SEEDANCE_20.submitMethod,
    appId: VIDMOR_DEFAULTS.appId,
    sourcePlat: "WEB",
    defineModelName: SEEDANCE_20.defineModelName,
    costCoin,
    params: {
      prompt,
      duration: SEEDANCE_20.duration,
      quality: SEEDANCE_20.resolution,
      resolution: SEEDANCE_20.resolution,
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
