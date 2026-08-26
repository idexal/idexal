import { useUiStore } from '@/stores/uiStore'
import { FaIcon } from '@/components/shared/FaIcon'

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-[var(--surface)] p-3.5 text-start text-sm shadow-xl"
        >
          {t.kind === 'success' ? (
            <FaIcon icon="fa-circle-check" className="h-5 w-5 shrink-0 text-accent" />
          ) : t.kind === 'error' ? (
            <FaIcon icon="fa-circle-xmark" className="h-5 w-5 shrink-0 text-red-500" />
          ) : (
            <FaIcon icon="fa-circle-info" className="h-5 w-5 shrink-0 text-primary" />
          )}
          <span className="flex-1">{t.msg}</span>
        </button>
      ))}
    </div>
  )
}
