import type { IdexalAppOptions } from "@idexal/bootstrap";
import type { CliEnv } from "./env.js";
import { loadBootstrapModule } from "./bootstrap-loader.js";
import type { CliResumeRequest, RunDependencies } from "./cli-types.js";

export const resolveResumeSession = async (
  request: CliResumeRequest,
  workingDirectory: string,
  env: CliEnv,
  deps: RunDependencies,
): Promise<IdexalAppOptions["sessionId"] | undefined> => {
  if (request.resumeSessionId) {
    return request.resumeSessionId as IdexalAppOptions["sessionId"];
  }

  if (!request.continueSession) {
    return undefined;
  }

  const resolveLatest =
    deps.resolveLatestSession ?? (await loadBootstrapModule()).resolveLatestSession;
  const latest = await resolveLatest({
    directory: workingDirectory,
    env,
  });
  if (!latest) {
    throw new Error(`No resumable session found for ${workingDirectory}`);
  }
  return latest.id;
};
