import { createLocalServices, getAppConfigDir } from "@idexal/services/node";
import {
  materializeBundledIdexalBuiltinProviderConfig,
  readBundledIdexalBuiltinProviderConfig,
} from "./bundledIdexalBuiltinProviderConfig.js";
import { createHttpServer } from "./http.js";

async function main(): Promise<void> {
  const idexalBuiltinProviderConfigFilePath = await materializeBundledIdexalBuiltinProviderConfig({
    environmentConfigRoot: getAppConfigDir(),
    content: readBundledIdexalBuiltinProviderConfig(),
  });
  const port = Number(process.env["PORT"]) || 3030;
  const host =
    process.env["IDEXAL_SERVER_HOST"]?.trim() || process.env["HOST"]?.trim() || undefined;
  const staticRoot = process.env["IDEXAL_WEB_STATIC_ROOT"]?.trim() || undefined;
  const authToken = process.env["IDEXAL_SERVER_AUTH_TOKEN"]?.trim() || undefined;
  const services = createLocalServices({
    idexalBuiltinProviderConfigFilePath,
    providerProvisioningTargetEnabled: Boolean(authToken),
  });

  createHttpServer(services, port, {
    ...(host ? { host } : {}),
    ...(staticRoot ? { staticRoot, spaFallback: true } : {}),
    ...(authToken ? { authToken, authRequired: true } : {}),
  });
}

void main().catch((error: unknown) => {
  console.error("[idexal-server:http] startup failed", error);
  process.exitCode = 1;
});
