import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from './toast-context'

const noopToast: ToastContextValue = {
  toast: () => {},
  confirm: () => Promise.resolve(false),
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  return ctx ?? noopToast
}
