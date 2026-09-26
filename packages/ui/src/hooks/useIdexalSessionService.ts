import type { IIdexalSessionService } from "@idexal/services";
import { useServices } from "@/hooks/useServices.js";
import { useWorkspaceServices } from "@/hooks/useWorkspaceServices.js";

export function useIdexalSessionService(
  workspacePath?: string,
  preferredRemoteSessionId?: string | null,
  workspaceIdentity?: string | null,
): IIdexalSessionService {
  // 两个 hook 必须无条件调用：把 hook 写在三元分支里会让 hook 数量随 workspacePath
  // 变化，Web 首帧 workspacePath 还是空、随后才解析出来，于是宿主组件（实测
  // OnboardingDialog）报 "change in the order of Hooks" 并整棵子树被错误边界接走。
  // 只在取值时分派，才能保持 workspacePath 为空时仍返回 context services 而不是 base services。
  const contextServices = useServices();
  const workspaceServices = useWorkspaceServices(
    workspacePath ?? null,
    preferredRemoteSessionId,
    workspaceIdentity,
  );
  const services = workspacePath ? workspaceServices : contextServices;
  return services.idexalSessionService;
}
