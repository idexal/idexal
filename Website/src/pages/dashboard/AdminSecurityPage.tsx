import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { useT } from '@/lib/useI18n'
import { Badge, Card, PageHeader, Progress, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

const SESSIONS = [
  { device: 'MacBook Pro — Chrome 128', ip: '41.62.10.11', location: 'Cairo, EG', last: 'Active now', current: true },
  { device: 'iPhone 15 — Safari', ip: '41.62.10.11', location: 'Cairo, EG', last: '2h ago', current: false },
  { device: 'Windows 11 — Edge', ip: '88.12.44.9', location: 'Paris, FR', last: '3d ago', current: false },
]

const ALLOWLIST = ['41.62.10.0/24', '88.12.44.9', '10.0.0.0/8']

export function AdminSecurityPage() {
  const t = useT()
  const toast = useUiStore((s) => s.toast)
  const [enrolling2fa, setEnrolling2fa] = useState(false)
  const [newIp, setNewIp] = useState('')
  const [allowlist, setAllowlist] = useState(ALLOWLIST)

  const enroll = () => {
    setEnrolling2fa(true)
    setTimeout(() => {
      setEnrolling2fa(false)
      toast('2FA enrolled — scan the QR in your authenticator', 'success')
    }, 1200)
  }

  return (
    <>
      <PageHeader title={t('dash.security')} desc="Account hardening, sessions and network policy." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Security score" value="92/100" icon={<FaIcon icon="fa-shield-halved" className="h-5 w-5" />} />
        <StatCard label="2FA adoption" value="45%" icon={<FaIcon icon="fa-user-lock" className="h-5 w-5" />} />
        <StatCard label="Blocked IPs (30d)" value="23" icon={<FaIcon icon="fa-ban" className="h-5 w-5" />} />
        <StatCard label="Active sessions" value={String(SESSIONS.length)} icon={<FaIcon icon="fa-laptop" className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-bold">Two-factor authentication</h3>
          <p className="mt-1 text-sm text-muted">TOTP via Google Authenticator, Authy or 1Password.</p>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-line p-4">
            <div>
              <div className="text-sm font-semibold">Admin account 2FA</div>
              <div className="text-xs text-amber-500">Not enrolled — required for admin roles</div>
            </div>
            <button onClick={enroll} disabled={enrolling2fa} className="btn btn-primary shrink-0">
              {enrolling2fa ? <FaIcon icon="fa-arrows-rotate" className="h-4 w-4 animate-spin" /> : 'Enable'}
            </button>
          </div>
          {enrolling2fa && (
            <div className="mt-4 rounded-xl bg-[var(--surface-2)] p-4 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-xl bg-white text-[10px] font-mono text-slate-800">
                ▓▓ QR ▓▓<br />CODE
              </div>
              <p className="mt-2 text-xs text-muted">Scan with your authenticator app, then enter the 6-digit code.</p>
            </div>
          )}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">Security score breakdown</span>
              <span className="font-bold text-accent">92</span>
            </div>
            <Progress value={92} color="#10b981" />
            <ul className="mt-3 space-y-1.5 text-xs text-muted">
              <li>✓ Encryption at rest (AES-256)</li>
              <li>✓ Sandbox enforced, no arbitrary exec</li>
              <li>⚠ Enforce 2FA org-wide (+5 points)</li>
              <li>⚠ Rotate 2 keys older than 90 days (+3 points)</li>
            </ul>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold">Active sessions</h3>
          <div className="mt-4 space-y-2.5">
            {SESSIONS.map((s) => (
              <div key={s.device} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {s.device} {s.current && <Badge color="green">this device</Badge>}
                  </div>
                  <div dir="ltr" className="text-xs text-muted">{s.location} · {s.ip} · {s.last}</div>
                </div>
                {!s.current && (
                  <button className="shrink-0 text-xs font-semibold text-red-500 hover:underline" onClick={() => toast(`Session revoked (${s.location})`, 'success')}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="btn btn-danger mt-4 w-full" onClick={() => toast('All other sessions revoked', 'success')}>
            Revoke all other sessions
          </button>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h3 className="font-bold">Admin panel IP allowlist</h3>
        <p className="mt-1 text-sm text-muted">When non-empty, /admin is reachable only from these addresses.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {allowlist.map((ip) => (
            <span key={ip} dir="ltr" className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-1.5 font-mono text-xs">
              {ip}
              <button onClick={() => { setAllowlist(allowlist.filter((x) => x !== ip)); toast(`${ip} removed`, 'success') }} className="text-red-500">×</button>
            </span>
          ))}
        </div>
        <form
          className="mt-4 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newIp.trim()) return
            setAllowlist([...allowlist, newIp.trim()])
            toast(`${newIp.trim()} added to allowlist`, 'success')
            setNewIp('')
          }}
        >
          <input dir="ltr" value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="203.0.113.0/24" className="input font-mono text-xs" />
          <button className="btn btn-secondary shrink-0"><FaIcon icon="fa-plus" className="h-3.5 w-3.5" /> Add</button>
        </form>
      </Card>

      <Card className="mt-6 p-5">
        <h3 className="mb-3 font-semibold">Recent security events</h3>
        <TableWrap head={['Severity', 'Event', 'Source', 'When']}>
          {[
            ['critical', 'Brute-force attempt blocked', 'IP 45.33.x.x', '12 min ago'],
            ['medium', 'New admin session', 'Marie Dubois — Paris', '2h ago'],
            ['info', 'API key rotated', 'production key', '5h ago'],
            ['medium', 'Rate limit exceeded', 'key sk-…a1b2', 'Yesterday'],
          ].map(([sev, ev, src, when]) => (
            <tr key={ev as string}>
              <Td><Badge color={sev === 'critical' ? 'red' : sev === 'medium' ? 'amber' : 'gray'}>{sev}</Badge></Td>
              <Td className="font-medium">{ev}</Td>
              <Td dir="ltr" className="text-muted">{src}</Td>
              <Td className="text-muted">{when}</Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
