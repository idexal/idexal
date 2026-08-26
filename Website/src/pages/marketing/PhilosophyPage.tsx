import { FaIcon } from '@/components/shared/FaIcon'
import { useLang } from '@/lib/useI18n'
import { Badge, Card, FadeIn, PageHeader, SectionTitle } from '@/components/ui/primitives'
import { useSeo } from '@/lib/useSeo'

const PILLARS = [
  {
    icon: 'fa-eye',
    titleEn: 'Invisible intelligence, made visible',
    titleAr: 'ذكاء خفي، يُرى',
    descEn: 'The most profound systems possess an inherent beauty that transcends function. We translate neural pathways and circuit topologies into compositions that feel ancient and futuristic at once.',
    descAr: 'أعمق الأنظمة تمتلك جمالاً يتجاوز وظيفتها. نترجم المسارات العصبية وطوبولوجيا الدوائر إلى مؤلفات تبدو قديمة ومستقبلية في آن.',
  },
  {
    icon: 'fa-palette',
    titleEn: 'Color as emanation',
    titleAr: 'اللون كتجلٍّ',
    descEn: 'Deep voids of midnight navy suggest infinite computational space, punctuated by luminous threads of cerulean and cyan tracing the pathways of thought — data made beautiful, not decoration.',
    descAr: 'سُدُل كحلية عميقة توحي بفضاء حسابي لا نهائي، تخترقها خيوط سماوية مضيئة ترسم مسارات الفكر — بيانات جميلة، لا زخرفة.',
  },
  {
    icon: 'fa-vector-square',
    titleEn: 'Charged space',
    titleAr: 'فضاء مشحون',
    descEn: 'The vast dark fields are active participants — the computational breath before insight arrives. Geometric forms emerge with the quiet authority of established truth.',
    descAr: 'الحقول الداكنة الواسعة مشاركة فاعلة — النَفَس الحسابي قبل وصول البصيرة. تنبثق الأشكال الهندسية بسلطة الحقيقة الراسخة.',
  },
  {
    icon: 'fa-font',
    titleEn: 'Typography as texture',
    titleAr: 'الحرف كنسيج',
    descEn: 'Letters and numbers appear as specimens — clinical, precise — the annotations of an imaginary science studying the geometry of thought itself.',
    descAr: 'الحروف والأرقام عينات — سريرية دقيقة — شروح علمٍ متخيل يدرس هندسة الفكر ذاته.',
  },
  {
    icon: 'fa-circle-nodes',
    titleEn: 'Natural systems, cosmic scale',
    titleAr: 'أنظمة طبيعية بمقياس كوني',
    descEn: 'Clustering patterns mirror neural networks; repeating elements suggest iterative computation; layered transparencies reveal depth like geological strata of knowledge.',
    descAr: 'أنماط التجميع تحاكي الشبكات العصبية؛ التكرار يحاكي الحساب التكراري؛ الشفافيات الطبقية تكشف العمق كطبقات جيولوجية من المعرفة.',
  },
  {
    icon: 'fa-gem',
    titleEn: 'Nothing is arbitrary',
    titleAr: 'لا شيء اعتباطي',
    descEn: 'Every mark exists because the philosophy demands it — the composition would be diminished by its absence. Craftsmanship at the absolute pinnacle of the discipline.',
    descAr: 'كل علامة موجودة لأن الفلسفة تطلبها — غيابها ينقص المؤلف. حِرَفية على قمة التمكن.',
  },
]

export function PhilosophyPage() {
  useSeo({ title: "Computational Elegance", description: "Our design philosophy: the aesthetic of invisible intelligence made visible." })
  useLang()
  const ar = document.documentElement.lang === 'ar'
  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader
          title={ar ? 'الأناقة الحسابية' : 'Computational Elegance'}
          desc={ar
            ? 'فلسفة تصميم للتعبير البصري عن الأنظمة الذكية، الحِرَفية الإنسانية، والمعماريات الخفية التي تصل الفكر بالخلق.'
            : 'A design philosophy for the visual expression of intelligent systems, human craftsmanship, and the invisible architectures that connect thought to creation.'}
        />

        <FadeIn>
          <Card className="relative overflow-hidden p-8 sm:p-12">
            <div className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: '#22d3ee' }} />
            <Badge color="blue">{ar ? 'فلسفة الهوية' : 'Brand Philosophy'}</Badge>
            <h2 className="mt-4 max-w-3xl text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">
              {ar
                ? 'جمال الذكاء الخفي المتجسّد. نؤمن أن أعمق الأنظمة — تلك التي تفكر وتتعلم وتخلق — تمتلك جوهراً جمالياً يتجاوز وظيفتها.'
                : 'The aesthetic of invisible intelligence made visible. We believe the most profound systems — those that think, learn, and create — possess an inherent beauty that transcends their function.'}
            </h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-muted">
              {ar
                ? 'كل عنصر في منتجاتنا موضوع بدقة ساعاتيّ يضبط مكونات ساعة فلكية — كل خط، كل تدرج، كل علاقة مكانية ثمرة ساعات من الصقل. التدرجات لا تنتقل فحسب، بل تفكّر: من يقين الأزرق إلى غموض الإبداع، محاكاةً لرحلة المعروف إلى المجهول.'
                : 'Every element in our products is placed with the obsessive precision of a master horologist adjusting a grand complication — each line, each gradient, each spatial relationship the product of countless hours of refinement. Our gradients do not merely transition; they think: from the certainty of blue into the creative ambiguity of the unknown, mirroring the journey from known to unknown.'}
            </p>
          </Card>
        </FadeIn>

        <div className="mt-14">
          <SectionTitle title={ar ? 'الأعمدة الستة' : 'The Six Pillars'} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p, i) => (
              <FadeIn key={p.titleEn} delay={i * 0.06}>
                <Card className="h-full p-6" hover>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 text-primary">
                    <FaIcon icon={p.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-bold">{ar ? p.titleAr : p.titleEn}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{ar ? p.descAr : p.descEn}</p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn>
          <Card className="mt-14 p-8 text-center sm:p-12">
            <FaIcon icon="fa-quote-left" className="mx-auto h-6 w-6 text-primary" />
            <p className="mx-auto mt-4 max-w-3xl text-xl font-semibold leading-relaxed">
              {ar
                ? '«النتيجة يجب أن تبدو كأثرٍ من مستقبل اندمج فيه الفن والحساب تخصصاً واحداً — مصنوعة بعناية، تحمل بصمة من أتقن كل جوانب صنعتعه.»'
                : '"The result should feel like an artifact from a future where art and computation have merged into a single discipline — meticulously crafted, bearing the unmistakable quality of mastered craft."'}
            </p>
            <p className="mt-4 text-sm text-muted">— {ar ? 'فلسفة إديكسال للتصميم' : 'The Idexal design philosophy'}</p>
          </Card>
        </FadeIn>
      </div>
    </div>
  )
}
