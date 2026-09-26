import type { IdexalBackgroundTaskControlItem } from "./background-task-controls.js";

export function mergeIdexalBackgroundTaskControlItems(
  current: readonly IdexalBackgroundTaskControlItem[],
  updates: readonly IdexalBackgroundTaskControlItem[],
): IdexalBackgroundTaskControlItem[] {
  const jobsById = new Map(current.map((job) => [job.jobId, job] as const));
  for (const job of updates) {
    jobsById.set(job.jobId, job);
  }
  return Array.from(jobsById.values());
}
