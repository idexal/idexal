import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { useT } from '@/lib/useI18n'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

const TABS = [
  { id: 'general', icon: 'fa-gear', label: 'General' },
  { id: 'email', icon: 'fa-envelope', label: 'Email (Resend)' },
  { id: 'billing', icon: 'fa-credit-card', label: 'Billing (Stripe)' },
  { id: 'gateway', icon: 'fa-plug-circle-bolt', label: 'Gateway (api.idexa.com)' },
  { id: 'security', icon: 'fa-shield-halved', label: 'Security' },
]

export function AdminSettingsPage() {
  const t = useT()
  const toast = useUiStore((s) => s.toast)
  const [tab, setTab] = useState('general')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    toast('Settings saved', 'success')
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <>
      <PageHeader title={t('dash.settings')} desc="Platform configuration — changes apply immediately." />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {TABS.map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-start text-sm font-medium transition ${
                tab === x.id ? 'bg-blue-500/10 text-primary' : 'text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
              }`}
            >
              <FaIcon icon={x.icon} className="w-4" /> {x.label}
            </button>
          ))}
        </aside>

        <div className="min-w-0 space-y-4">
          {tab === 'general' && (
            <Card className="space-y-4 p-6">
              <h3 className="font-bold">General</h3>
              <label className="block text-sm font-medium">Site name<input defaultValue="Idexal" className="input mt-1.5" /></label>
              <label className="block text-sm font-medium">Support email<input dir="ltr" defaultValue="team@idexal.com" className="input mt-1.5" /></label>
              <label className="block text-sm font-medium">Default language
                <select defaultValue="en" className="input mt-1.5"><option value="en">English</option><option value="ar">العربية</option></select>
              </label>
              <div className="space-y-2">
                {[
                  ['Public registrations', 'Allow new signups', true],
                  ['Maintenance mode', 'Show maintenance page to non-admins', false],
                  ['Beta features', 'Enable experimental panels', false],
                ].map(([title, desc, on]) => (
                  <label key={title as string} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">
                    <span><b>{title}</b><span className="block text-xs text-muted">{desc}</span></span>
                    <input type="checkbox" defaultChecked={on as boolean} className="h-5 w-5 accent-[var(--primary)]" />
                  </label>
                ))}
              </div>
              <button onClick={save} className="btn btn-primary">{saved ? '✓ Saved' : 'Save changes'}</button>
            </Card>
          )}

          {tab === 'email' && (
            <Card className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 font-bold"><FaIcon icon="fa-envelope" className="text-primary" /> Email delivery — Resend</h3>
              <Badge color="green"><FaIcon icon="fa-check" className="h-3" /> Connected</Badge>
              <label className="block text-sm font-medium">From address<input dir="ltr" defaultValue="noreply@idexal.com" className="input mt-1.5" /></label>
              <label className="block text-sm font-medium">Reply-to<input dir="ltr" defaultValue="team@idexal.com" className="input mt-1.5" /></label>
              <div className="space-y-2 text-sm">
                {[
                  ['Welcome email', 'Sent on signup', true],
                  ['Verify address', '6-digit code', true],
                  ['Invoice receipts', 'On every payment', true],
                  ['Payment failed alerts', 'With retry link', true],
                  ['Usage threshold warnings', 'At 80% and 100% of budget', true],
                ].map(([n, d, on]) => (
                  <label key={n as string} className="flex items-center justify-between rounded-xl border border-line p-3">
                    <span><b>{n}</b><span className="block text-xs text-muted">{d}</span></span>
                    <input type="checkbox" defaultChecked={on as boolean} className="h-5 w-5 accent-[var(--primary)]" />
                  </label>
                ))}
              </div>
              <button onClick={save} className="btn btn-primary">{saved ? '✓ Saved' : 'Save'}</button>
            </Card>
          )}

          {tab === 'billing' && (
            <Card className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 font-bold"><FaIcon icon="fa-credit-card" className="text-primary" /> Stripe</h3>
              <Badge color="green"><FaIcon icon="fa-check" className="h-3" /> Connected — live mode</Badge>
              <label className="block text-sm font-medium">Webhook endpoint<input dir="ltr" readOnly value="https://idexal.com/api/webhooks/stripe" className="input mt-1.5 bg-[var(--surface-2)]" /></label>
              <div className="space-y-2 text-sm">
                {[
                  ['invoice.paid', 'Mark invoice paid, grant credits'],
                  ['invoice.payment_failed', 'Flag past_due, send alert'],
                  ['customer.subscription.deleted', 'Downgrade to Free'],
                  ['charge.refunded', 'Record refund in ledger'],
                ].map(([ev, d]) => (
                  <div key={ev} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
                    <code dir="ltr" className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">{ev}</code>
                    <span className="text-xs text-muted">{d}</span>
                    <Badge color="green" ><FaIcon icon="fa-check" className="h-2.5" /></Badge>
                  </div>
                ))}
              </div>
              <button onClick={save} className="btn btn-primary">{saved ? '✓ Saved' : 'Save'}</button>
            </Card>
          )}

          {tab === 'gateway' && (
            <Card className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 font-bold"><FaIcon icon="fa-plug-circle-bolt" className="text-primary" /> OmniRoute gateway — api.idexa.com</h3>
              <label className="block text-sm font-medium">Gateway URL<input dir="ltr" defaultValue="https://api.idexa.com" className="input mt-1.5" /></label>
              <label className="block text-sm font-medium">Admin access token (oma_live_…)
                <input dir="ltr" type="password" defaultValue="oma_live_••••••••••••" className="input mt-1.5" />
              </label>
              <label className="block text-sm font-medium">Auto-provision user keys
                <select defaultValue="on" className="input mt-1.5"><option value="on">On — instant twin on the gateway</option><option value="batch">Batch — hourly sync</option><option value="off">Off</option></select>
              </label>
              <label className="block text-sm font-medium">Default monthly budget per key (USD)<input dir="ltr" type="number" defaultValue={5} className="input mt-1.5 w-32" /></label>
              <div className="rounded-xl bg-blue-500/5 p-4 text-xs leading-relaxed text-muted">
                Docs: <code dir="ltr" className="font-mono">docs/OMNIROUTE-INTEGRATION.md</code>. The token is stored encrypted (AES-256) and never leaves the server.
              </div>
              <button onClick={save} className="btn btn-primary">{saved ? '✓ Saved' : 'Save'}</button>
            </Card>
          )}

          {tab === 'security' && (
            <Card className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 font-bold"><FaIcon icon="fa-shield-halved" className="text-primary" /> Security</h3>
              <div className="space-y-2">
                {[
                  ['Require 2FA for admins', 'All admin roles must enroll', true],
                  ['IP allowlist for admin panel', 'Only listed IPs can reach /admin', false],
                  ['Session timeout', 'Auto-logout after 24h idle', true],
                  ['Audit log exports', 'Weekly CSV to support inbox', true],
                ].map(([n, d, on]) => (
                  <label key={n as string} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">
                    <span><b>{n}</b><span className="block text-xs text-muted">{d}</span></span>
                    <input type="checkbox" defaultChecked={on as boolean} className="h-5 w-5 accent-[var(--primary)]" />
                  </label>
                ))}
              </div>
              <label className="block text-sm font-medium">Session idle timeout (hours)<input dir="ltr" type="number" defaultValue={24} className="input mt-1.5 w-32" /></label>
              <button onClick={save} className="btn btn-primary">{saved ? '✓ Saved' : 'Save'}</button>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
