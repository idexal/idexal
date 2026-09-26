import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface IdexalDataSizeTelemetryState {
  lastReportedAt?: number;
  reportReservedAt?: number;
}

export async function readIdexalDataSizeTelemetryState(
  stateFile: string,
): Promise<IdexalDataSizeTelemetryState | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(stateFile, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new TypeError("Invalid Idexal data size telemetry state");
    }
    const record = parsed as Record<string, unknown>;
    const state: IdexalDataSizeTelemetryState = {};
    if (record.lastReportedAt !== undefined) {
      if (typeof record.lastReportedAt !== "number" || !Number.isFinite(record.lastReportedAt)) {
        throw new TypeError("Invalid lastReportedAt in Idexal data size telemetry state");
      }
      state.lastReportedAt = record.lastReportedAt;
    }
    if (record.reportReservedAt !== undefined) {
      if (
        typeof record.reportReservedAt !== "number" ||
        !Number.isFinite(record.reportReservedAt)
      ) {
        throw new TypeError("Invalid reportReservedAt in Idexal data size telemetry state");
      }
      state.reportReservedAt = record.reportReservedAt;
    }
    return state.lastReportedAt === undefined && state.reportReservedAt === undefined
      ? null
      : state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeIdexalDataSizeTelemetryState(
  stateFile: string,
  state: IdexalDataSizeTelemetryState,
): Promise<void> {
  await mkdir(dirname(stateFile), { recursive: true });
  const temporaryFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(state)}\n`, "utf8");
    await rename(temporaryFile, stateFile);
  } catch (error) {
    await unlink(temporaryFile).catch(() => {});
    throw error;
  }
}
