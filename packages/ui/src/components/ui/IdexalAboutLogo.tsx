import { cn } from "@/components/lib/utils.js";
import brandLogoDarkUrl from "@/assets/brand/logo-dark.png";
import brandLogoLightUrl from "@/assets/brand/logo-light.png";
import brandMarkDarkUrl from "@/assets/brand/mark-dark.png";
import { useIdexalStoreWithDefault } from "@/store/StoreProvider.js";
import { inferAppliedTheme, resolveTheme } from "@/useTheme.js";

/**
 * 品牌方形标志（"IX" mark）。
 *
 * 修复：原实现是上游旧品牌的 Chevron 内联 SVG，且靠 `fill="currentColor"` 跟随主题自适应；
 * 换成官方位图后 PNG 不再随文字色变化，必须显式选图。当前两个调用方（登录页 logo 壳、
 * 引导欢迎页 logo 壳）都是固定深色底 `bg-[linear-gradient(180deg,#000000_0%,#151718_100%)]`，
 * 所以这里恒定使用深色背景专用（白色）标志，不随主题切换，避免浅色主题下深色标志压在黑底上不可见。
 * 需要落在普通主题表面时请改用 IdexalWordmarkLogo，它按应用主题显式选图。
 */
export function IdexalAboutLogo({ className }: { className?: string }) {
  return (
    <img
      src={brandMarkDarkUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("h-auto shrink-0 object-contain", className)}
    />
  );
}

/**
 * 品牌横向组合标（mark + "idexal" 字标，约 3:1）。
 *
 * 修复：原先是拼写旧品牌名的内联 SVG，用 currentColor 自适应；位图资源自带明暗两套配色，
 * 必须显式选图。这里按应用主题（Zustand `theme`）选墨色，不用 Tailwind `dark:`：
 * 本仓没有 class 版 dark 变体，`dark:` 编译成 `@media (prefers-color-scheme: dark)`，
 * 桌面端靠 nativeTheme 看起来正确，Web 端却只跟系统偏好，应用主题与系统相反时深色底会压深色墨。
 * 默认宽度沿用旧 SVG 的 244px 内在宽度，调用方可用 className 覆盖。
 */
export function IdexalWordmarkLogo({ className }: { className?: string }) {
  const theme = useIdexalStoreWithDefault((state) => state.theme, inferAppliedTheme());
  return (
    <img
      src={resolveTheme(theme) === "dark" ? brandLogoDarkUrl : brandLogoLightUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn(
        // 画布 1136×380 的固有比例：h-auto 在 PNG 解码完成前会塌成 0 高，启动遮罩上会闪一次位移。
        "aspect-[1136/380] h-auto w-60 max-w-full shrink-0 object-contain",
        className,
      )}
    />
  );
}
