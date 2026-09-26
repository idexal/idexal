import { useCallback, useEffect, useSyncExternalStore, useState } from "react";

export type Theme = "light" | "dark" | "zai-light" | "zai-dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "idexal-theme";
const BROWSER_THEME_SURFACE_ATTRIBUTE = "data-idexal-browser-theme-surface";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return getSystemTheme();
  }

  return theme === "dark" || theme === "zai-dark" ? "dark" : "light";
}

export function normalizeThemePreference(theme: Theme): Theme {
  if (theme === "dark") return "zai-dark";
  if (theme === "light") return "zai-light";
  return theme;
}

function setThemeMetaContent(name: "theme-color" | "color-scheme", content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.append(meta);
  }
  meta.content = content;
}

function syncBrowserThemeSurface(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (
    typeof root.hasAttribute !== "function" ||
    !root.hasAttribute(BROWSER_THEME_SURFACE_ATTRIBUTE)
  ) {
    return;
  }

  // Electron 为 vibrancy 保持透明根背景，但普通浏览器需要从文档根和标准 meta
  // 获得页面主题。只切换 React 的 dark class 会让浏览器工具栏、原生控件和 overscroll 留在旧主题。
  root.setAttribute(BROWSER_THEME_SURFACE_ATTRIBUTE, resolved);
  root.style.colorScheme = resolved;
  setThemeMetaContent("color-scheme", resolved);

  const background = getComputedStyle(root).getPropertyValue("--color-background").trim();
  if (background) {
    setThemeMetaContent("theme-color", background);
  }
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  const appliedTheme =
    theme === "system"
      ? resolved === "dark"
        ? "zai-dark"
        : "zai-light"
      : normalizeThemePreference(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.classList.toggle("theme-zai-light", appliedTheme === "zai-light");
  document.documentElement.classList.toggle("theme-zai-dark", appliedTheme === "zai-dark");
  syncBrowserThemeSurface(resolved);
}

/**
 * 品牌位图这类"必须跟已生效主题严格一致"的表面只能有一个事实来源。
 *
 * store 里的 theme 可能是 "system"，而 resolveTheme("system") 会在渲染期再查一次
 * matchMedia('(prefers-color-scheme: dark)')。桌面端该媒体值由主进程按 nativeTheme
 * 异步回推，和 applyTheme 写 .dark 类的时机不同步，于是出现"页面已经是浅色、
 * 位图还选深色墨"的组合（实测：App theme=System 且系统为浅色时，
 * documentElement 为 theme-zai-light 而三处品牌图仍为 mark-dark.png，刷新后依旧）。
 * applyTheme 已经把解析结果落到 .dark 类上，所以订阅这个类才是与 CSS 同源的事实。
 *
 * 订阅 DOM 类顺带解决了渲染边界：启动遮罩走 Root 的 isStartupRenderBlocked 分支，
 * 位置低于 <StoreProvider>，读 store 会抛 "useIdexalStore 必须在 StoreProvider 内使用"。
 */
export function isDarkThemeApplied(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

function subscribeAppliedTheme(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useIsDarkThemeApplied(): boolean {
  return useSyncExternalStore(subscribeAppliedTheme, isDarkThemeApplied, () => true);
}

function isTheme(value: string | null): value is Theme {
  return (
    value === "light" ||
    value === "dark" ||
    value === "zai-light" ||
    value === "zai-dark" ||
    value === "system"
  );
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // 默认主题统一收敛到 Zai dark，避免旧 hook 兜底值和 Zustand store 默认值分叉。
    return isTheme(saved) ? normalizeThemePreference(saved) : "zai-dark";
  });

  const setTheme = useCallback((t: Theme) => {
    const normalizedTheme = normalizeThemePreference(t);
    localStorage.setItem(STORAGE_KEY, normalizedTheme);
    setThemeState(normalizedTheme);
    applyTheme(normalizedTheme);
  }, []);

  // 初始化 + system 模式下监听系统偏好变化
  useEffect(() => {
    applyTheme(theme);

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme } as const;
}
