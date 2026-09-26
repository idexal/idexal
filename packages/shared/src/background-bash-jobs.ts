import {
  collectVisibleIdexalBackgroundTaskControlItems,
  getIdexalBackgroundTaskControlItemElapsedMs,
  isActiveIdexalBackgroundTaskControlItem,
  parseIdexalBackgroundTaskControlItems,
  type IdexalBackgroundTaskControlItem,
  type IdexalBackgroundTaskControlStatus,
} from "./background-task-controls.js";

export type IdexalBackgroundBashJobStatus = IdexalBackgroundTaskControlStatus;
export type IdexalBackgroundBashJob = IdexalBackgroundTaskControlItem & {
  taskKind: "bash";
};

export function parseIdexalBackgroundBashJobs(value: unknown): IdexalBackgroundBashJob[] {
  return parseIdexalBackgroundTaskControlItems(value).filter(isBackgroundBashJob);
}

export function isActiveIdexalBackgroundBashJob(job: IdexalBackgroundBashJob): boolean {
  return isActiveIdexalBackgroundTaskControlItem(job);
}

export function getIdexalBackgroundBashJobElapsedMs(
  job: IdexalBackgroundBashJob,
  now = Date.now(),
): number {
  return getIdexalBackgroundTaskControlItemElapsedMs(job, now);
}

export function collectVisibleIdexalBackgroundBashJobs(
  jobs: readonly IdexalBackgroundBashJob[],
  now = Date.now(),
  thresholdMs = 30_000,
): Array<IdexalBackgroundBashJob & { elapsedMs: number }> {
  return collectVisibleIdexalBackgroundTaskControlItems(jobs, now, thresholdMs) as Array<
    IdexalBackgroundBashJob & { elapsedMs: number }
  >;
}

function isBackgroundBashJob(job: IdexalBackgroundTaskControlItem): job is IdexalBackgroundBashJob {
  return job.taskKind === "bash";
}
