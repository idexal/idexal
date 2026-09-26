import { type IdexalProvider } from "@idexal/shared";

const BOT_NATIVE_MODEL_PROVIDER_PREFIX = "native:";

export function resolveTaskModel(model: string | undefined): string | undefined {
  return model && model !== "default" ? model : undefined;
}

export function getNativeModelProviderId(idexalProvider: IdexalProvider): string {
  return `${BOT_NATIVE_MODEL_PROVIDER_PREFIX}${idexalProvider}`;
}
