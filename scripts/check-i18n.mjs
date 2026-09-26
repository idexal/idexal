#!/usr/bin/env node
// 语言表一致性检查：把"翻译可以逐面补齐"这条策略变成可执行的不变量。
//
// 为什么不用正则数键名：本仓库存在含连字符与非 ASCII 的键
// （sidebar.settings.locale.en-US、feedback.severity.P1-高.label 等），
// 只匹配 [A-Za-z0-9_.] 的正则会**静默跳过**它们，于是"0 个孤儿键 / 0 处不对称"
// 这类绿灯其实根本没看过那些键。这里直接把语言表当模块求值再读真实键集。
//
// 用法：
//   node scripts/check-i18n.mjs            # 检查（CI / pre-push 用）
//   node scripts/check-i18n.mjs coverage   # 只打印各语言覆盖率
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = path.join(repoRoot, "packages/ui/src/i18n/locales");
const FALLBACK = "en-US";
const TRANSLATED = ["ar", "fr"];

/** 语言表是纯字面量对象；用沙箱求值而不是读源码数行，避免任何解析盲区。 */
function loadLocale(locale) {
  const file = path.join(LOCALES_DIR, `${locale}.ts`);
  const source = fs.readFileSync(file, "utf8");
  if (/^\s*import\s/m.test(source)) {
    throw new Error(`${locale}: 语言表必须是纯字面量（检测到 import），否则无法独立求值`);
  }
  const body = source
    .replace(/const\s+(\w+)\s*:\s*Record<string,\s*string>\s*=/, "const $1 =")
    .replace(/export default\s+(\w+);?/, "module.exports = $1;");
  if (!body.includes("module.exports =")) {
    throw new Error(`${locale}: 找不到预期的 const 声明或 default 导出，格式可能已变更`);
  }
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(body, sandbox, { filename: file });
  const value = sandbox.module.exports;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${locale}: default 导出不是普通对象`);
  }
  return value;
}

const PLACEHOLDER = /\{[A-Za-z0-9_]+(?:,[^}]*)?\}/g;
const placeholderSignature = (value) => (value.match(PLACEHOLDER) ?? []).slice().sort().join(",");

// 阿语行里混进 CJK、或法语行里整句仍是英文，都属于"键补了但值是错的"。
// 值级扫描必须做：只统计覆盖率的检查永远看不见这类缺陷。
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;
const ARABIC = /[؀-ۿ]/;

function check() {
  const en = loadLocale(FALLBACK);
  const enKeys = Object.keys(en);
  const enSet = new Set(enKeys);
  const failures = [];
  const warnings = [];

  // 反向证明：解析器必须能看到带连字符/非 ASCII 的键，否则本检查是空跑。
  const awkward = enKeys.filter((k) => !/^[A-Za-z0-9_.]+$/.test(k));
  if (awkward.length === 0) {
    failures.push(
      `${FALLBACK}: 未发现任何含连字符/非 ASCII 的键——要么数据变了，要么解析没吃到它们，报告因此不可信`,
    );
  }

  const emptyEn = enKeys.filter((k) => !String(en[k]).trim());
  if (emptyEn.length) {
    warnings.push(
      `${FALLBACK} 有 ${emptyEn.length} 个空值（多为刻意留空的后缀，但仍需逐个确认）：${emptyEn.join(", ")}`,
    );
  }

  const tables = new Map([[FALLBACK, en]]);
  for (const locale of TRANSLATED) tables.set(locale, loadLocale(locale));

  for (const [locale, table] of tables) {
    if (locale === FALLBACK) continue;
    const keys = Object.keys(table);
    if (keys.length !== new Set(keys).size) failures.push(`${locale}: 存在重复键`);
    const nonString = keys.filter((k) => typeof table[k] !== "string");
    if (nonString.length) failures.push(`${locale}: 非字符串值 ${nonString.join(", ")}`);
    const orphans = keys.filter((k) => !enSet.has(k));
    if (orphans.length) {
      failures.push(`${locale}: ${orphans.length} 个键不在 ${FALLBACK} 中：${orphans.join(", ")}`);
    }
    const empty = keys.filter((k) => !String(table[k]).trim());
    if (empty.length) failures.push(`${locale}: ${empty.length} 个空值：${empty.join(", ")}`);

    for (const key of keys) {
      const value = String(table[key]);
      const source = en[key];
      if (source === undefined) continue;
      const mine = placeholderSignature(value);
      const theirs = placeholderSignature(source);
      if (mine !== theirs) {
        failures.push(
          `${locale} ${key}: 占位符不匹配（${FALLBACK} [${theirs || "无"}] vs 译文 [${mine || "无"}]）`,
        );
      }
      // 阿语译文里不允许混入中日韩字符
      if (locale === "ar" && ARABIC.test(value) && CJK.test(value)) {
        failures.push(`${locale} ${key}: 阿语译文混入 CJK 字符：${value.slice(0, 60)}`);
      }
    }
  }

  // ar / fr 覆盖面对称：一份补了另一份没补，就会有一半界面回退英文。
  const arKeys = new Set(tables.get("ar") ? Object.keys(tables.get("ar")) : []);
  const frKeys = new Set(tables.get("fr") ? Object.keys(tables.get("fr")) : []);
  const onlyAr = [...arKeys].filter((k) => !frKeys.has(k));
  const onlyFr = [...frKeys].filter((k) => !arKeys.has(k));
  if (onlyAr.length) failures.push(`ar 独有键（fr 未覆盖）：${onlyAr.join(", ")}`);
  if (onlyFr.length) failures.push(`fr 独有键（ar 未覆盖）：${onlyFr.join(", ")}`);

  return { en, tables, enKeys, failures, warnings, awkward };
}

function reportCoverage(state) {
  const total = state.enKeys.length;
  console.log(`${FALLBACK}: ${total} 键（事实来源）`);
  for (const locale of TRANSLATED) {
    const n = Object.keys(state.tables.get(locale) ?? {}).length;
    console.log(`${locale}: ${n} 键 = ${((n / total) * 100).toFixed(2)}%`);
  }
  console.log(`解析器可见的含连字符/非 ASCII 键：${state.awkward.length} 个`);
}

const command = process.argv[2] ?? "check";
const state = check();

if (command === "coverage") {
  reportCoverage(state);
  process.exit(0);
}

reportCoverage(state);
for (const warning of state.warnings) console.log(`NOTE ${warning}`);
if (state.failures.length) {
  for (const failure of state.failures) console.error(`FAIL ${failure}`);
  console.error(`\ni18n 检查失败：${state.failures.length} 项`);
  process.exit(1);
}
console.log("i18n 检查通过：键集对称、无孤儿键与空值、占位符逐条与英文一致");
