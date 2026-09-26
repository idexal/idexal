import {
  idexalProtocolMethods,
  idexalPluginsReferenceCatalogResultSchema,
  type IdexalPluginsReferenceCatalogParams,
} from "@idexal/shared";
import type { IdexalProtocolClient } from "#src/idexal-agent/idexalProtocolClient.js";

/** 旧协议严格校验响应；新展示字段走独立入口，只有 -32601 能证明旧 Agent 不支持。 */
export async function requestPluginReferenceCatalog(
  client: Pick<IdexalProtocolClient, "request">,
  params: IdexalPluginsReferenceCatalogParams,
) {
  try {
    return await client.request(
      idexalProtocolMethods.pluginsReferenceCatalogWithCategory,
      params,
      idexalPluginsReferenceCatalogResultSchema,
    );
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === -32601))
      throw error;
    return client.request(
      idexalProtocolMethods.pluginsReferenceCatalog,
      params,
      idexalPluginsReferenceCatalogResultSchema,
    );
  }
}
