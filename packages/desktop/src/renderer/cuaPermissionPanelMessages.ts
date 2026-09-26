import type { CuaPermissionKind, Locale } from "@idexal/shared";

interface CuaPermissionPanelMessages {
  documentTitle: string;
  dragTitle: string;
  hintPrefix: string;
  permissionLabel: string;
  hintSuffix: string;
  completion: string;
}

const MESSAGES: Record<
  Locale,
  Omit<CuaPermissionPanelMessages, "permissionLabel"> & Record<CuaPermissionKind, string>
> = {
  "zh-CN": {
    documentTitle: "Idexal Computer Use 权限",
    dragTitle: "拖动我到上面的权限列表",
    hintPrefix: "把左边的图标拖进上方的",
    hintSuffix: "列表",
    completion: "松手即完成授权，无需再点开关",
    accessibility: "辅助功能",
    screen_recording: "屏幕录制",
  },
  "en-US": {
    documentTitle: "Idexal Computer Use Permissions",
    dragTitle: "Drag me to the permission list above",
    hintPrefix: "Drag the icon on the left into the ",
    hintSuffix: " list above",
    completion: "Release to grant access—no need to toggle the switch",
    accessibility: "Accessibility",
    screen_recording: "Screen Recording",
  },
  ar: {
    documentTitle: "أذونات Idexal Computer Use",
    dragTitle: "اسحبني إلى قائمة الأذونات بالأعلى",
    hintPrefix: "اسحب الأيقونة الموجودة على اليسار إلى قائمة ",
    hintSuffix: " بالأعلى",
    completion: "أفلت الماوس لمنح الوصول فورًا، دون الحاجة إلى تبديل المفتاح",
    accessibility: "إمكانية الوصول",
    screen_recording: "تسجيل الشاشة",
  },
  fr: {
    documentTitle: "Autorisations Idexal Computer Use",
    dragTitle: "Faites-moi glisser vers la liste des autorisations ci-dessus",
    hintPrefix: "Faites glisser l’icône de gauche dans la liste ",
    hintSuffix: " ci-dessus",
    completion: "Relâchez pour accorder l’accès — inutile d’activer le commutateur",
    accessibility: "Accessibilité",
    screen_recording: "Enregistrement de l’écran",
  },
};

export function resolveCuaPermissionPanelMessages(
  locale: Locale,
  permission: CuaPermissionKind,
): CuaPermissionPanelMessages {
  const messages = MESSAGES[locale];
  return {
    documentTitle: messages.documentTitle,
    dragTitle: messages.dragTitle,
    hintPrefix: messages.hintPrefix,
    permissionLabel: messages[permission],
    hintSuffix: messages.hintSuffix,
    completion: messages.completion,
  };
}
