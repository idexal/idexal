import { useState } from 'react'

import { useT } from '@/lib/useI18n'
import { Card, PageHeader } from '@/components/ui/primitives'
import { FaIcon } from '@/components/shared/FaIcon'
import { useSeo } from '@/lib/useSeo'

export function ContactPage() {
  useSeo({ title: "Contact", description: "Talk to the Idexal team — we usually reply within one business day." })
  const t = useT()
  const [sent, setSent] = useState(false)
  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader title={t('nav.contact')} desc="We usually reply within one business day." />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6 sm:p-8">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-4xl">✅</span>
                <p className="font-semibold">Message sent — thank you!</p>
                <button className="btn btn-secondary mt-2" onClick={() => setSent(false)}>Send another</button>
              </div>
            ) : (
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSent(true)
                }}
              >
                <label className="text-sm font-medium">
                  Name
                  <input required className="input mt-1.5" placeholder="Ahmed Hassan" />
                </label>
                <label className="text-sm font-medium">
                  Email
                  <input required type="email" className="input mt-1.5" placeholder="you@example.com" />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Subject
                  <input className="input mt-1.5" placeholder="How can we help?" />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Message
                  <textarea required rows={5} className="input mt-1.5 resize-y" placeholder="Tell us more…" />
                </label>
                <div className="sm:col-span-2">
                  <button className="btn btn-primary px-8">Send message</button>
                </div>
              </form>
            )}
          </Card>
          <div className="space-y-4">
            {[
              { icon: 'fa-envelope', label: 'Email', value: 'team@idexal.com' },
              { icon: 'fa-phone', label: 'Phone', value: '+20 2 1234 5678' },
              { icon: 'fa-location-dot', label: 'Office', value: 'Cairo · Dubai · Remote' },
              { icon: 'fa-message', label: 'Community', value: 'github.com/idexal' },
            ].map((c) => (
              <Card key={c.label} className="flex items-center gap-4 p-4">
                <span className="rounded-xl bg-blue-500/10 p-3 text-primary"><FaIcon icon={c.icon} className="h-5 w-5" /></span>
                <div>
                  <div className="text-xs text-muted">{c.label}</div>
                  <div className="text-sm font-semibold">{c.value}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
