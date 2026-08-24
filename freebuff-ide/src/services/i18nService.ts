/**
 * i18n Service - Internationalization
 * Multi-language support for the IDE interface
 */

export type SupportedLanguage = 'en' | 'ar'

export interface TranslationMap {
  [key: string]: string
}

const ENGLISH: TranslationMap = {
  // General
  'app.name': 'Idexal IDE',
  'app.welcome': 'Welcome to Idexal IDE',
  'app.subtitle': 'AI-Powered Multi-Agent Development Environment',
  'app.version': 'Version',
  
  // Navigation
  'nav.files': 'Files',
  'nav.search': 'Search',
  'nav.git': 'Git',
  'nav.agents': 'Agents',
  'nav.memory': 'Memory',
  'nav.settings': 'Settings',
  'nav.extensions': 'Extensions',
  
  // Editor
  'editor.openFile': 'Open File',
  'editor.newFile': 'New File',
  'editor.save': 'Save',
  'editor.saveAll': 'Save All',
  'editor.closeTab': 'Close Tab',
  'editor.closeOthers': 'Close Others',
  'editor.closeAll': 'Close All',
  'editor.splitEditor': 'Split Editor',
  'editor.format': 'Format Document',
  'editor.findReplace': 'Find and Replace',
  
  // Panels
  'panel.terminal': 'Terminal',
  'panel.chat': 'AI Chat',
  'panel.git': 'Git',
  'panel.debug': 'Debug',
  'panel.snippets': 'Code Snippets',
  'panel.agents': 'Agent Dashboard',
  'panel.outline': 'Symbol Outline',
  'panel.markdown': 'Markdown Preview',
  'panel.tasks': 'Task Runner',
  'panel.api': 'API Client',
  'panel.json': 'JSON Viewer',
  'panel.regex': 'Regex Tester',
  'panel.database': 'Database',
  'panel.todos': 'TODO Finder',
  'panel.bookmarks': 'Bookmarks',
  'panel.docker': 'Docker',
  'panel.packages': 'Packages',
  'panel.notifications': 'Notifications',
  'panel.gitAdvanced': 'Git Advanced',
  'panel.extensions': 'Extensions Marketplace',
  'panel.profiler': 'Performance Profiler',
  'panel.liveShare': 'Live Share',
  
  // Status Bar
  'status.problems': 'problems',
  'status.warnings': 'warnings',
  'status.aiReady': 'AI Ready',
  'status.connected': 'Connected',
  'status.branch': 'Branch',
  
  // Actions
  'action.install': 'Install',
  'action.uninstall': 'Uninstall',
  'action.update': 'Update',
  'action.remove': 'Remove',
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.confirm': 'Confirm',
  'action.close': 'Close',
  'action.search': 'Search',
  'action.filter': 'Filter',
  'action.sort': 'Sort',
  'action.refresh': 'Refresh',
  'action.copy': 'Copy',
  'action.paste': 'Paste',
  'action.undo': 'Undo',
  'action.redo': 'Redo',
  'action.delete': 'Delete',
  'action.edit': 'Edit',
  'action.view': 'View',
  'action.add': 'Add',
  'action.create': 'Create',
  'action.run': 'Run',
  'action.stop': 'Stop',
  'action.start': 'Start',
  
  // Git
  'git.commit': 'Commit',
  'git.push': 'Push',
  'git.pull': 'Pull',
  'git.branch': 'Branch',
  'git.merge': 'Merge',
  'git.stash': 'Stash',
  'git.diff': 'Diff',
  'git.status': 'Status',
  'git.log': 'Log',
  'git.stage': 'Stage',
  'git.unstage': 'Unstage',
  'git.discard': 'Discard',
  'git.branches': 'Branches',
  'git.newBranch': 'New Branch',
  'git.switchBranch': 'Switch Branch',
  
  // AI
  'ai.chat': 'AI Chat',
  'ai.workflow': 'Workflow',
  'ai.collab': 'Collaborative',
  'ai.auto': 'Auto',
  'ai.code': 'Code',
  'ai.review': 'Review',
  'ai.debug': 'Debug',
  'ai.architect': 'Architect',
  'ai.test': 'Test',
  'ai.devops': 'DevOps',
  'ai.security': 'Security',
  'ai.performance': 'Performance',
  'ai.askPlaceholder': 'Ask AI anything about your code...',
  'ai.noProvider': 'No AI provider configured. Responses will be demo only.',
  'ai.configure': 'Configure AI Provider',
  
  // Settings
  'settings.title': 'Settings',
  'settings.general': 'General',
  'settings.appearance': 'Appearance',
  'settings.editor': 'Editor',
  'settings.keybindings': 'Keybindings',
  'settings.terminal': 'Terminal',
  'settings.ai': 'AI Provider',
  'settings.extensions': 'Extensions',
  'settings.theme': 'Theme',
  'settings.fontSize': 'Font Size',
  'settings.tabSize': 'Tab Size',
  'settings.wordWrap': 'Word Wrap',
  'settings.minimap': 'Minimap',
  'settings.lineNumbers': 'Line Numbers',
  
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.warning': 'Warning',
  'common.info': 'Info',
  'common.all': 'All',
  'common.none': 'None',
  'common.enabled': 'Enabled',
  'common.disabled': 'Disabled',
  'common.required': 'Required',
  'common.optional': 'Optional',
  'common.name': 'Name',
  'common.description': 'Description',
  'common.version': 'Version',
  'common.author': 'Author',
  'common.size': 'Size',
  'common.date': 'Date',
  'common.time': 'Time',
  'common.type': 'Type',
  'common.status': 'Status',
  'common.actions': 'Actions',
  'common.noResults': 'No results found',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.previous': 'Previous',
  'common.finish': 'Finish',
  'common.open': 'Open',
  'common.close': 'Close',
  'common.read': 'Read',
  'common.unread': 'Unread',
  'common.markAllRead': 'Mark all read',
  'common.clearAll': 'Clear all',
}

