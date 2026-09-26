import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { resolveSpawnRuntimeOptions } from "./spawn-command.mjs";

const exec = promisify(execFile);
export const hashBytes = (bytes) => createHash("sha256").update(bytes).digest("hex");
const unsupportedCanvas = new Set([
  "@napi-rs/canvas-android-arm64",
  "@napi-rs/canvas-linux-arm-gnueabihf",
  "@napi-rs/canvas-linux-riscv64-gnu",
]);
const noticeName =
  /(?:^|[._-])(?:licen[sc]es?|copying|notice|copyright|unlicense|third.party|ofl)(?:[._-]|$)/iu;

export async function readPackageNotices(directory) {
  const files = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (["node_modules", ".git", "test", "tests", "fixtures"].includes(entry.name)) continue;
      // Chromium 聚合许可由打包流程经 resources/licenses/electron 单独分发，不进 npm 通知。
      if (entry.isFile() && entry.name === "LICENSES.chromium.html") continue;
      const full = join(path, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile() && noticeName.test(entry.name)) {
        const bytes = await readFile(full);
        if (bytes.includes(0) || bytes.length === 0) continue;
        files.push({ member: relative(directory, full).replaceAll("\\", "/"), bytes });
      } else if (entry.isFile() && /^readme(?:\.[^/]*)?$/iu.test(entry.name)) {
        const text = await readFile(full, "utf8");
        const match = /^(?:#{1,6}\s+licen[sc]e[^\n]*\n|licen[sc]e\s*\n[=-]+\n)/imu.exec(text);
        if (match) {
          const section = text.slice(match.index).split(/\n(?=#{1,6}\s)/u)[0];
          files.push({
            member: `${relative(directory, full).replaceAll("\\", "/")} (license section)`,
            bytes: Buffer.from(section),
          });
        }
      }
    }
  }
  await visit(directory);
  return files.sort((a, b) => a.member.localeCompare(b.member, "en"));
}

function productionPackages(projects) {
  const own = new Set(projects.map((project) => project.name));
  const required = new Map();
  function dependencies(deps) {
    for (const [alias, info] of Object.entries(deps ?? {})) {
      const name = info.name ?? alias;
      if (!own.has(name) && !name.startsWith("@idexal/") && !info.version.startsWith("link:")) {
        required.set(`${name}@${info.version}`, { name, version: info.version });
      }
      dependencies(info.dependencies);
      dependencies(info.optionalDependencies);
    }
  }
  for (const project of projects) {
    dependencies(project.dependencies);
    dependencies(project.optionalDependencies);
  }
  return required;
}

export function assertProductionGraphs(lockedProjects, installedProjects) {
  const locked = productionPackages(lockedProjects);
  const installed = productionPackages(installedProjects);
  const missing = [...locked].filter(
    ([key, item]) => !installed.has(key) && !unsupportedCanvas.has(item.name),
  );
  const stale = [...installed.keys()].filter((key) => !locked.has(key));
  if (missing.length || stale.length) {
    throw new Error(
      `Installed production graph differs from pnpm-lock.yaml. Run pnpm install --frozen-lockfile.\nMissing: ${missing.map(([key]) => key).join(", ")}\nStale: ${stale.join(", ")}`,
    );
  }
  return locked;
}

// 枚举 workspace 项目目录（pnpm-workspace.yaml 的 packages 形态 + 根项目）。
async function listWorkspaceProjectDirs(root) {
  const yaml = await readFile(join(root, "pnpm-workspace.yaml"), "utf8").catch(() => "");
  const patterns = [];
  let inPackages = false;
  for (const line of yaml.split(/\r?\n/)) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    const match = /^\s*-\s*(.+?)\s*$/.exec(line);
    if (match) patterns.push(match[1].replace(/^["']|["']$/g, ""));
    else if (/^\S/.test(line)) inPackages = false;
  }
  const dirs = new Set(["."]);
  for (const pattern of patterns) {
    if (pattern.includes("*")) {
      const base = pattern.slice(0, pattern.indexOf("*")).replace(/\/+$/, "");
      let entries = [];
      try {
        entries = await readdir(join(root, base), { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          (await stat(join(root, base, entry.name, "package.json")).catch(() => null))
        ) {
          dirs.add(`./${base}/${entry.name}`);
        }
      }
    } else if (await stat(join(root, pattern, "package.json")).catch(() => null)) {
      dirs.add(`./${pattern}`);
    }
  }
  return [...dirs];
}

export async function readWorkspaceProductionGraph(root) {
  root = await realpath(root);
  // Windows 修复：Node 在 Windows 上经 CRT 打开文件，单进程最多同时打开约 8192 个句柄，
  // `pnpm -r ls` 遍历 hoisted 大 workspace 时句柄跨项目累积会稳定触发 EMFILE
  // （本机对 --depth 0/1/2 均复现，与深度和 workspace 并发度无关）。
  // 因此 Windows 上改为逐 workspace 项目执行等价命令（--filter <dir>），每个项目独立进程、
  // 句柄预算互不累积，串行执行后拼接；拼接出的项目集合与单次 `-r` 语义一致（下游按集合消费）。
  // 非 Windows 平台保持原单次 `-r` 实现，行为与性能不变。
  const projectDirs = process.platform === "win32" ? await listWorkspaceProjectDirs(root) : null;
  const runLs = async (lockfileOnly) => {
    const execPnpm = async (commandArgs) => {
      const { stdout } = await exec("pnpm", commandArgs, {
        cwd: root,
        maxBuffer: 256 * 1024 * 1024,
        ...resolveSpawnRuntimeOptions("pnpm"),
      });
      return JSON.parse(stdout);
    };
    const args = [
      "ls",
      "--prod",
      "--json",
      "--depth",
      "Infinity",
      ...(lockfileOnly ? ["--lockfile-only"] : []),
    ];
    if (!projectDirs) return execPnpm(["-r", ...args]);
    const projects = [];
    for (const dir of projectDirs) projects.push(...(await execPnpm(["--filter", dir, ...args])));
    return projects;
  };
  // 修复：pnpm ls 默认读取安装快照，不能把旧图与当前锁文件哈希拼成有效声明。
  // 因此分别执行 --lockfile-only 与安装快照两次运行并交叉校验。
  const [locked, actual] = await Promise.all([true, false].map(runLs));
  const required = assertProductionGraphs(locked, actual);
  return { required, projects: actual };
}

export async function scanInstalledPackages(root, projects) {
  // pnpm hoisted 布局的 ls.path 仍可能指向不存在的 .pnpm 路径；按真实安装目录和精确版本匹配。
  const installed = new Map();
  const visited = new Set();
  async function scanNodeModules(directory) {
    let actual;
    try {
      actual = await realpath(directory);
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    if (visited.has(actual)) return;
    visited.add(actual);
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const path = join(directory, entry.name);
      if (entry.name.startsWith("@")) {
        for (const scoped of await readdir(path)) await scanPackage(join(path, scoped));
      } else await scanPackage(path);
    }
  }
  async function scanPackage(directory) {
    let pkg;
    try {
      pkg = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
    } catch (error) {
      if (["ENOENT", "ENOTDIR"].includes(error.code)) return;
      throw error;
    }
    if (pkg.name && pkg.version) installed.set(`${pkg.name}@${pkg.version}`, { pkg, directory });
    await scanNodeModules(join(directory, "node_modules"));
  }
  for (const project of projects) await scanNodeModules(join(project.path, "node_modules"));
  await scanNodeModules(join(root, "node_modules"));
  await scanNodeModules(join(root, "apps/idexal-cli/node_modules"));
  return installed;
}

export function missingProductionPackages(required, installed) {
  const missing = [...required].filter(([key]) => !installed.has(key)).map(([, item]) => item);
  for (const item of missing) {
    if (!unsupportedCanvas.has(item.name))
      throw new Error(`Missing installed dependency: ${item.name}@${item.version}`);
  }
  return missing;
}

export async function collectNpmNotices(root, overrides) {
  root = await realpath(root);
  const { required, projects } = await readWorkspaceProductionGraph(root);
  // 修复：标识门禁和声明生成必须扫描同一安装集合，避免嵌套版本只进声明、不进门禁。
  const installed = await scanInstalledPackages(root, projects);
  const packages = [];
  const missing = [];
  const notInstalled = missingProductionPackages(required, installed);
  for (const [key, item] of [...required].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    const installedPackage = installed.get(key);
    if (!installedPackage) {
      continue;
    }
    const { pkg, directory } = installedPackage;
    const notices = await readPackageNotices(directory);
    const override = overrides.find((record) => record.package === key);
    if (override?.file) {
      const bytes = await readFile(join(root, override.file));
      if (hashBytes(bytes) !== override.sha256) throw new Error(`Changed upstream notice: ${key}`);
      notices.push({ member: override.source, bytes });
    }
    // README 中仅有 MIT 等标签不能冒充完整许可文件；这种包仍需要版本固定的补充材料。
    if (
      !notices.some(({ member }) => !member.endsWith(" (license section)")) &&
      !override?.acceptedMissingNotice
    )
      missing.push(key);
    packages.push({
      ...item,
      license:
        pkg.license ??
        pkg.licenses?.map((item) => (typeof item === "string" ? item : item.type)).join(" OR ") ??
        override?.license ??
        "(not declared)",
      repository: typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url,
      ...(override?.acceptedMissingNotice
        ? { acceptedMissingNotice: override.acceptedMissingNotice }
        : {}),
      notices,
    });
  }
  if (missing.length) throw new Error(`Missing complete upstream notices:\n${missing.join("\n")}`);
  return {
    packages,
    notInstalled,
    workspaceManifests: projects.map((project) =>
      relative(root, join(project.path, "package.json")).replaceAll("\\", "/"),
    ),
  };
}
