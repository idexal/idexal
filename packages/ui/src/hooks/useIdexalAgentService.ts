import type { IIdexalAgentService } from "@idexal/services";
import { useServices } from "@/hooks/useServices.js";
import { useWorkspaceServices } from "@/hooks/useWorkspaceServices.js";

export function useIdexalAgentService(
  workspacePath?: string,
  preferredRemoteSessionId?: string | null,
  workspaceIdentity?: string | null,
): IIdexalAgentService {
  // hook 不能写在三元分支里：workspacePath 由空变有时 hook 数量会变，宿主子树会报
  // "change in the order of Hooks" 并崩溃。两个分支都无条件调用，只在取值时分派，
  // 才能保持 workspacePath 为空时返回 context services 而不是 base services。
  const contextServices = useServices();
  const workspaceServices = useWorkspaceServices(
    workspacePath ?? null,
    preferredRemoteSessionId,
    workspaceIdentity,
  );
  const services = workspacePath ? workspaceServices : contextServices;
  return services.idexalAgentService;
}
