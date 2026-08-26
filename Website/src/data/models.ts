/** Idexal first-party model catalog — served from api.idexa.com/v1 */
export interface IdexalModel {
  id: string
  name: string
  tier: string // i18n key suffix: flagship | fastest | repoScale | embeddings
  ctx: string
  inputPer1m: number
  outputPer1m: number
  caps: string[] // i18n key suffixes
  blurbEn: string
  blurbAr: string
}

export const IDEXAL_MODELS: IdexalModel[] = [
  {
    id: 'idexal-pro',
    name: 'Idexal Pro',
    tier: 'flagship',
    ctx: '200K',
    inputPer1m: 3,
    outputPer1m: 15,
    caps: ['capChat', 'capCode', 'capReason', 'capVision', 'capTools'],
    blurbEn: 'Our most capable model. Frontier reasoning and agentic coding across entire repositories.',
    blurbAr: 'أقوى نماذجنا. استدلال من الطراز الأول وبرمجة وكيلية عبر مستودعات كاملة.',
  },
  {
    id: 'idexal-lite',
    name: 'Idexal Lite',
    tier: 'fastest',
    ctx: '128K',
    inputPer1m: 0.15,
    outputPer1m: 0.6,
    caps: ['capChat', 'capCode', 'capTools'],
    blurbEn: 'Latency-optimized for autocomplete, chat and high-volume pipelines at a fraction of the cost.',
    blurbAr: 'محسّن للسرعة للإكمال التلقائي والمحادثة والخطوط عالية الحجم بجزء يسير من التكلفة.',
  },
  {
    id: 'idexal-code',
    name: 'Idexal Code',
    tier: 'repoScale',
    ctx: '1M',
    inputPer1m: 1.5,
    outputPer1m: 6,
    caps: ['capChat', 'capCode', 'capReason', 'capTools'],
    blurbEn: 'Million-token context tuned for repo-wide refactors, code review and migration.',
    blurbAr: 'سياق بمليون توكن مضبوط لإعادة الهيكلة الشاملة ومراجعة الكود والترحيل.',
  },
  {
    id: 'idexal-embed',
    name: 'Idexal Embed',
    tier: 'embeddings',
    ctx: '8K',
    inputPer1m: 0.02,
    outputPer1m: 0,
    caps: ['capEmbed'],
    blurbEn: 'SOTA embeddings powering Idexal local semantic search. 1536 dimensions, multilingual.',
    blurbAr: 'تضمينات من الطراز الأول تشغّل البحث الدلالي المحلي في إديكسال. 1536 بُعداً، متعددة اللغات.',
  },
]

export const API_ENDPOINT = 'https://api.idexa.com/v1'
export const API_DOCS_URL = 'https://idexal.com/docs/api'
