import { cn } from "@/components/lib/utils.js";
import brandLogoDarkUrl from "@/assets/brand/logo-dark.png";
import brandLogoLightUrl from "@/assets/brand/logo-light.png";
import brandMarkDarkUrl from "@/assets/brand/mark-dark.png";

/**
 * 品牌方形标志（"IX" mark）。
 *
 * 修复：原实现是上游旧品牌的 Chevron 内联 SVG，且靠 `fill="currentColor"` 跟随主题自适应；
 * 换成官方位图后 PNG 不再随文字色变化，必须显式选图。当前两个调用方（登录页 logo 壳、
 * 引导欢迎页 logo 壳）都是固定深色底 `bg-[linear-gradient(180deg,#000000_0%,#151718_100%)]`，
 * 所以这里恒定使用深色背景专用（白色）标志，不随主题切换，避免浅色主题下深色标志压在黑底上不可见。
 * 需要落在普通主题表面时请改用 IdexalWordmarkLogo 的整套 dark: 互斥方案。
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
 * 因此沿用仓库已有的 Tailwind `dark:` 互斥显示写法（同 ConversationDraftEmptyState），
 * 由 .dark 主题类决定露出哪一份，而不是再引第二套主题状态。
 * 默认宽度沿用旧 SVG 的 244px 内在宽度，调用方可用 className 覆盖。
 */
export function IdexalWordmarkLogo({ className }: { className?: string }) {
  return (
    <>
      <img
        src={brandLogoLightUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={cn("h-auto w-60 max-w-full shrink-0 object-contain dark:hidden", className)}
      />
      <img
        src={brandLogoDarkUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={cn(
          "hidden h-auto w-60 max-w-full shrink-0 object-contain dark:block",
          className,
        )}
      />
    </>
  );
}
