import { GPT_IMAGE_20, SEEDANCE_20 } from "@/lib/vidmor/config";

const SPEECH_ACTION_OVERRIDES: Record<string, string> = {
  脱下手套: "脱掉手套",
};

function normalizeAction(action: string) {
  return action.trim();
}

/** 台词括号内动作，可与画面动作略有不同（如 脱下手套 → 脱掉手套） */
export function buildSpeechAction(action: string) {
  const normalized = normalizeAction(action);
  return SPEECH_ACTION_OVERRIDES[normalized] ?? normalized;
}

export function buildImageToVideoPrompt(action: string) {
  const motionAction = normalizeAction(action);
  const speechAction = buildSpeechAction(action);
  return `As he (${motionAction}), he repeats twice: "I am (${speechAction})." The first time at normal speed, the second time slower, with a one-second pause between the two sentences. Please do not move the camera.`;
}

export function buildImageToImagePrompt(action: string) {
  const normalizedAction = normalizeAction(action);
  return [
    "帮我生成一张与这个照片风格类似的漫画，画面中不要有文字，画面比例为9:16，",
    "背景可以改变，背景和人物动作要符合漫画内容，主角为我给你发的这个人，",
    `漫画内容：他在${normalizedAction}，这个是提示词，只要更改动作即可`,
  ].join("");
}

export function buildImageCostPayload(prompt: string) {
  return {
    mediaType: "image",
    chooseVoice: 0,
    method: GPT_IMAGE_20.submitMethod,
    prompt,
    number: 1,
    defineModelName: GPT_IMAGE_20.defineModelName,
  };
}

export function buildVideoCostPayload(prompt: string) {
  return {
    mediaType: "video",
    resoution: SEEDANCE_20.resolution,
    chooseVoice: 0,
    duration: SEEDANCE_20.duration,
    method: SEEDANCE_20.submitMethod,
    prompt,
    defineModelName: SEEDANCE_20.defineModelName,
  };
}

export const EXAMPLE_ACTIONS = [
  "戴手套",
  "脱下手套",
  "整理领带",
  "看向窗外",
  "端起咖啡杯",
];
