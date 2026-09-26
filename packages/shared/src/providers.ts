import { z } from "zod";

/**
 * Idexal agent 提供方的单一真源。
 *
 * 类型 IdexalProvider、运行时 schema idexalProviderSchema 都从这里派生,
 * 避免各处内联 z.enum([...]) 副本随新增/删除 provider 漂移。
 * 本模块只依赖 zod(叶子),可被 validation / idexal-protocol 等无环引用。
 */
const IDEXAL_PROVIDERS = ["glm"] as const;

export const idexalProviderSchema = z.enum(IDEXAL_PROVIDERS);

export type IdexalProvider = (typeof IDEXAL_PROVIDERS)[number];
