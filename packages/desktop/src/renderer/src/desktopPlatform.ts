import { recordArmsCustomEventForE2E } from "@idexal/ui";
import {
  localeFromLanguageTag,
  DesktopCommandIds,
  buildLocalMediaPreviewUrl,
  type IPlatformService,
} from "@idexal/shared";

import { desktopBrowserPlatformBridge } from "./desktopBrowserPlatformBridge.js";

export function createDesktopPlatform(options: {
  isLocalDevelopmentRuntime: boolean;
}): IPlatformService {
  return {
    canSelectFilePath: true,
    createLocalMediaPreviewUrl: buildLocalMediaPreviewUrl,
    isLocalDevelopmentRuntime: options.isLocalDevelopmentRuntime,
    selectDirectory: () => window.idexal.selectDirectory(),
    selectFile: () => window.idexal.selectFile(),
    selectFiles: () => window.idexal.selectFiles?.() ?? Promise.resolve([]),
    createTempTextAttachment: (payload) => window.idexal.createTempTextAttachment(payload),
    onRemoteConnectionLog: (handler) => window.idexal.onRemoteConnectionLog(handler),
    onRemoteSessionClosed: (handler) => window.idexal.onRemoteSessionClosed(handler),
    onBotRemoteWorkspaceReconnected: (handler) =>
      window.idexal.onBotRemoteWorkspaceReconnected(handler),
    activateOrSetWorkspace: (path) =>
      window.idexal.activateOrSetWorkspace?.(path) ?? Promise.resolve({ activated: false }),
    connectRemote: (remoteOptions, requestId, context) =>
      window.idexal.connectRemote(remoteOptions, requestId, context),
    cancelPendingRemoteConnection: (requestId) =>
      window.idexal.cancelPendingRemoteConnection?.(requestId) ?? Promise.resolve(),
    bindRemoteWorkspaceSessionContext: (context) =>
      window.idexal.bindRemoteWorkspaceSessionContext?.(context) ?? Promise.resolve(),
    disposeRemoteSession: (sessionId) => window.idexal.disposeRemoteSession(sessionId),
    isDockerAvailable: () => window.idexal.isDockerAvailable(),
    listWSLDistros: () => window.idexal.listWSLDistros(),
    listDockerContainers: () => window.idexal.listDockerContainers(),
    listSSHConfigAliases: () => window.idexal.listSSHConfigAliases(),
    loadMcpFromUserDirectory: (payload) => window.idexal.loadMcpFromUserDirectory(payload),
    saveMcpToUserDirectory: (payload) => window.idexal.saveMcpToUserDirectory(payload),
    migrateLegacyCommonMcp: (payload) => window.idexal.migrateLegacyCommonMcp(payload),
    openExternal: (url) => window.idexal.openExternal(url),
    openFeedback: () => window.idexal.executeDesktopCommand(DesktopCommandIds.OpenFeedback),
    openCommunity: () => window.idexal.executeDesktopCommand(DesktopCommandIds.OpenCommunity),
    canOpenCommunity: (locale) => window.idexal.canOpenCommunity(locale),
    openInFileManager: (path) => window.idexal.openInFileManager(path),
    openExternalFile: (path) => window.idexal.openExternalFile(path),
    openCuaPermissionOnboarding: window.idexal.openCuaPermissionOnboarding
      ? (permissionOptions) =>
          window.idexal.openCuaPermissionOnboarding?.(permissionOptions) ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    prepareCuaHelperPermissionDrag: window.idexal.prepareCuaHelperPermissionDrag
      ? () =>
          window.idexal.prepareCuaHelperPermissionDrag?.() ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    startCuaHelperPermissionDrag: window.idexal.startCuaHelperPermissionDrag
      ? () => window.idexal.startCuaHelperPermissionDrag?.()
      : undefined,
    registerOAuthState: (payload) => window.idexal.registerOAuthState(payload),
    onOAuthCallback: (callback) => window.idexal.onOAuthCallback(callback),
    onPaymentCallback: (callback) => window.idexal.onPaymentCallback(callback),
    onShareImport: (callback) => window.idexal.onShareImport?.(callback) ?? (() => {}),
    notifyRendererReady: () => window.idexal.notifyRendererReady(),
    reportTelemetryEvent: (payload) => window.idexal.reportTelemetryEvent(payload),
    reportArmsCustomEvent: (payload) => {
      recordArmsCustomEventForE2E(payload);
      return window.idexal.reportArmsCustomEvent(payload);
    },
    getRendererActionTraceConfig: window.idexal.getRendererActionTraceConfig
      ? () => window.idexal.getRendererActionTraceConfig!()
      : undefined,
    onRendererActionTraceConfigChanged: window.idexal.onRendererActionTraceConfigChanged
      ? (callback) => window.idexal.onRendererActionTraceConfigChanged!(callback)
      : undefined,
    reportLocalTtftBatch: (batch) => window.idexal.reportLocalTtftBatch(batch),
    reportRendererActionTraceBatch: window.idexal.reportRendererActionTraceBatch
      ? (batch) => window.idexal.reportRendererActionTraceBatch!(batch)
      : undefined,
    reportRendererHeapSample: window.idexal.reportRendererHeapSample
      ? (sample) => window.idexal.reportRendererHeapSample!(sample)
      : undefined,
    showTaskNotification: (payload) => window.idexal.showTaskNotification(payload),
    syncWindowTabs: (paths) => window.idexal.syncWindowTabs(paths),
    syncWindowUnreadCount: (count) => window.idexal.syncWindowUnreadCount(count),
    syncActiveTaskSession: (sessionId) => window.idexal.syncActiveTaskSession(sessionId),
    syncAppSettings: (patch) => window.idexal.syncAppSettings?.(patch),
    setShortcutRecordingActive: (active) => window.idexal.setShortcutRecordingActive?.(active),
    onFocusTab: (handler) => window.idexal.onFocusTab(handler),
    onNewTab: (handler) => window.idexal.onNewTab(handler),
    onCloseActiveContextRequest: (handler) =>
      window.idexal.onCloseActiveContextRequest?.(handler) ?? (() => {}),
    onOpenBrowserUrl: (handler) => window.idexal.onOpenBrowserUrl?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfacePrepare: (handler) =>
      window.idexal.onBrowserViewScreenshotSurfacePrepare?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfaceRelease: (handler) =>
      window.idexal.onBrowserViewScreenshotSurfaceRelease?.(handler) ?? (() => {}),
    browserViewScreenshotSurfaceReady: (payload) =>
      window.idexal.browserViewScreenshotSurfaceReady?.(payload),
    ...desktopBrowserPlatformBridge,
    onNewTask: (handler) => window.idexal.onNewTask(handler),
    onOpenWorkspace: (handler) => {
      // 开发态或升级后的旧窗口可能仍运行未暴露 onOpenWorkspace 的 preload，
      // renderer 直接调用会在启动时崩溃。这里和 activateOrSetWorkspace 一样做兼容兜底，
      // 缺少该 bridge 时只禁用原生菜单回调，不影响应用继续打开。
      return window.idexal.onOpenWorkspace?.(handler) ?? (() => {});
    },
    onOpenWorkspacePath: (handler) => window.idexal.onOpenWorkspacePath?.(handler) ?? (() => {}),
    onOpenFeedbackDialog: (handler) => window.idexal.onOpenFeedbackDialog?.(handler) ?? (() => {}),
    onOpenTicketsPanel: (handler) => window.idexal.onOpenTicketsPanel?.(handler) ?? (() => {}),
    onWindowFullscreenChanged: (handler) => window.idexal.onWindowFullscreenChanged(handler),
    getDesktopWindowChromeState: window.idexal.getDesktopWindowChromeState
      ? () => window.idexal.getDesktopWindowChromeState!()
      : undefined,
    onDesktopWindowChromeStateChanged: window.idexal.onDesktopWindowChromeStateChanged
      ? (handler) => window.idexal.onDesktopWindowChromeStateChanged!(handler)
      : undefined,
    getWindowControlsOverlayMetrics: () =>
      window.idexal.getWindowControlsOverlayMetrics?.() ?? null,
    onWindowControlsOverlayChanged: (handler) =>
      window.idexal.onWindowControlsOverlayChanged?.(handler) ?? (() => {}),
    getDesktopZoomLevel: () =>
      window.idexal.getDesktopZoomLevel?.() ?? Promise.resolve({ zoomLevel: 0 }),
    onDesktopZoomLevelChanged: (handler) =>
      window.idexal.onDesktopZoomLevelChanged?.(handler) ?? (() => {}),
    onTaskNotificationClick: (handler) => window.idexal.onTaskNotificationClick(handler),
    exportLogs: () => window.idexal.exportLogs(),
    captureWindowScreenshot: () =>
      window.idexal.captureWindowScreenshot?.() ?? Promise.resolve(null),
    onUpdateReady: (callback) => window.idexal.onUpdateReady(callback),
    onUpdateCheckResult: (callback) => window.idexal.onUpdateCheckResult(callback),
    onUpdateStateChanged: (callback) =>
      window.idexal.onUpdateStateChanged?.(callback) ?? (() => {}),
    getUpdateState: () =>
      window.idexal.getUpdateState?.() ?? Promise.resolve({ kind: "idle", enabled: true }),
    downloadUpdate: () => window.idexal.downloadUpdate?.() ?? Promise.resolve(),
    cancelUpdateDownload: () => window.idexal.cancelUpdateDownload?.() ?? Promise.resolve(),
    openUpdateStatusWindow: () => window.idexal.openUpdateStatusWindow?.() ?? Promise.resolve(),
    getAutoUpdatePreferences: () =>
      window.idexal.getAutoUpdatePreferences?.() ??
      Promise.resolve({ autoDownloadAndInstallUpdates: false }),
    setAutoDownloadAndInstallUpdates: (enabled) =>
      window.idexal.setAutoDownloadAndInstallUpdates?.(enabled) ?? Promise.resolve(),
    getDesktopSessionActivity: () =>
      window.idexal.getDesktopSessionActivity?.() ??
      Promise.resolve({ runningAgentSessionCount: 0 }),
    getIdexalStdioTapDevState: () =>
      window.idexal.getIdexalStdioTapDevState?.() ??
      Promise.resolve({ enabled: false, visible: false, logDir: "", statePath: "" }),
    onSettingsChanged: (callback) => window.idexal.onSettingsChanged?.(callback) ?? (() => {}),
    onApplicationLocaleChanged: (callback) =>
      window.idexal.onApplicationLocaleChanged?.(callback) ?? (() => {}),
    onPostUpdateReleaseNotes: (callback) => window.idexal.onPostUpdateReleaseNotes(callback),
    acknowledgePostUpdateReleaseNotes: (version) =>
      window.idexal.acknowledgePostUpdateReleaseNotes(version),
    skipUpdateVersion: (version) => window.idexal.skipUpdateVersion?.(version) ?? Promise.resolve(),
    quitAndInstallUpdate: () => window.idexal.quitAndInstallUpdate(),
    getInstalledEditors: () => window.idexal.getInstalledEditors(),
    getApplicationIcon: (bundleId) =>
      window.idexal.getApplicationIcon?.(bundleId) ?? Promise.resolve(null),
    openInEditor: (editorId, path, editorOptions) =>
      window.idexal.openInEditor(editorId, path, editorOptions),
    executeDesktopCommand: (command) => window.idexal.executeDesktopCommand(command),
    setApplicationLocale: (locale) => window.idexal.setApplicationLocale(locale),
    getSystemLocale: () =>
      window.idexal.getSystemLocale?.() ??
      Promise.resolve(localeFromLanguageTag(navigator.language)),
    setTitleBarTheme: (theme) => window.idexal.setTitleBarTheme(theme),
    getDeviceId: () =>
      (window as Window & { __IDEXAL_DEVICE_ID__?: string }).__IDEXAL_DEVICE_ID__ ?? "",
  };
}
