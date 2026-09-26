/**
 * Idexal Agent Slash Commands 便捷 hook
 *
 * 返回当前 workspace 下 Agent 广播的可用 slash commands 列表。
 */
import { useIdexalSessionStore, selectWorkspaceIdexalState } from "../store/idexalSessionStore.js";

export function useSlashCommands(workspacePath: string, workspaceIdentity?: string) {
  return useIdexalSessionStore(
    (state) => selectWorkspaceIdexalState(state, workspacePath, workspaceIdentity).slashCommands,
  );
}
