import type { IdexalSessionStateSnapshot } from "@idexal/shared";
import { createServiceLogger } from "#src/logger/serviceLogger.js";
import { repairImportedClaudeSessionSnapshot } from "#src/session/claude-native/importedClaudeHistoryRepair.js";
import type { IIdexalAgentService } from "#src/idexal-agent/idexalAgent.js";
import type {
  IdexalSessionReadParams,
  IdexalSessionResumeParams,
} from "#src/idexal-session/idexalSession.js";

const logger = createServiceLogger("idexal-session-service");

export async function repairEmptyImportedClaudeSessionSnapshot(params: {
  agentService: IIdexalAgentService;
  snapshot: IdexalSessionStateSnapshot;
  target: IdexalSessionResumeParams | IdexalSessionReadParams;
}): Promise<IdexalSessionStateSnapshot> {
  const repaired = await repairImportedClaudeSessionSnapshot({
    snapshot: params.snapshot,
    target: {
      workspacePath: params.target.workspacePath,
      workspaceIdentity: params.target.workspaceIdentity,
      taskId: params.target.sessionId,
      ...("mcpServers" in params.target && params.target.mcpServers
        ? { mcpServers: params.target.mcpServers }
        : {}),
    },
    createSession: (input) => params.agentService.createSession(input),
    onRepair: (history) => {
      logger.warn(
        undefined,
        `[idexal-session-service] Claude 导入 session 历史异常，按 ${history.source} 回填 taskId=${params.target.sessionId}`,
      );
    },
  });
  return repaired ?? params.snapshot;
}
