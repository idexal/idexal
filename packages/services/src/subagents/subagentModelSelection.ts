import { modelSelectionSchema, type ModelSelection } from "@idexal/shared";

export function normalizeSubagentModelSelection(
  selection: ModelSelection | undefined,
): ModelSelection | undefined {
  if (!selection) return undefined;
  const options = selection.options;
  return modelSelectionSchema.parse({
    providerId: selection.providerId,
    modelId: selection.modelId,
    ...(options?.reasoningLevel ? { options: { reasoningLevel: options.reasoningLevel } } : {}),
  });
}
