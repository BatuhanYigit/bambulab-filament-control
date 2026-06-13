import React, { useEffect, useLayoutEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'

interface Step {
  /** i18n key prefix: `${key}.title` / `${key}.body` */
  key: string
  /** data-tour attribute of the element to highlight (omit for a centered step) */
  targetId?: string
  /** page to navigate to when this step shows */
  page?: string
}

const STEPS: Step[] = [
  { key: 'tour.welcome' },
  { key: 'tour.panel', targetId: 'nav-panel', page: 'panel' },
  { key: 'tour.inventory', targetId: 'nav-envanter', page: 'envanter' },
  { key: 'tour.catalog', targetId: 'nav-katalog', page: 'katalog' },
  { key: 'tour.history', targetId: 'nav-gecmis', page: 'gecmis' },
  { key: 'tour.settings', targetId: 'nav-ayarlar', page: 'ayarlar' },
  { key: 'tour.done' }
]

const PAD = 6
const TOOLTIP_W = 330

export function Tour({
  onNavigate,
  onClose
}: {
  onNavigate: (page: string) => void
  onClose: () => void
}): React.JSX.Element {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  // Navigate to the step's page so the highlighted area is in context
  useEffect(() => {
    if (step.page) onNavigate(step.page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // Measure the target element (after any navigation/layout settles)
  useLayoutEffect(() => {
    const measure = (): void => {
      if (!step.targetId) {
        setRect(null)
        return
      }
      const el = document.querySelector(`[data-tour="${step.targetId}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const id = window.setTimeout(measure, 60)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('resize', measure)
    }
  }, [i, step.targetId])

  const finish = (): void => onClose()
  const next = (): void => (last ? finish() : setI((n) => n + 1))
  const back = (): void => setI((n) => Math.max(0, n - 1))

  // Tooltip position
  const vw = window.innerWidth
  const vh = window.innerHeight
  let tipStyle: React.CSSProperties
  if (rect) {
    const left = Math.min(rect.right + 16, vw - TOOLTIP_W - 16)
    const top = Math.min(Math.max(rect.top, 16), vh - 240)
    tipStyle = { position: 'fixed', left, top, width: TOOLTIP_W, zIndex: 1010 }
  } else {
    tipStyle = {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: TOOLTIP_W,
      zIndex: 1010
    }
  }

  return (
    <div className="fixed inset-0 z-[1000]" data-tour-overlay>
      {/* Click blocker + dimming */}
      {rect ? (
        <div
          className="fixed pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 12,
            border: '2px solid #00ae42',
            boxShadow: '0 0 0 9999px rgba(8,10,11,0.78)',
            transition: 'all 0.2s ease',
            zIndex: 1005
          }}
        />
      ) : (
        <div className="fixed inset-0" style={{ background: 'rgba(8,10,11,0.82)', zIndex: 1005 }} />
      )}
      {/* transparent catcher so the app isn't clickable during the tour */}
      <div className="fixed inset-0" style={{ zIndex: 1001 }} onClick={() => {}} />

      {/* Tooltip card */}
      <div className="card p-5 shadow-2xl toast-in" style={tipStyle}>
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-200"
          title={t('tour.skip')}
        >
          <X size={18} />
        </button>
        <h3 className="text-base font-semibold text-gray-100 pr-6">{t(`${step.key}.title`)}</h3>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">{t(`${step.key}.body`)}</p>

        {/* progress dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? 'w-5 bg-bambu' : 'w-1.5 bg-ink-600'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-500">{t('tour.step', { c: i + 1, n: STEPS.length })}</span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost py-1.5 text-xs" onClick={finish}>
              {t('tour.skip')}
            </button>
            {i > 0 && (
              <button className="btn-ghost py-1.5 text-xs" onClick={back}>
                {t('tour.back')}
              </button>
            )}
            <button className="btn-primary py-1.5 text-xs" onClick={next}>
              {last ? t('tour.finish') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
