/*
 * 单元测试入口。
 *
 * 仓库原本没有任何可运行的测试入口：各包的 package.json 里都没有 test 脚本，turbo
 * 也只编排 build/typecheck/lint。后果是改动只能靠静态检查把关，运行时行为无人守护，
 * packages/services/test 与 packages/ui/test 下已有的四个测试文件因此从未被执行过。
 * 本入口用 Node 自带的 node:test 加仓库已有的 tsx 依赖跑测试，不引入新的依赖。
 *
 * 每组测试按它所属包最近的 tsconfig.json 解析：packages/ui 用 "@/lib/..." 路径别名，
 * tsx 默认只认从启动目录能找到的一份配置，所以必须逐包传入。
 *
 * 一个约定：找不到测试文件必须报错退出。空匹配如果被当成"通过"，测试入口会在
 * 测试被移动或改名后静默变成绿灯。
 */
import { spawnSync } from "node:child_process";
import { existsSync, globSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const patterns = [
  "packages/*/src/**/*.test.ts",
  "packages/*/test/**/*.test.ts",
  "apps/idexal-cli/packages/*/src/**/*.test.ts",
  "apps/idexal-cli/packages/*/test/**/*.test.ts",
];

function findPackageTsconfig(testFile) {
  let dir = dirname(testFile);
  for (;;) {
    const candidate = join(dir, "tsconfig.json");
    if (existsSync(candidate)) return candidate;
    if (dir === repoRoot) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const testFiles = [...new Set(patterns.flatMap((pattern) => globSync(pattern)))]
  .map((file) => resolve(repoRoot, file))
  .sort();
if (testFiles.length === 0) {
  console.error(
    `FAIL 没有匹配到任何测试文件（模式：${patterns.join("、")}）。` +
      " 这不是“没有测试所以通过”，而是测试入口找不到测试，请检查文件名或位置。",
  );
  process.exit(1);
}

const groups = new Map();
for (const file of testFiles) {
  const key = findPackageTsconfig(file) ?? "default";
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(file);
}

console.log(`单元测试：${testFiles.length} 个文件，按 ${groups.size} 份 tsconfig 分组执行`);
for (const [key, files] of groups) {
  console.log(`  [tsconfig: ${key === "default" ? "tsx 默认" : key.slice(repoRoot.length + 1)}]`);
  for (const file of files) console.log(`    - ${file.slice(repoRoot.length + 1)}`);
}

let failedGroups = 0;
for (const [key, files] of groups) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", "--test-reporter=spec", ...files],
    {
      cwd: repoRoot,
      shell: false,
      stdio: "inherit",
      ...(key === "default" ? {} : { env: { ...process.env, TSX_TSCONFIG_PATH: key } }),
    },
  );
  if (result.error) {
    console.error(`FAIL 无法启动测试进程：${result.error.message}`);
    failedGroups += 1;
  } else if ((result.status ?? 1) !== 0) {
    failedGroups += 1;
  }
}

if (failedGroups > 0) {
  console.error(`FAIL ${failedGroups} 组测试未通过`);
  process.exit(1);
}
console.log(`OK 全部测试组通过（${testFiles.length} 个文件）`);