const ARABIC: TranslationMap = {
  // General
  'app.name': 'ايدكزال IDE',
  'app.welcome': 'مرحباً بك في ايدكزال IDE',
  'app.subtitle': 'بيئة تطوير مدعومة بالذكاء الاصطناعي متعددة الوكلاء',
  'app.version': 'الإصدار',
  
  // Navigation
  'nav.files': 'الملفات',
  'nav.search': 'بحث',
  'nav.git': 'جيتهب',
  'nav.agents': 'الوكلاء',
  'nav.memory': 'الذاكرة',
  'nav.settings': 'الإعدادات',
  'nav.extensions': 'الإضافات',
  
  // Editor
  'editor.openFile': 'فتح ملف',
  'editor.newFile': 'ملف جديد',
  'editor.save': 'حفظ',
  'editor.saveAll': 'حفظ الكل',
  'editor.closeTab': 'إغلاق التبويب',
  'editor.closeOthers': 'إغلاق البقية',
  'editor.closeAll': 'إغلاق الكل',
  'editor.splitEditor': 'تقسيم المحرر',
  'editor.format': 'تنسيق المستند',
  'editor.findReplace': 'بحث واستبدال',
  
  // Panels
  'panel.terminal': 'الطرفية',
  'panel.chat': 'محادثة الذكاء الاصطناعي',
  'panel.git': 'جيتهب',
  'panel.debug': 'التصحيح',
  'panel.snippets': 'أكواد مختصرة',
  'panel.agents': 'لوحة الوكلاء',
  'panel.outline': 'مخطط الرموز',
  'panel.markdown': 'معاينة الماركداون',
  'panel.tasks': 'محرك المهام',
  'panel.api': 'عميل API',
  'panel.json': 'عارض JSON',
  'panel.regex': 'محرر التعبيرات النمطية',
  'panel.database': 'قاعدة البيانات',
  'panel.todos': 'باحث المهام',
  'panel.bookmarks': 'الإشارات المرجعية',
  'panel.docker': 'دوكر',
  'panel.packages': 'الحزم',
  'panel.notifications': 'الإشعارات',
  'panel.gitAdvanced': 'جيتهب متقدم',
  'panel.extensions': 'سوق الإضافات',
  'panel.profiler': 'أداة قياس الأداء',
  'panel.liveShare': 'مشاركة مباشرة',
  
  // Status Bar
  'status.problems': 'مشاكل',
  'status.warnings': 'تحذيرات',
  'status.aiReady': 'الذكاء الاصطناعي جاهز',
  'status.connected': 'متصل',
  'status.branch': 'الفرع',
  
  // Actions
  'action.install': 'تثبيت',
  'action.uninstall': 'إلغاء التثبيت',
  'action.update': 'تحديث',
  'action.remove': 'إزالة',
  'action.save': 'حفظ',
  'action.cancel': 'إلغاء',
  'action.confirm': 'تأكيد',
  'action.close': 'إغلاق',
  'action.search': 'بحث',
  'action.filter': 'تصفية',
  'action.sort': 'ترتيب',
  'action.refresh': 'تحديث',
  'action.copy': 'نسخ',
  'action.paste': 'لصق',
  'action.undo': 'تراجع',
  'action.redo': 'إعادة',
  'action.delete': 'حذف',
  'action.edit': 'تعديل',
  'action.view': 'عرض',
  'action.add': 'إضافة',
  'action.create': 'إنشاء',
  'action.run': 'تشغيل',
  'action.stop': 'إيقاف',
  'action.start': 'بدء',
  
  // Git
  'git.commit': 'التزام',
  'git.push': 'دفع',
  'git.pull': 'سحب',
  'git.branch': 'فرع',
  'git.merge': 'دمج',
  'git.stash': 'تخزين',
  'git.diff': 'فروقات',
  'git.status': 'حالة',
  'git.log': 'سجل',
  'git.stage': 'تنسيق',
  'git.unstage': 'إلغاء التنسيق',
  'git.discard': 'تجاهل',
  'git.branches': 'الفروع',
  'git.newBranch': 'فرع جديد',
  'git.switchBranch': 'تبديل الفرع',
  
  // AI
  'ai.chat': 'محادثة الذكاء الاصطناعي',
  'ai.workflow': 'سير العمل',
  'ai.collab': 'تعاوني',
  'ai.auto': 'تلقائي',
  'ai.code': 'برمجة',
  'ai.review': 'مراجعة',
  'ai.debug': 'تصحيح',
  'ai.architect': 'معماري',
  'ai.test': 'اختبار',
  'ai.devops': 'عمليات',
  'ai.security': 'أمان',
  'ai.performance': 'أداء',
  'ai.askPlaceholder': 'اسأل الذكاء الاصطناعي أي شيء عن كودك...',
  'ai.noProvider': 'لم يتم تكوين مزود الذكاء الاصطناعي. ستكون الردود تجريبية فقط.',
  'ai.configure': 'تكوين مزود الذكاء الاصطناعي',
  
  // Settings
  'settings.title': 'الإعدادات',
  'settings.general': 'عام',
  'settings.appearance': 'المظهر',
  'settings.editor': 'المحرر',
  'settings.keybindings': 'اختصارات لوحة المفاتيح',
  'settings.terminal': 'الطرفية',
  'settings.ai': 'مزود الذكاء الاصطناعي',
  'settings.extensions': 'الإضافات',
  'settings.theme': 'السمة',
  'settings.fontSize': 'حجم الخط',
  'settings.tabSize': 'حجم التبويب',
  'settings.wordWrap': 'التفاف الكلمات',
  'settings.minimap': 'الخريطة المصغرة',
  'settings.lineNumbers': 'أرقام الأسطر',
  
  // Common
  'common.loading': 'جاري التحميل...',
  'common.error': 'خطأ',
  'common.success': 'نجاح',
  'common.warning': 'تحذير',
  'common.info': 'معلومات',
  'common.all': 'الكل',
  'common.none': 'لا شيء',
  'common.enabled': 'مفعّل',
  'common.disabled': 'معطّل',
  'common.required': 'مطلوب',
  'common.optional': 'اختياري',
  'common.name': 'الاسم',
  'common.description': 'الوصف',
  'common.version': 'الإصدار',
  'common.author': 'المؤلف',
  'common.size': 'الحجم',
  'common.date': 'التاريخ',
  'common.time': 'الوقت',
  'common.type': 'النوع',
  'common.status': 'الحالة',
  'common.actions': 'الإجراءات',
  'common.noResults': 'لم يتم العثور على نتائج',
  'common.back': 'رجوع',
  'common.next': 'التالي',
  'common.previous': 'السابق',
  'common.finish': 'إنهاء',
  'common.open': 'فتح',
  'common.close': 'إغلاق',
  'common.read': 'مقروء',
  'common.unread': 'غير مقروء',
  'common.markAllRead': 'تعليم الكل كمقروء',
  'common.clearAll': 'مسح الكل',
}

const TRANSLATIONS: Record<SupportedLanguage, TranslationMap> = {
  en: ENGLISH,
  ar: ARABIC,
}

let currentLanguage: SupportedLanguage = 'en'
const listeners: Set<() => void> = new Set()

/**
 * Get a translated string by key
 */
export function t(key: string, fallback?: string): string {
  const translations = TRANSLATIONS[currentLanguage]
  return translations[key] || fallback || key
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return currentLanguage
}

/**
 * Set the current language
 */
export function setLanguage(lang: SupportedLanguage): void {
  currentLanguage = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
  listeners.forEach(fn => fn())
}

/**
 * Subscribe to language changes
 */
export function onLanguageChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): { code: SupportedLanguage; name: string; nativeName: string }[] {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  ]
}

/**
 * Get RTL languages
 */
export function isRTL(): boolean {
  return currentLanguage === 'ar'
}

/**
 * Get all keys for a namespace
 */
export function getNamespaceKeys(namespace: string): string[] {
  const translations = TRANSLATIONS[currentLanguage]
  return Object.keys(translations).filter(key => key.startsWith(namespace + '.'))
}
