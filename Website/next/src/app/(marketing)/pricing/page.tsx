import type { Metadata } from 'next'
import { Check, X, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for Idexal IDE. Start free, upgrade when you need more.',
}

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For professional developers',
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$99',
    period: '/month',
    description: 'For development teams',
    cta: 'Contact Sales',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations',
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const FEATURES = [
  { name: 'Basic IDE', free: true, pro: true, team: true, enterprise: true },
  { name: 'Projects', free: '3', pro: 'Unlimited', team: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'API Calls/mo', free: '1K', pro: '50K', team: '200K', enterprise: 'Custom' },
  { name: 'AI Agents', free: false, pro: true, team: true, enterprise: true },
  { name: 'AI Chat', free: false, pro: true, team: true, enterprise: true },
  { name: 'All Plugins', free: false, pro: true, team: true, enterprise: true },
  { name: 'Priority Support', free: false, pro: true, team: true, enterprise: true },
  { name: 'Team Members', free: false, pro: false, team: '10', enterprise: 'Unlimited' },
  { name: 'Admin Dashboard', free: false, pro: false, team: true, enterprise: true },
  { name: 'Analytics', free: false, pro: false, team: true, enterprise: true },
  { name: 'SSO / SAML', free: false, pro: false, team: false, enterprise: true },
  { name: 'On-Premise', free: false, pro: false, team: false, enterprise: true },
  { name: 'SLA', free: false, pro: false, team: false, enterprise: '99.9%' },
  { name: 'Dedicated Support', free: false, pro: false, team: false, enterprise: true },
]

const FAQ = [
  { q: 'Can I try Pro for free?', a: 'Yes! Every Pro plan starts with a 14-day free trial. No credit card required.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, PayPal, and wire transfers for Enterprise plans.' },
  { q: 'Can I change plans at any time?', a: 'Absolutely. Upgrade or downgrade at any time. Changes take effect immediately with proration.' },
  { q: 'Is there a student discount?', a: 'Yes! Students get 50% off Pro and Team plans with a valid .edu email address.' },
  { q: 'What happens when my API limit is reached?', a: 'You can purchase additional API calls or upgrade your plan. We never cut off access without notice.' },
]

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-5 h-5 text-brand-500 mx-auto" />
  if (value === false) return <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
  return <span className="text-sm font-medium">{value}</span>
}

export default function PricingPage() {
  return (
    <div className="py-20 lg:py-28">
      <div className="container-x">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Simple, transparent <span className="gradient-text">pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.highlighted
                  ? 'border-brand-500 shadow-xl shadow-brand-500/10 bg-white dark:bg-surface-900'
                  : 'border-border bg-white dark:bg-surface-900'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-white rounded-full gradient-brand">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <a
                href="/register"
                className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'text-white gradient-brand hover:opacity-90'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-1/3">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.name} className="text-center py-3 px-4 text-sm font-semibold">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => (
                  <tr key={f.name} className="border-b border-border/50 hover:bg-surface-50 dark:hover:bg-surface-900/50 transition-colors">
                    <td className="py-3 px-4 text-sm">{f.name}</td>
                    <td className="text-center py-3 px-4"><CellValue value={f.free} /></td>
                    <td className="text-center py-3 px-4"><CellValue value={f.pro} /></td>
                    <td className="text-center py-3 px-4"><CellValue value={f.team} /></td>
                    <td className="text-center py-3 px-4"><CellValue value={f.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-border bg-white dark:bg-surface-900 overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  {item.q}
                  <HelpCircle className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
