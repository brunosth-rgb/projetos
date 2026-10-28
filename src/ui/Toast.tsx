import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export interface ToastInput {
  message: string
  retry?: () => void
}

interface ToastItem extends ToastInput {
  id: number
}

interface ToastApi {
  pushToast(t: ToastInput): void
}

const ToastContext = createContext<ToastApi | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(list => list.filter(t => t.id !== id))
  }, [])

  const pushToast = useCallback((t: ToastInput) => {
    setToasts(list => [...list, { ...t, id: nextId++ }])
  }, [])

  const api = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col items-end gap-2 max-sm:right-0 max-sm:left-0 max-sm:mx-auto max-sm:items-center"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full items-center gap-3 rounded-card border border-border bg-surface py-2 pr-2 pl-4 text-sm text-ink shadow-float"
          >
            <span className="min-w-0 flex-1 py-1">{t.message}</span>
            {t.retry && (
              <button
                type="button"
                className="h-8 shrink-0 rounded-control px-2 font-medium text-ink underline-offset-2 transition-colors hover:bg-active hover:underline max-sm:h-11"
                onClick={() => {
                  const retry = t.retry
                  dismiss(t.id)
                  retry?.()
                }}
              >
                Tentar de novo
              </button>
            )}
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => dismiss(t.id)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-active hover:text-ink max-sm:size-11"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
