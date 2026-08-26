import { FaIcon } from '@/components/shared/FaIcon'
import { useLang } from '@/lib/useI18n'
import { Badge, Card, FadeIn, PageHeader, StatCard } from '@/components/ui/primitives'
import { useSeo } from '@/lib/useSeo'

const FIXES = [
  {
    sev: 'critical',
    n: 1,
    titleEn: 'Disabled Same-Origin Policy',
    titleAr: 'تعطيل سياسة المصدر الواحد',
    file: 'main.ts:30',
    impactEn: 'Any malicious content in the renderer could read the filesystem and bypass CORS — the sandbox was fully undermined.',
    impactAr: 'أي محتوى خبيث في العارض كان يستطيع قراءة نظام الملفات وتجاوز CORS — العزل كان منهاراً بالكامل.',
    fixEn: 'webSecurity: true enforced — Same-Origin Policy active.',
    fixAr: 'فرض webSecurity: true — سياسة المصدر الواحد مفعّلة.',
  },
  {
    sev: 'critical',
    n: 2,
    titleEn: 'Mixed-content loading',
    titleAr: 'تحميل محتوى مختلط',
    file: 'main.ts:31',
    impactEn: 'HTTP content ran inside HTTPS context with full renderer privileges in dev mode.',
    impactAr: 'محتوى HTTP كان يعمل داخل سياق HTTPS بصلاحيات كاملة في وضع التطوير.',
    fixEn: 'allowRunningInsecureContent removed entirely from webPreferences.',
    fixAr: 'أُزيل allowRunningInsecureContent كلياً من إعدادات العارض.',
  },
  {
    sev: 'critical',
    n: 3,
    titleEn: 'Arbitrary shell execution (RCE)',
    titleAr: 'تنفيذ أوامر shell عشوائي (RCE)',
    file: 'main.ts:523',
    impactEn: 'The exec-command IPC handler ran arbitrary shell commands from the renderer with full env — a compromised renderer meant full remote-code execution.',
    impactAr: 'معالج exec-command كان ينفذ أوامر shell عشوائية من العارض بكامل البيئة — اختراق العارض يعني تنفيذ كود كامل.',
    fixEn: 'Handler removed by design. Git and terminal flows rewritten over scoped IPC (terminalWrite, gitReset, gitCheckoutFile).',
    fixAr: 'أُزيل المعالج عمداً. أعيدت تدفقات Git والطرفية عبر IPC محدود النطاق.',
  },
  {
    sev: 'critical',
    n: 4,
    titleEn: 'Git command injection',
    titleAr: 'حقن أوامر Git',
    file: 'main.ts:617',
    impactEn: 'Commit messages and branch names were interpolated into shell strings — a commit message containing "; rm -rf /;" achieved RCE.',
    impactAr: 'رسائل الالتزام وأسماء الفروع كانت تُدمج في نصوص shell — رسالة تحوي "; rm -rf /;" كانت تكفي لتنفيذ كود.',
    fixEn: 'All shell interpolation eliminated — arguments passed as arrays, never as strings.',
    fixAr: 'أُزيل الدمج النصي كلياً — الوسائط تمر كمصفوفات لا كسلاسل.',
  },
  {
    sev: 'critical',
    n: 5,
    titleEn: 'Unvalidated IPC channels',
    titleAr: 'قنوات IPC دون تحقق',
    file: 'preload.ts',
    impactEn: 'The preload bridge exposed channels without a whitelist, widening the attack surface.',
    impactAr: 'جسر الـ preload كان يكشف قنوات دون قائمة سماح، مما وسّع سطح الهجوم.',
    fixEn: 'contextBridge now exposes a validated whitelist only; every handler validates sender + payload.',
    fixAr: 'contextBridge يكشف قائمة سماح متحققاً منها فقط؛ كل معالج يتحقق من المرسل والحمولة.',
  },
]

