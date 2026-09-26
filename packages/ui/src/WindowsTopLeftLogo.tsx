import { cn } from "@/components/lib/utils.js";
import brandMarkDarkUrl from "@/assets/brand/mark-dark.png";
import brandMarkLightUrl from "@/assets/brand/mark-light.png";

export function WindowsTopLeftLogo({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        // Workspace 的左侧工具组从 1px 面板边框之后开始，Settings 旧标题层却从窗口 0 点开始，
        // Workspace 的 logo 位于 28px 按钮内，图像相对按钮左沿还有 4px 居中留白；
        // Settings 直接渲染 20px 图像，不能拿按钮容器的 left 13px 当作图像坐标。
        // 计入 4px 外层留白、1px 边框和按钮内 4px 后，两处图像均为 left 17px / top 19px。
        "absolute left-1 top-1 mt-px ml-px z-20 flex h-12 items-center px-3 [app-region:drag]",
        className,
      )}
    >
      {/*
        修复：标题栏 logo 之前用的是 Z.ai provider 图标（logo-zai.svg），并非本品牌标志。
        官方标志是位图、不再随 currentColor 自适应，故按仓库既有的 Tailwind `dark:` 互斥写法
        显式分浅/深两张图；这里是 20px 方形槽位，用方形 mark 而不是约 3:1 的组合标。
      */}
      <img
        src={brandMarkLightUrl}
        alt="Idexal"
        className={cn(
          "pointer-events-none size-5 select-none object-contain dark:hidden",
          imageClassName,
        )}
        draggable={false}
      />
      <img
        src={brandMarkDarkUrl}
        alt="Idexal"
        className={cn(
          "pointer-events-none hidden size-5 select-none object-contain dark:block",
          imageClassName,
        )}
        draggable={false}
      />
    </div>
  );
}
