import type { BrowserBackendDescriptor } from "@idexal/contracts";

export function createManagedCdpDescriptor(
  browserId: string,
  generation: number,
): BrowserBackendDescriptor {
  return {
    id: browserId,
    generation,
    type: "cdp",
    name: "Idexal Headless Chromium",
    capabilities: {
      browser: [],
      tab: [],
    },
    apiSupportOverrides: {
      "BrowserUser.openTabs": false,
      "BrowserUser.history": false,
      "PlaywrightAPI.waitForEvent": false,
      "PlaywrightDownload.path": false,
      "PlaywrightFileChooser.setFiles": false,
      "PlaywrightLocator.downloadMedia": false,
      "PlaywrightLocator.evaluate": false,
      "CUAAPI.downloadMedia": false,
      "DomCUAAPI.downloadMedia": false,
    },
    metadata: {
      provider: "idexal-cli",
      launchMode: "managed",
      headless: "true",
    },
  };
}
