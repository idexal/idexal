import { randomUUID } from "node:crypto";
import type { BrowserControlPort, TraceContext } from "@idexal/contracts";
import {
  idexalBrowserExecuteResultSchema,
  idexalBrowserListResultSchema,
  idexalProtocolMethods,
} from "@idexal/shared";
import {
  protocolTraceFromTraceContext,
  requireSession,
  type IdexalProtocolAgentServerContext,
  type IdexalProtocolClientRequestOptions,
} from "./server-types.js";

/**
 * ProtocolBrowserControlBroker —— agent 侧 BrowserControlPort 实现。
 *
 * browser-client 的 agent.browsers.* 每个调用经此把一条 BrowserCommand 变成
 * Idexal Protocol 的 interaction/browserExecute 反向请求，由 app（host→main WebContentsView/CDP）
 * 执行并返回结果。与 permission broker 并列注入（server-operations 的 createWorkspaceIdexalApp options）。
 */
export function createProtocolBrowserControlBroker(
  context: IdexalProtocolAgentServerContext,
): BrowserControlPort {
  const connectionsBySession = new Map<
    string,
    Map<string, { browserId: string; browserGeneration: number }>
  >();

  const rememberConnection = (sessionId: string, browserId: string, browserGeneration: number) => {
    const connections = connectionsBySession.get(sessionId) ?? new Map();
    connections.set(`${browserId}\u0000${browserGeneration}`, { browserId, browserGeneration });
    connectionsBySession.set(sessionId, connections);
  };

  const sendLifecycle = async (
    sessionId: string,
    turnId: string | undefined,
    command: { method: "turnEnded"; turnId?: string } | { method: "closeSession" },
  ): Promise<void> => {
    const connections = [...(connectionsBySession.get(sessionId)?.values() ?? [])];
    await Promise.allSettled(
      connections.map(({ browserId, browserGeneration }) =>
        context.requestClient(
          idexalProtocolMethods.interactionBrowserExecute,
          {
            ...buildBrowserRequestContext(context, { sessionId, turnId }),
            browserId,
            browserGeneration,
            command,
          },
          idexalBrowserExecuteResultSchema,
        ),
      ),
    );
  };

  return {
    async list({ sessionId, turnId, traceContext, signal }) {
      const result = await context.requestClient(
        idexalProtocolMethods.interactionBrowserList,
        buildBrowserRequestContext(context, { sessionId, turnId, traceContext }),
        idexalBrowserListResultSchema,
        buildRequestOptions(traceContext, signal),
      );
      return result.browsers;
    },

    async execute({
      browserId,
      browserGeneration,
      sessionId,
      turnId,
      command,
      traceContext,
      signal,
    }) {
      rememberConnection(sessionId, browserId, browserGeneration);
      const requestContext = buildBrowserRequestContext(context, {
        sessionId,
        turnId,
        traceContext,
      });
      const cancelBackendRequest = () => {
        // 只取消 agent 侧 requestClient 会让 host/main 的 CDP 动作继续执行。
        // 这里用同一 backend/generation 发送内部 cancelRequest，main 再按原 requestId 中断 waiter；
        // 已下发动作无法证明无副作用时由 manager 返回 uncertain 标记。
        void context
          .requestClient(
            idexalProtocolMethods.interactionBrowserExecute,
            {
              ...buildBrowserRequestContext(context, { sessionId, turnId, traceContext }),
              browserId,
              browserGeneration,
              command: { method: "cancelRequest", requestId: requestContext.requestId },
            },
            idexalBrowserExecuteResultSchema,
            buildRequestOptions(traceContext, undefined),
          )
          .catch(() => undefined);
      };
      if (signal?.aborted) cancelBackendRequest();
      else signal?.addEventListener("abort", cancelBackendRequest, { once: true });
      try {
        return await context.requestClient(
          idexalProtocolMethods.interactionBrowserExecute,
          {
            ...requestContext,
            browserId,
            browserGeneration,
            command,
          },
          idexalBrowserExecuteResultSchema,
          buildRequestOptions(traceContext, signal),
        );
      } finally {
        signal?.removeEventListener("abort", cancelBackendRequest);
      }
    },

    async turnEnded({ sessionId, turnId }) {
      await sendLifecycle(sessionId, turnId, { method: "turnEnded", turnId });
    },

    async closeSession({ sessionId, turnId }) {
      await sendLifecycle(sessionId, turnId, { method: "closeSession" });
      connectionsBySession.delete(sessionId);
    },
  };
}

function buildBrowserRequestContext(
  context: IdexalProtocolAgentServerContext,
  input: {
    sessionId: string;
    turnId?: string;
    traceContext?: TraceContext;
  },
) {
  const record = requireSession(context, input.sessionId);
  const workspaceIdentity = record.workspace.workspaceIdentity?.trim() || undefined;
  const remoteSessionId = record.workspace.remoteSessionId?.trim() || undefined;
  const workspacePath = record.workspace.workspacePath;

  return {
    requestId: randomUUID(),
    sessionId: input.sessionId,
    ...((input.turnId ?? input.traceContext?.turnId)
      ? { turnId: String(input.turnId ?? input.traceContext?.turnId) }
      : {}),
    // workspacePath 可能在不同 remote workspace 中相同，隔离 key 必须优先使用
    // workspaceIdentity，避免 browser backend/tab ownership 跨工作区串线。
    workspaceKey: workspaceIdentity ?? workspacePath,
    workspacePath,
    ...(workspaceIdentity ? { workspaceIdentity } : {}),
    ...(remoteSessionId ? { remoteSessionId } : {}),
    clientMode: record.deliveryKind ?? "desktop-continuous",
    sessionContext: "live" as const,
  };
}

function buildRequestOptions(
  traceContext: TraceContext | undefined,
  signal: AbortSignal | undefined,
): IdexalProtocolClientRequestOptions {
  return {
    ...(signal ? { signal } : {}),
    ...(traceContext ? { trace: protocolTraceFromTraceContext(traceContext) } : {}),
  };
}
