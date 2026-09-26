import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IdexalStdioTapDevState } from "@idexal/shared";
import { getAppConfigDir } from "#src/paths.js";
import { isEffectiveDevelopmentNodeEnv } from "#src/runtime-tools/nodeEnv.js";

interface IdexalStdioTapStateFile {
  enabled?: boolean;
}

function isIdexalStdioTapDevVisible(): boolean {
  return isEffectiveDevelopmentNodeEnv();
}

function getIdexalStdioTapDevDir(): string {
  return join(getAppConfigDir(), "dev");
}

export function getIdexalStdioTapDevLogDir(): string {
  return join(getIdexalStdioTapDevDir(), "stdio-traffic");
}

function getIdexalStdioTapDevStatePath(): string {
  return join(getIdexalStdioTapDevDir(), "idexal-stdio-tap.json");
}

function readStateFile(path: string): IdexalStdioTapStateFile {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as IdexalStdioTapStateFile) : {};
  } catch {
    return {};
  }
}

export function readIdexalStdioTapDevState(): IdexalStdioTapDevState {
  const visible = isIdexalStdioTapDevVisible();
  const statePath = getIdexalStdioTapDevStatePath();
  const fileState = readStateFile(statePath);
  return {
    enabled: visible && fileState.enabled === true,
    visible,
    logDir: getIdexalStdioTapDevLogDir(),
    statePath,
  };
}

export function setIdexalStdioTapDevEnabled(enabled: boolean): IdexalStdioTapDevState {
  const visible = isIdexalStdioTapDevVisible();
  const statePath = getIdexalStdioTapDevStatePath();
  mkdirSync(getIdexalStdioTapDevDir(), { recursive: true });
  writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        // 开发态 stdio 抓包是高频原始协议帧，只能通过显式开关写旁路文件，避免误进生产日志。
        enabled: visible && enabled,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  return readIdexalStdioTapDevState();
}
