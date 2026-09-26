import { useIdexalStoreWithDefault } from "@/store/StoreProvider.js";

export function useIsOfficeMode(): boolean {
  return useIdexalStoreWithDefault((state) => state.interfaceMode === "office", false);
}