export function SecurityAuditPage() {
  useSeo({ title: "Security Audit", description: "Full security audit of the Idexal IDE Electron core: 10 issues found and fixed." })
  useLang()
  const ar = document.documentElement.lang === 'ar'
  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader
          title={ar ? 'تقرير تدقيق الأمان' : 'Security Audit Report'}
          desc={ar ? 'Idexal IDE — عملية Electron الرئيسية وجسر Preload · أغسطس 2026' : 'Idexal IDE — Electron main process & preload · August 2026'}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={ar ? 'حرجة — مُصلحة' : 'Critical — Fixed'} value="5" icon={<FaIcon icon="fa-triangle-exclamation" className="h-5 w-5" />} />
          <StatCard label={ar ? 'عالية — مُصلحة' : 'High — Fixed'} value="5" icon={<FaIcon icon="fa-lock" className="h-5 w-5" />} />
          <StatCard label={ar ? 'متوسطة — معلوماتية' : 'Medium — Informational'} value="4" icon={<FaIcon icon="fa-circle-info" className="h-5 w-5" />} />
          <StatCard label={ar ? 'إجمالي الإصلاحات' : 'Total Fixed'} value="10" icon={<FaIcon icon="fa-shield-halved" className="h-5 w-5" />} />
        </div>

        <FadeIn>
          <Card className="mt-6 p-6">
            <h2 className="font-bold">🛡️ {ar ? 'معمارية الأمان' : 'Security Architecture'}</h2>
            <div dir="ltr" className="mt-4 space-y-2 font-mono text-xs leading-6 text-muted">
              <div className="rounded-lg bg-[var(--surface-2)] p-3">Renderer Process — <b className="text-accent">Sandboxed · No Node.js</b></div>
              <div className="text-center">↕ contextBridge (whitelist)</div>
              <div className="rounded-lg bg-[var(--surface-2)] p-3">Preload Script — <b className="text-primary">Validated channels</b></div>
              <div className="text-center">↕ IPC (invoke/handle)</div>
              <div className="rounded-lg bg-[var(--surface-2)] p-3">Main Process — <b>Path validation · URL allowlist</b></div>
              <div className="text-center">↕ N-API Native Module (.node)</div>
              <div className="rounded-lg bg-[var(--surface-2)] p-3">Rust Engine — <b className="text-cyan-400">Zero-cost safety (FFI)</b></div>
            </div>
          </Card>
        </FadeIn>

        <h2 className="mt-10 text-xl font-bold">{ar ? 'الإصلاحات الحرجة الخمسة' : 'The Five Critical Fixes'}</h2>
        <div className="mt-4 space-y-4">
          {FIXES.map((f, i) => (
            <FadeIn key={f.n} delay={i * 0.05}>
              <Card className="p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge color="red">{ar ? 'حرجة' : 'Critical'} #{f.n}</Badge>
                  <h3 className="font-bold">{ar ? f.titleAr : f.titleEn}</h3>
                  <code dir="ltr" className="font-mono text-xs text-muted">{f.file}</code>
                  <span className="ms-auto"><Badge color="green">✓ {ar ? 'مُصلحة' : 'Fixed'}</Badge></span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-red-500/5 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-red-500">{ar ? 'الأثر' : 'Impact'}</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{ar ? f.impactAr : f.impactEn}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/5 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-accent">{ar ? 'الإصلاح' : 'Fix Applied'}</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{ar ? f.fixAr : f.fixEn}</p>
                  </div>
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>

        <FadeIn>
          <Card className="mt-8 p-6">
            <h3 className="flex items-center gap-2 font-bold"><FaIcon icon="fa-file-shield" className="text-primary" /> {ar ? 'المنهجية' : 'Methodology'}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {ar
                ? 'تدقيق داخلي شمل عملية Electron الرئيسية وجسر preload وكل معالجات IPC. نموذج التهديد: عارض مخترق بالكامل عبر XSS. كل إصلاح مُتحقق منه باختبارات انحدار، والتدقيق يتكرر قبل كل إصدار رئيسي.'
                : 'An internal audit covering the Electron main process, the preload bridge and every IPC handler. Threat model: a fully renderer-compromise via XSS. Every fix is verified with regression tests, and the audit repeats before each major release.'}
            </p>
          </Card>
        </FadeIn>
      </div>
    </div>
  )
}
