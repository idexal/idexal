import type { WorkspacePurpose, IdexalTaskMeta } from "@idexal/shared";

export type IdexalTaskListKind = "pinned" | "archived" | "timeline" | "active";
export type IdexalTaskListSortBy = "created" | "updated";

export interface IdexalTaskListWorkspaceScope {
  workspacePath: string;
  workspaceIdentity?: string;
  workspacePurpose?: WorkspacePurpose;
}

export interface IdexalTaskListQuery {
  kind: IdexalTaskListKind;
  workspaceScopes: IdexalTaskListWorkspaceScope[];
  sortBy: IdexalTaskListSortBy;
  search?: string;
  limit?: number;
}

export type IdexalTaskListItem = IdexalTaskMeta & {
  searchSnippet?: string;
  searchSnippets?: string[];
};

export interface IdexalTaskListResult {
  items: IdexalTaskListItem[];
  total: number;
  hasMore: boolean;
}

export type IdexalTaskGroupColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

export interface IdexalTaskGroup {
  id: string;
  title: string;
  color: IdexalTaskGroupColor;
  createdAt: number;
  updatedAt: number;
}

export interface IdexalGroupedTaskRef {
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
}

export type IdexalGroupedTaskViewTopLevelNodeRef =
  | { type: "group"; groupId: string }
  | { type: "task"; task: IdexalGroupedTaskRef };

export type IdexalGroupedTaskViewNode =
  | {
      type: "group";
      group: IdexalTaskGroup;
      tasks: IdexalTaskListItem[];
      sortOrder?: number;
    }
  | {
      type: "task";
      task: IdexalTaskListItem;
      sortOrder?: number;
    };

export interface IdexalGroupedTaskView {
  nodes: IdexalGroupedTaskViewNode[];
}

export interface IdexalGroupedTaskViewQuery {
  workspaceScopes: IdexalTaskListWorkspaceScope[];
  includeAllWorkspaces?: boolean;
}

// ── grouped 原始结构（不 join tasks 表）──
// grouped 视图的任务数据源迁到 sessions-index 后，服务端只提供分组结构
// （task_groups / task_group_members / task_group_view_node_orders），
// 由客户端与 sessions-index 会话做 join。

/** 组成员引用（不含任务 meta；task 内容由 sessions-index 提供）。 */
export interface IdexalGroupedTaskViewStructureMember {
  groupId: string;
  /** 服务端口径 workspaceKey（resolveWorkspaceKey：identity ?? path），join 匹配键。 */
  workspaceKey: string;
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
  /** null = 尚未落 sort_order（新加入组）；客户端按 addedAt 降序补内存序。 */
  sortOrder: number | null;
  addedAt: number;
}

/** 顶层节点排序（task_group_view_node_orders，node_key 已解析为结构化引用）。 */
export type IdexalGroupedTaskViewStructureTopOrder =
  | { type: "group"; groupId: string; sortOrder: number }
  | { type: "task"; workspaceKey: string; taskId: string; sortOrder: number };

export interface IdexalGroupedTaskViewStructure {
  /** 已按 workspaceScopes 可见性过滤的 group（bootstrap workspace group 只在其 workspace 可见）。 */
  groups: IdexalTaskGroup[];
  /** 全量组成员（含不可见 group 的成员——顶层排除规则需要全量判断）。 */
  members: IdexalGroupedTaskViewStructureMember[];
  topLevelOrders: IdexalGroupedTaskViewStructureTopOrder[];
}

export interface IdexalGroupedTaskViewOrderInput {
  workspaceScopes: IdexalTaskListWorkspaceScope[];
  topLevelNodes: IdexalGroupedTaskViewTopLevelNodeRef[];
  groups: Array<{
    groupId: string;
    taskRefs: IdexalGroupedTaskRef[];
  }>;
}

export interface IdexalWorkspaceEventSubscriptionParams {
  workspacePath: string;
  workspaceIdentity?: string;
}
