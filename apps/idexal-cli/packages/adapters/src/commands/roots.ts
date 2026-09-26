import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { CustomCommandRoot, CustomCommandSource } from "@idexal/contracts";

const COMMANDS_DIR = "commands";
const GIT_MARKER = ".git";
const HOME_PREFIX = "~/";
const PRIORITY_STEP = 10;
const IDEXAL_DIR = ".idexal";
const AGENTS_DIR = ".agents";

export interface CustomCommandRootResolutionOptions {
  extraRoots?: string[];
  extraResolvedRoots?: CustomCommandRoot[];
  homeDirectory?: string;
  includeIdexalCommands?: boolean;
}

export async function resolveDefaultCustomCommandRoots(
  workingDirectory: string,
  options: CustomCommandRootResolutionOptions = {},
): Promise<CustomCommandRoot[]> {
  const resolvedWorkingDirectory = resolve(workingDirectory);
  const roots: CustomCommandRoot[] = [];
  const includeIdexal = options.includeIdexalCommands ?? true;
  const home = options.homeDirectory ?? homedir();
  let priority = 0;
  const nextPriority = () => {
    priority += PRIORITY_STEP;
    return priority;
  };

  for (const extraRoot of options.extraRoots ?? []) {
    roots.push(
      root(
        resolveConfiguredRoot(extraRoot, resolvedWorkingDirectory, home),
        "project",
        "idexal",
        nextPriority(),
      ),
    );
  }

  if (includeIdexal) {
    roots.push(...commandRootsForBase(home, "user", nextPriority));
  }

  const projectDirectories = await resolveProjectDirectories(resolvedWorkingDirectory);
  for (const directory of projectDirectories) {
    if (includeIdexal) {
      roots.push(...commandRootsForBase(directory, "project", nextPriority));
    }
  }

  roots.push(...(options.extraResolvedRoots ?? []));

  return roots;
}

async function resolveProjectDirectories(workingDirectory: string): Promise<string[]> {
  const worktreeRoot = await findWorktreeRoot(workingDirectory);
  if (!worktreeRoot) return [workingDirectory];

  const directories: string[] = [];
  let current = workingDirectory;
  while (true) {
    directories.push(current);
    if (current === worktreeRoot || current === dirname(current)) break;
    current = dirname(current);
  }
  return directories;
}

async function findWorktreeRoot(workingDirectory: string): Promise<string | null> {
  let current = workingDirectory;
  while (true) {
    if (await pathExists(join(current, GIT_MARKER))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function commandRootsForBase(
  baseDirectory: string,
  scope: CustomCommandRoot["scope"],
  nextPriority: () => number,
): CustomCommandRoot[] {
  // 合并而不是 fallback：兼容 `.agents` 命令和原生 `.idexal` 命令需要同时可见。
  // 同一级别 `.idexal` 先扫描，命令同名时仍按“先到先赢”处理。
  return [
    root(join(baseDirectory, IDEXAL_DIR, COMMANDS_DIR), scope, "idexal", nextPriority()),
    root(join(baseDirectory, AGENTS_DIR, COMMANDS_DIR), scope, "agents", nextPriority()),
  ];
}

function root(
  path: string,
  scope: CustomCommandRoot["scope"],
  source: CustomCommandSource,
  priority: number,
): CustomCommandRoot {
  return {
    path: resolve(path),
    scope,
    source,
    priority,
  };
}

function resolveConfiguredRoot(path: string, workingDirectory: string, home: string): string {
  const expanded = path.startsWith(HOME_PREFIX) ? join(home, path.slice(HOME_PREFIX.length)) : path;
  return isAbsolute(expanded) ? expanded : resolve(workingDirectory, expanded);
}
