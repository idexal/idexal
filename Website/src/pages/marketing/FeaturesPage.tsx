import { useT } from '@/lib/useI18n'
import { FeaturesGrid } from '@/components/marketing/sections'

export function FeaturesPage() {
  useT()
  return (
    <div className="pt-4">
      <FeaturesGrid />
    </div>
  )
}
