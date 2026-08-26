import { useState } from 'react'
import { useT } from '@/lib/useI18n'
import { Card, FadeIn, PageHeader } from '@/components/ui/primitives'
import { PricingTable } from '@/components/marketing/sections'
import { PlanComparison, PricingCalculator } from '@/components/marketing/PricingExtras'
import { PayAsYouGo } from '@/pages/marketing/ModelsPage'
import { FaIcon } from '@/components/shared/FaIcon'
import { useSeo } from '@/lib/useSeo'

const FAQ = [
  {
    q: 'Is the Free plan really free?',
    a: 'Yes. The Free tier includes the full IDE with 1,000 AI API calls per month — no credit card required.',
    aAr: 'نعم. الخطة المجانية تتضمن بيئة التطوير كاملة مع 1,000 طلب ذكاء اصطناعي شهرياً — دون بطاقة ائتمان.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Anytime. Upgrades apply immediately with prorated billing; downgrades take effect at the next cycle.',
    aAr: 'في أي وقت. الترقية تسري فوراً مع فوترة تناسبية، والتخفيض يبدأ من الدورة التالية.',
  },
  {
    q: 'Which AI providers are supported?',
    a: 'OpenAI, Anthropic, Google, Mistral, DeepSeek, Groq, Ollama (local) and any OpenAI-compatible endpoint.',
    aAr: 'OpenAI وAnthropic وGoogle وMistral وDeepSeek وGroq وOllama (محلياً) وأي واجهة متوافقة مع OpenAI.',
  },
  {
    q: 'Do you offer team discounts?',
    a: 'Team plans include 10 seats. For larger teams and education, contact sales for volume pricing.',
    aAr: 'خطط الفرق تشمل 10 مقاعد. للفرق الأكبر والتعليم، تواصل مع المبيعات لأسعار الكميات.',
  },
]

export function PricingPage() {
  useSeo({ title: "Pricing", description: "Simple transparent pricing — start free, pay as you grow. Pro $29/mo, Team $99/mo, custom Enterprise." })
  const t = useT()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader title={t('pricing.title')} desc={t('pricing.subtitle')} />
        <PricingTable />
        <div className="mt-16">
          <PricingCalculator />
        </div>
        <div className="mt-8">
          <PlanComparison />
        </div>
        <div className="mt-16">
          <PayAsYouGo />
        </div>
        <h2 className="mt-20 text-center text-2xl font-bold sm:text-3xl">{t('pricing.faqTitle')}</h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {FAQ.map((f, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <Card className="overflow-hidden">
                <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start" onClick={() => setOpen(open === i ? null : i)}>
                  <span className="font-semibold">{f.q}</span>
                  <FaIcon icon="fa-chevron-down" className="`h-4 w-4 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`" />
                </button>
                {open === i && <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{isAr() ? f.aAr : f.a}</p>}
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  )
}

function isAr() {
  return document.documentElement.lang === 'ar'
}
