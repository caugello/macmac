import { createContext } from 'react'

type ToastType = 'success' | 'error' | 'info'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
}

export interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

export const ToastContext = createContext<ToastContextValue | null>(null)
