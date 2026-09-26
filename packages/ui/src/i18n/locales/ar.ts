/**
 * Arabic translations.
 *
 * 这里只覆盖首屏与首次运行会看到的界面（登录、引导、应用外壳、语言/主题）。
 * 未翻译的键由 `createIntl` 回退到 en-US，不会把 key 暴露给用户，
 * 因此翻译可以按界面逐块补齐，不必攒成一次不可发布的巨型改动。
 */
const ar: Record<string, string> = {
  "welcome.title": "مرحبًا بك في Idexal",
  "welcome.username": "اسم المستخدم",
  "welcome.password": "كلمة المرور",
  "welcome.login": "تسجيل الدخول",
  "welcome.loggingIn": "جارٍ تسجيل الدخول...",
  "welcome.loginFailed": "تعذّر تسجيل الدخول",

  "login.title": "مرحبًا بك في Idexal",
  "login.description": "اربط حسابك لبدء استخدام Idexal",
  "login.oauth.activeProviderHint":
    "المزوّد النشط حاليًا: {provider}. تسجيل الدخول مجددًا يستبدل الهوية الحالية.",
  "login.subscription.comingSoon": "الاشتراكات قريبًا",
  "login.oauth.regionTag.zai": "عالمي",
  "login.oauth.regionTag.bigmodel": "الصين",
  "login.oauth.waiting": "في انتظار اكتمال التحقق من {provider}...",
  "login.oauth.loginFailure": "تعذّر تسجيل الدخول، يرجى المحاولة مرة أخرى",
  "login.oauth.cancel": "إلغاء",
  "login.oauth.retry": "إعادة محاولة الدخول",
  "login.expired.title": "انتهت صلاحية جلستك",
  "login.expired.description": "للحفاظ على أمان حسابك، يرجى تسجيل الدخول مرة أخرى.",
  "login.expired.action": "تسجيل الدخول مجددًا",
  "login.expired.restart": "تأكيد وإعادة التشغيل",
  "login.useApiKey": "استخدام مفتاح API",
  "login.apiKey.title": "مفتاح API",
  "login.apiKey.placeholder": "أدخل مفتاح API",
  "login.apiKey.providerLabel": "مزوّد مفتاح API",
  "login.apiKey.getApiKey": "الحصول على مفتاح API",
  "login.apiKey.cancel": "إلغاء",
  "login.apiKey.continue": "متابعة",
  "login.apiKey.emptyError": "أدخل مفتاح API.",
  "login.apiKey.providerMissingError":
    "لم يُعثر على إعداد المزوّد المدمج لـ {provider}. يرجى المحاولة لاحقًا.",
  "login.apiKey.saveError": "تعذّر حفظ مفتاح API: {error}",
  "login.apiKey.skipError": "تعذّر تخطي إعداد مفتاح API: {error}",
  "login.skip": "تخطٍّ الآن",

  "app.currentTheme": "الحالي: {theme}",
  "app.login": "ربط الحساب",
  "app.logout": "قطع الاتصال",
  "app.selectFile": "اختر ملفًا للبدء",
  "app.workspace": "مساحة العمل",

  "locale.switchLanguage": "تغيير اللغة",

  "onboarding.dialog.title": "مرحبًا بك في Idexal",
  "onboarding.dialog.description": "اختر كيف تبدأ جلستك الأولى.",
  "onboarding.wizard.label": "دليل الترحيل",
  "onboarding.welcome.eyebrow": "إعداد التشغيل الأول",
  "onboarding.welcome.title": "مرحبًا بك في Idexal",
  "onboarding.welcome.start": "ابدأ Idexal",
  "onboarding.welcome.migrate": "دليل الترحيل",
  "onboarding.welcome.helper": "استورد إعدادات أدواتك الحالية الآن، أو تخطَّ وتابع لاحقًا من الإعدادات.",
  "onboarding.step.session": "الجلسات",
  "onboarding.step.skillsImport": "المهارات",
  "onboarding.step.mcpImport": "خوادم MCP",
  "onboarding.step.pluginsImport": "الإضافات",
  "onboarding.step.commandsImport": "الأوامر",
  "onboarding.step.agentsFile": "ملف AGENTS.md",
  "onboarding.step.migration": "الترحيل",
  "onboarding.sessions.count": "{count} جلسة",
  "onboarding.sessions.unlimited": "غير محدود",
  "onboarding.sessions.chooseWorkspace": "اختر مساحة العمل",
  "onboarding.agentsFile.sourceLabel": "المصدر",
  "onboarding.agentsFile.targetLabel": "الهدف",
  "onboarding.agentsFile.loading": "جارٍ الفحص...",
};

export default ar;
