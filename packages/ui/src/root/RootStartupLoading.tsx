import type { ReactNode } from "react";
import brandMarkDarkUrl from "@/assets/brand/mark-dark.png";
import { cn } from "@/components/lib/utils.js";
import { IdexalWordmarkLogo } from "@/components/ui/IdexalAboutLogo.js";
import "@/root/rootStartupLogoPulse.css";

interface RootStartupLoadingProps {
  label: string;
  children?: ReactNode;
  busy?: boolean;
}

export function RootStartupLoading({ label, children, busy = true }: RootStartupLoadingProps) {
  return (
    <div
      // Web 端全局 html/body/#root 为 Electron 透明背景让路，React 接管后会替换 HTML 启动壳。
      // 这里必须由阻塞态自身承接主题背景，否则远控链接会在 Root 恢复期间继续露出浏览器白底。
      className="flex h-full min-h-dvh flex-col items-center justify-center gap-6 bg-background text-foreground"
      role="status"
      aria-busy={busy}
      aria-label={label}
      data-testid="root-startup-loading"
    >
      <IdexalStartupLogoBadge />
      {/* 官方横向组合标：遮罩是应用内唯一没有产品名文字的大尺寸品牌面，wordmark 在此补名而不是重复文字。 */}
      <IdexalWordmarkLogo className="w-28" />
      {children}
    </div>
  );
}

/** 初始化与引导共用品牌图标，保持底色、描边、圆角和标志比例一致。 */
export function IdexalStartupLogoBadge({ animated = true }: { animated?: boolean }) {
  return (
    <div className="relative flex size-24 items-center justify-center rounded-3xl bg-[linear-gradient(180deg,#000000_0%,#151718_100%)] text-[#ffffff] shadow-xl/20 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-[rgba(255,255,255,0.1)] before:content-['']">
      <IdexalStartupLogo className="h-auto w-14" animated={animated} />
    </div>
  );
}

function IdexalStartupLogo({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  // 修复：原内联 SVG 是上游旧品牌的 Chevron 标志，且靠 currentColor 变成白色；
  // 官方标志是位图，不会跟随 text-[#ffffff]，因此这里显式选用深色背景专用（白色）版本——
  // logo 壳本身就是固定深色渐变底，与系统主题无关，不能改用 dark: 变量切换。
  // 脉冲由 rootStartupLogoPulse.css 承接原先 SVG <animate> 的时序。
  return (
    <img
      src={brandMarkDarkUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("shrink-0", animated && "idexal-startup-logo-pulse", className)}
    />
  );
}
