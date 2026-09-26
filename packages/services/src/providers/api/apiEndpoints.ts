import { buildRuntimeIdexalApiUrl, resolveZaiBusinessBaseUrl } from "@idexal/shared";

export const IDEXAL_CLIENT_SCENES_URL = buildRuntimeIdexalApiUrl(
  process.env,
  "/api/v1/client/scenes",
);

export const ZAI_API_HOST = resolveZaiBusinessBaseUrl(process.env);
