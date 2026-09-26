/**
 * Idexal session UI 状态 store
 *
 * 一个 tab 对应一个 workspace，所以聊天相关状态也必须按 workspace 分桶保存。
 * 这样切换标签页时，当前任务、输入中的草稿态和初始化状态才不会互相串台。
 */
import { create } from "zustand";
import { shouldExposeE2EStoreBridge } from "@/lib/e2eStoreBridge.js";
import { type IdexalSessionStoreState } from "./idexalSessionStoreTypes.js";
import { getWorkspaceState } from "./idexalSessionStoreSelectors.js";
import { createNavigationSlice } from "./idexalSessionStoreNavigation.js";
import { createTaskSlice } from "./idexalSessionStoreTaskSlice.js";
import { createWorkspaceSlice } from "./idexalSessionStoreWorkspaceSlice.js";
import { uiMemoryDiagnosticsRegistry } from "@/lib/memoryDiagnostics.js";

export const useIdexalSessionStore = create<IdexalSessionStoreState>()((set, get) => ({
  workspaces: {},
  ...createNavigationSlice(set, get),
  ...createWorkspaceSlice(set),
  ...createTaskSlice(set),
  getWorkspaceState: (workspacePath: string, workspaceIdentity?: string) =>
    getWorkspaceState(get(), workspacePath, workspaceIdentity),
}));

type IdexalSessionStoreE2EBridge = typeof useIdexalSessionStore;

declare global {
  interface Window {
    __idexalSessionStoreE2E?: IdexalSessionStoreE2EBridge;
  }
}

if (shouldExposeE2EStoreBridge()) {
  // E2E 诊断入口必须由 WDIO 显式打开，不能复用 IDEXAL_ENV=test，避免产品测试环境暴露可变全局 store。
  window.__idexalSessionStoreE2E = useIdexalSessionStore;
}

// ────────────────────────────────────────────
// Re-exports: 保持外部 `from '@/store/idexalSessionStore'` 的导入路径继续工作
// ────────────────────────────────────────────
export * from "./idexalSessionStoreTypes.js";
export * from "./idexalSessionStoreSelectors.js";
// Re-export navigation types used externally:
export type {
  TaskNavigationHistory,
  TaskNavEntry,
  WorkspaceNavEntry,
} from "@/lib/taskNavigationHistory.js";

// 内存诊断计数器：workspace 桶全仓无删除路径，先落日志。
uiMemoryDiagnosticsRegistry.register("sessionStore", () => ({
  workspaces: Object.keys(useIdexalSessionStore.getState().workspaces).length,
}));
