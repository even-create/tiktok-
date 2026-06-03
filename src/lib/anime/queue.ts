import { after } from "next/server";
import {
  claimNextQueuedAnimeJob,
  countRunningAnimeJobs,
  resolveMaxConcurrentAnimeJobs,
  type AnimeJobRecord,
} from "@/lib/anime/jobs";
import { runAnimePipelineSafe } from "@/lib/anime/pipeline";

function startQueuedJob(job: AnimeJobRecord) {
  after(async () => {
    await runAnimePipelineSafe(job.id);
  });
}

export async function processAnimeJobQueue() {
  const maxConcurrent = resolveMaxConcurrentAnimeJobs();
  let runningCount = await countRunningAnimeJobs();
  let started = 0;

  while (runningCount < maxConcurrent) {
    const nextJob = await claimNextQueuedAnimeJob();
    if (!nextJob) {
      break;
    }

    startQueuedJob(nextJob);
    runningCount += 1;
    started += 1;
  }

  return {
    maxConcurrent,
    runningCount,
    started,
  };
}
