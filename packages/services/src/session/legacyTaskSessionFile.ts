import type { IdexalSessionFile, IdexalTaskMeta } from "@idexal/shared";
import {
  idexalSessionFileSchema,
  idexalTaskMetaSchema,
  idexalTaskModeSchema,
} from "@idexal/shared";

export type LegacyTaskSessionFile = Omit<IdexalSessionFile, "meta"> & {
  meta: Omit<IdexalTaskMeta, "mode"> & { mode?: IdexalTaskMeta["mode"] };
};

const legacyTaskSessionFileSchema = idexalSessionFileSchema.extend({
  // Claude 原生迁移会按清洗路径删除 meta.mode。
  // legacy snapshot 读取/写入仍要校验其它必需字段，但不能再强制把被过滤字段补回文件。
  meta: idexalTaskMetaSchema.extend({
    mode: idexalTaskModeSchema.optional(),
  }),
});

export function parseLegacyTaskSessionFile(input: unknown): LegacyTaskSessionFile {
  return legacyTaskSessionFileSchema.parse(input);
}

export function safeParseLegacyTaskSessionFile(input: unknown) {
  return legacyTaskSessionFileSchema.safeParse(input);
}
