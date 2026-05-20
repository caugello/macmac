import { useCallback, useState, useEffect } from 'react'
import { Icon } from './icon'
import { ToastContext, type ConfirmOptions } from './toast-context'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

const iconMap: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
}

const styleMap: Record<ToastType, string> = {
  success: 'bg-primary text-primary-foreground',
  error: 'bg-destructive text-destructive-foreground',
  info: 'bg-inverse-surface text-inverse-on-surface',
}

let nextId = 0

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const confirmFn = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve })
    })
  }, [])

  const handleConfirm = (result: boolean) => {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm: confirmFn }}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade"
            onClick={() => handleConfirm(false)}
          />
          <div className="relative bg-surface-container-lowest rounded-xl wireframe-border shadow-xl max-w-sm w-full p-6 animate-enter">
            <h3 className="text-headline-md font-heading font-semibold mb-2">
              {confirmState.options.title}
            </h3>
            <p className="text-body-md text-on-surface-variant mb-6">
              {confirmState.options.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleConfirm(false)}
                className="px-5 py-2.5 rounded-full text-label-md font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                {confirmState.options.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className={`px-5 py-2.5 rounded-full text-label-md font-semibold transition-colors ${
                  confirmState.options.variant === 'destructive'
                    ? 'bg-destructive text-destructive-foreground hover:brightness-110'
                    : 'bg-primary text-primary-foreground hover:brightness-110'
                }`}
              >
                {confirmState.options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg text-label-md font-medium animate-enter ${styleMap[toast.type]}`}
    >
      <Icon name={iconMap[toast.type]} size={20} filled />
      {toast.message}
    </div>
  )
}
