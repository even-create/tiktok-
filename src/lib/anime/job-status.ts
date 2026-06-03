import type { AnimeJobRecord } from "@/lib/anime/jobs";

export type AnimeJobTab = "active" | "success" | "failed";

export type AnimeJobDisplayStatus = "queued" | "running" | "success" | "failed";

export function getJobDisplayStatus(job: AnimeJobRecord): AnimeJobDisplayStatus {
  if (job.status === "success") {
    return "success";
  }
  if (job.status === "failed") {
    return "failed";
  }
  if (job.status === "pending" && job.stage === "queued") {
    return "queued";
  }
  return "running";
}

export function getJobStatusLabel(job: AnimeJobRecord) {
  const displayStatus = getJobDisplayStatus(job);
  switch (displayStatus) {
    case "queued":
      return "排队中";
    case "running":
      return "进行中";
    case "success":
      return "已完成";
    case "failed":
      return "失败";
  }
}

export function getJobStageLabel(job: AnimeJobRecord) {
  switch (job.stage) {
    case "queued":
      return "等待队列";
    case "uploading":
      return "上传参考图";
    case "image_to_image":
      return "图生图";
    case "image_to_video":
      return "图生视频";
    case "completed":
      return "完成";
    case "failed":
      return "失败";
    default:
      return job.stage;
  }
}

export function filterJobsByTab(jobs: AnimeJobRecord[], tab: AnimeJobTab) {
  switch (tab) {
    case "active":
      return jobs.filter((job) => {
        const status = getJobDisplayStatus(job);
        return status === "queued" || status === "running";
      });
    case "success":
      return jobs.filter((job) => getJobDisplayStatus(job) === "success");
    case "failed":
      return jobs.filter((job) => getJobDisplayStatus(job) === "failed");
  }
}

export function isJobActive(job: AnimeJobRecord) {
  const status = getJobDisplayStatus(job);
  return status === "queued" || status === "running";
}
