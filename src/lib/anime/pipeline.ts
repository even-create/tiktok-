import {
  buildImageCostPayload,
  buildImageToImagePrompt,
  buildImageToVideoPrompt,
  buildVideoCostPayload,
} from "@/lib/anime/prompts";
import { updateAnimeJob } from "@/lib/anime/jobs";
import {
  buildImageToImageRequest,
  buildImageToVideoRequest,
  pollUntilComplete,
  queryCoinCost,
  submitGeneration,
  uploadImageFromUrl,
} from "@/lib/vidmor/client";
import { getAnimeCharacter, getPublicAssetUrl, resolveVidmorToken, GPT_IMAGE_20, SEEDANCE_20 } from "@/lib/vidmor/config";

export async function runAnimePipeline(
  jobId: string,
  characterId: string,
  action: string,
  referenceImageUrl?: string | null,
) {
  const token = resolveVidmorToken();
  if (!token) {
    throw new Error("未配置 VIDMOR_TOKEN");
  }

  const character = getAnimeCharacter(characterId);
  if (!character) {
    throw new Error("未找到角色配置");
  }

  await updateAnimeJob(jobId, { status: "running", stage: "uploading", progress: 5 });

  const uploadedReferenceUrl = referenceImageUrl?.trim()
    ? referenceImageUrl.trim()
    : await uploadImageFromUrl(getPublicAssetUrl(character.refImagePath), token);

  const imagePrompt = buildImageToImagePrompt(action);
  const imageCost = await queryCoinCost(buildImageCostPayload(imagePrompt), token);

  await updateAnimeJob(jobId, { stage: "image_to_image", progress: 20 });

  const imageTaskId = await submitGeneration(
    buildImageToImageRequest({
      prompt: imagePrompt,
      imageUrl: uploadedReferenceUrl,
      costCoin: imageCost,
    }),
    token,
  );

  const generatedImageUrl = await pollUntilComplete(GPT_IMAGE_20.pollMethod, imageTaskId, {
    token,
    onTick: async (status) => {
      if (status === "processing" || status === "pending" || status === "running") {
        await updateAnimeJob(jobId, { progress: 45 });
      }
    },
  });

  await updateAnimeJob(jobId, {
    stage: "image_to_video",
    progress: 60,
    image_url: generatedImageUrl,
  });

  const videoPrompt = buildImageToVideoPrompt(action);
  const videoCost = await queryCoinCost(buildVideoCostPayload(videoPrompt), token);
  const videoTaskId = await submitGeneration(
    buildImageToVideoRequest({
      prompt: videoPrompt,
      imageUrl: generatedImageUrl,
      costCoin: videoCost,
    }),
    token,
  );

  const generatedVideoUrl = await pollUntilComplete(SEEDANCE_20.pollMethod, videoTaskId, {
    token,
    timeoutMs: 240_000,
    onTick: async (status) => {
      if (status === "processing" || status === "pending" || status === "running") {
        await updateAnimeJob(jobId, { progress: 85 });
      }
    },
  });

  await updateAnimeJob(jobId, {
    status: "success",
    stage: "completed",
    progress: 100,
    video_url: generatedVideoUrl,
  });
}

export async function runAnimePipelineSafe(
  jobId: string,
  characterId: string,
  action: string,
  referenceImageUrl?: string | null,
) {
  try {
    await runAnimePipeline(jobId, characterId, action, referenceImageUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    await updateAnimeJob(jobId, {
      status: "failed",
      stage: "failed",
      error_message: message,
    });
  }
}
