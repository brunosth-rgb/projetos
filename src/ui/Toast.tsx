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
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className="flex items-center gap-3 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
          >
            <span>{t.message}</span>
            {t.retry && (
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => {
                  const retry = t.retry
                  dismiss(t.id)
                  retry?.()
                }}
              >
                Tentar de novo
              </button>
            )}
            <button type="button" aria-label="Fechar aviso" onClick={() => dismiss(t.id)}>
              ×
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
