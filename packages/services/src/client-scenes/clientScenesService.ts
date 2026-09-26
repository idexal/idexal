import type { ApiClient } from "@idexal/shared";
import { readApiJson } from "../providers/api/apiJson.js";
import { IDEXAL_CLIENT_SCENES_URL } from "../providers/api/apiEndpoints.js";
import type { ClientScenesResponse, IClientScenesService } from "./clientScenes.js";

export function createClientScenesService(dependencies: {
  apiClient: ApiClient;
}): IClientScenesService {
  return {
    list: () =>
      readApiJson<ClientScenesResponse>(dependencies.apiClient, IDEXAL_CLIENT_SCENES_URL, {
        method: "GET",
      }),
  };
}
