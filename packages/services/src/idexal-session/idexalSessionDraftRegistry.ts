import type { IdexalSessionStateSnapshot } from "@idexal/shared";
import type {
  IdexalSessionWorkspaceTarget,
  IdexalTaskTarget,
} from "#src/idexal-session/idexalSession.js";

function getWorkspaceKey(target: IdexalSessionWorkspaceTarget): string {
  return target.workspaceIdentity?.trim() || target.workspacePath;
}

function getSessionScopedKey(target: IdexalTaskTarget): string {
  return `${getWorkspaceKey(target)}\0${target.sessionId}`;
}

export function createIdexalDeferredDraftRegistry() {
  const sessionKeys = new Set<string>();

  return {
    remember(params: IdexalSessionWorkspaceTarget, snapshot: IdexalSessionStateSnapshot): void {
      sessionKeys.add(
        getSessionScopedKey({
          workspacePath: snapshot.session.workspace.workspacePath,
          workspaceIdentity:
            snapshot.session.workspace.workspaceIdentity ?? params.workspaceIdentity,
          sessionId: snapshot.session.sessionId,
        }),
      );
    },

    has(target: IdexalTaskTarget): boolean {
      return sessionKeys.has(getSessionScopedKey(target));
    },

    forget(target: IdexalTaskTarget): void {
      sessionKeys.delete(getSessionScopedKey(target));
    },
  };
}
