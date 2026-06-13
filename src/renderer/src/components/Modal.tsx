import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, children, footer, wide }: Props): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={onClose}
    >
      <div
        className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] flex flex-col shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-600/60">
          <h3 className="text-base font-semibold text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-ink-600/60 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
