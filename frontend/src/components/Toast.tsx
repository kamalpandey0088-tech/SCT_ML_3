import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { Toast as ToastType } from '../hooks/useToast'

interface ToastProps {
  toast: ToastType
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastProps) {
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!itemRef.current) return
    gsap.fromTo(itemRef.current, 
      { x: 120, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
    )

    const timer = setTimeout(() => {
      if (itemRef.current) {
        gsap.to(itemRef.current, {
          x: 120,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.in',
          onComplete: () => onDismiss(toast.id)
        })
      }
    }, toast.duration ?? 4000)

    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  const typeConfig = {
    success: { border: 'border-l-green-500', icon: '✅' },
    error: { border: 'border-l-red-500', icon: '🔴' },
    info: { border: 'border-l-cyan-500', icon: 'ℹ️' },
    warning: { border: 'border-l-yellow-500', icon: '⚠️' }
  }

  const current = typeConfig[toast.type]

  return (
    <div
      ref={itemRef}
      className={`glass border-l-4 ${current.border} rounded-xl p-4 shadow-xl flex items-start gap-3 w-80 text-white pointer-events-auto`}
    >
      <span className="text-lg flex-shrink-0">{current.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-relaxed break-words">{toast.message}</p>
      </div>
      <button 
        onClick={() => onDismiss(toast.id)}
        className="text-white/30 hover:text-white/80 transition-colors text-xs ml-2"
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastType[]
  onDismiss: (id: string) => void
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
