import { GPT_IMAGE_20, SEEDANCE_20 } from "@/lib/vidmor/config";

const SPEECH_ACTION_OVERRIDES: Record<string, string> = {
  脱下手套: "脱掉手套",
};

export const DEFAULT_IMAGE_PROMPT_TEMPLATE =
  "帮我生成一张与这个照片风格类似的漫画，画面中不要有文字，画面比例为9:16，背景可以改变，背景和人物动作要符合漫画内容，主角为我给你发的这个人，漫画内容：他在{action}，这个是提示词，只要更改动作即可";

export const DEFAULT_VIDEO_PROMPT_TEMPLATE =
  'As he ({motionAction}), he repeats twice: "I am ({speechAction})." The first time at normal speed, the second time slower, with a one-second pause between the two sentences. Please do not move the camera.';

export const VIDEO_DURATION_OPTIONS = [5, 10] as const;
export const VIDEO_RESOLUTION_OPTIONS = ["720p", "1080p"] as const;

function normalizeAction(action: string) {
  return action.trim();
}

function applyTemplate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

/** 台词括号内动作，可与画面动作略有不同（如 脱下手套 → 脱掉手套） */
export function buildSpeechAction(action: string) {
  const normalized = normalizeAction(action);
  return SPEECH_ACTION_OVERRIDES[normalized] ?? normalized;
}

export function buildImageToVideoPrompt(action: string, template = DEFAULT_VIDEO_PROMPT_TEMPLATE) {
  const motionAction = normalizeAction(action);
  const speechAction = buildSpeechAction(action);
  return applyTemplate(template, { motionAction, speechAction, action: motionAction });
}

export function buildImageToImagePrompt(action: string, template = DEFAULT_IMAGE_PROMPT_TEMPLATE) {
  const normalizedAction = normalizeAction(action);
  return applyTemplate(template, { action: normalizedAction, speechAction: buildSpeechAction(action) });
}

export function buildImageCostPayload(prompt: string) {
  return {
    mediaType: "image",
    chooseVoice: 0,
    method: GPT_IMAGE_20.submitMethod,
    prompt,
    number: 1,
    defineModelName: GPT_IMAGE_20.apiDefineModelName,
  };
}

export function buildVideoCostPayload(
  prompt: string,
  options?: { duration?: number; resolution?: string },
) {
  const duration = options?.duration ?? SEEDANCE_20.duration;
  const resolution = options?.resolution ?? SEEDANCE_20.resolution;

  return {
    mediaType: "video",
    resoution: resolution,
    chooseVoice: 0,
    duration,
    method: SEEDANCE_20.submitMethod,
    prompt,
    defineModelName: SEEDANCE_20.defineModelName,
  };
}

export const EXAMPLE_ACTIONS = ["戴手套", "脱下手套", "整理领带", "看向窗外", "端起咖啡杯"];
