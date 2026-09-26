import { PanelLeftOpen } from "lucide-react";
import brandMarkDarkUrl from "@/assets/brand/mark-dark.png";
import brandMarkLightUrl from "@/assets/brand/mark-light.png";
import { Button } from "@/components/ui/button.js";
import { ControlHintTooltip } from "@/ControlHintTooltip.js";
import { useIdexalIntl } from "@/i18n/IntlProvider.js";
import { useIdexalStoreWithDefault } from "@/store/StoreProvider.js";
import { inferAppliedTheme, resolveTheme } from "@/useTheme.js";

export function WorkspaceSidebarCollapsedRail({
  onToggleSidebar,
  toggleSidebarShortcutLabel,
}: {
  onToggleSidebar: () => void;
  toggleSidebarShortcutLabel?: string;
}) {
  const { intl } = useIdexalIntl();
  const theme = useIdexalStoreWithDefault((state) => state.theme, inferAppliedTheme());

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-border bg-background-alt">
      <div className="flex h-9 shrink-0 items-center justify-center border-b border-border bg-background-alt px-1.5 [app-region:drag]">
        <div className="[app-region:no-drag]">
          <ControlHintTooltip
            title={intl.formatMessage({ id: "workspaceSidebar.toggleSidebar" })}
            shortcut={toggleSidebarShortcutLabel}
            side="bottom"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-md"
              className="group relative overflow-hidden rounded-lg"
              onClick={onToggleSidebar}
              aria-label={intl.formatMessage({
                id: "workspaceSidebar.toggleSidebar",
              })}
            >
              {/*
                修复：收起栏的 app logo 此前借用 Z.ai provider 图标（logo-zai.svg），不是本品牌标志。
                官方位图不吃 currentColor，故按应用主题显式选浅/深两张之一；不用 Tailwind `dark:`，
                它编译成 @media (prefers-color-scheme: dark)，在 Web 目标里只跟系统偏好。
                20px 方形槽位用方形 mark，hover 时与展开图标交叉淡出的行为保持不变。
              */}
              <img
                src={resolveTheme(theme) === "dark" ? brandMarkDarkUrl : brandMarkLightUrl}
                alt="Idexal"
                className="size-5 object-contain transition-opacity group-hover:opacity-0"
                draggable={false}
              />
              <PanelLeftOpen className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </Button>
          </ControlHintTooltip>
        </div>
      </div>
    </aside>
  );
}
