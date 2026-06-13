import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { needsBorder } from '../lib/ui'

interface Toast {
  id: number
  text: string
  hex?: string
}

interface ToastCtx {
  notify: (text: string, hex?: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const notify = useCallback((text: string, hex?: string) => {
    const id = ++counter.current
    setToasts((t) => [...t, { id, text, hex }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in card flex items-center gap-3 px-4 py-3 shadow-2xl border-bambu/40 bg-ink-800"
          >
            {t.hex ? (
              <span
                className="inline-block w-6 h-6 rounded-md shrink-0"
                style={{
                  background: t.hex,
                  border: needsBorder(t.hex) ? '1px solid #3a4347' : '1px solid rgba(0,0,0,0.25)'
                }}
              />
            ) : (
              <CheckCircle2 size={18} className="text-bambu" />
            )}
            <span className="text-sm text-gray-100">{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
