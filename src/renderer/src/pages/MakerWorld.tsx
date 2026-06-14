import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Compass, Heart, Download, Check, X, Loader2, ExternalLink } from 'lucide-react'
import { useData } from '../state'
import { useI18n } from '../i18n'
import { needsBorder } from '../lib/ui'
import type { MwModel, MwColor } from '../../../shared/types'

interface ColorState {
  colors: MwColor[]
  loading: boolean
}

function hexRgb(h: string): [number, number, number] | null {
  const c = h.replace('#', '')
  if (c.length < 6) return null
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}
function dist(a: string, b: string): number {
  const x = hexRgb(a)
  const y = hexRgb(b)
  if (!x || !y) return Infinity
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

export function MakerWorld(): React.JSX.Element {
  const { data } = useData()
  const { t } = useI18n()
  const cloud = data.settings.cloud

  const [q, setQ] = useState('')
  const [models, setModels] = useState<MwModel[]>([])
  const [colorsMap, setColorsMap] = useState<Record<number, ColorState>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onlyBuildable, setOnlyBuildable] = useState(false)
  const runIdRef = useRef(0)

  const invColors = useMemo(
    () => data.spools.filter((s) => !s.archived && s.remainingG > 0).map((s) => s.colorHex),
    [data.spools]
  )
  const matched = (hex: string): boolean => invColors.some((c) => dist(c, hex) < 45)

  // model durumu: true = yapılabilir, false = eksik renk, undefined = renkler yükleniyor/bilinmiyor
  const buildable = (id: number): boolean | undefined => {
    const cm = colorsMap[id]
    if (!cm || cm.loading || cm.colors.length === 0) return undefined
    return cm.colors.every((c) => matched(c.color))
  }

  const loadColors = async (list: MwModel[], runId: number): Promise<void> => {
    const queue = [...list]
    const worker = async (): Promise<void> => {
      while (queue.length) {
        const m = queue.shift()
        if (!m) break
        const res = await window.api.mwColors(m.id)
        if (runId !== runIdRef.current) return
        setColorsMap((prev) => ({ ...prev, [m.id]: { colors: res.colors ?? [], loading: false } }))
      }
    }
    await Promise.all(Array.from({ length: 6 }, () => worker()))
  }

  const run = async (opts: { q?: string; navKey?: string }): Promise<void> => {
    if (!cloud?.token) {
      setError(t('mw.needLogin'))
      return
    }
    setLoading(true)
    setError(null)
    const runId = ++runIdRef.current
    const res = await window.api.mwSearch({ ...opts, limit: 24 })
    if (runId !== runIdRef.current) return
    setLoading(false)
    if (res.expired) {
      setError(t('mw.expired'))
      return
    }
    if (!res.ok || !res.models) {
      setError(res.error ?? t('mw.noResults'))
      setModels([])
      return
    }
    setModels(res.models)
    const init: Record<number, ColorState> = {}
    res.models.forEach((m) => (init[m.id] = { colors: [], loading: true }))
    setColorsMap(init)
    loadColors(res.models, runId)
  }

  useEffect(() => {
    if (cloud?.token) run({ navKey: 'Trending' })
    else setError(t('mw.needLogin'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = onlyBuildable ? models.filter((m) => buildable(m.id) === true) : models

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">{t('mw.intro')}</p>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            className="input pl-9"
            placeholder={t('mw.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run({ q })}
          />
        </div>
        <button className="btn-primary" onClick={() => run({ q })} disabled={loading || !cloud?.token}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {t('common.search')}
        </button>
        <button className="btn-ghost" onClick={() => run({ navKey: 'Trending' })} disabled={loading || !cloud?.token}>
          <Compass size={16} /> {t('mw.trending')}
        </button>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            className="accent-bambu w-4 h-4"
            checked={onlyBuildable}
            onChange={(e) => setOnlyBuildable(e.target.checked)}
          />
          {t('mw.onlyBuildable')}
        </label>
      </div>

      {error && <p className="text-sm text-accent-amber">{error}</p>}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> {t('mw.searching')}
        </div>
      )}

      {!loading && !error && visible.length === 0 && <p className="text-sm text-gray-500">{t('mw.noResults')}</p>}

      <div className="grid grid-cols-3 gap-4">
        {visible.map((m) => {
          const cm = colorsMap[m.id]
          const b = buildable(m.id)
          const missing = cm && !cm.loading ? cm.colors.filter((c) => !matched(c.color)).length : 0
          return (
            <div key={m.id} className="card overflow-hidden flex flex-col">
              <div className="relative h-40 bg-ink-900">
                {m.cover && <img src={m.cover} alt="" className="w-full h-full object-cover" />}
                {b === true && (
                  <span className="absolute top-2 left-2 chip py-0.5 bg-bambu text-black font-medium">
                    <Check size={12} /> {t('mw.buildable')}
                  </span>
                )}
                {b === false && (
                  <span className="absolute top-2 left-2 chip py-0.5 bg-ink-850/90 text-accent-amber">
                    {t('mw.missing', { n: missing })}
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div className="text-sm font-medium leading-snug line-clamp-2" title={m.title}>
                  {m.title}
                </div>
                <div className="text-xs text-gray-500 truncate">{m.creator}</div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Heart size={12} /> {m.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download size={12} /> {m.downloads.toLocaleString()}
                  </span>
                </div>

                {/* Required colors */}
                <div className="min-h-[24px] flex items-center gap-1.5 flex-wrap">
                  {!cm || cm.loading ? (
                    <Loader2 size={13} className="animate-spin text-gray-600" />
                  ) : cm.colors.length === 0 ? (
                    <span className="text-xs text-gray-600">—</span>
                  ) : (
                    cm.colors.map((c, i) => {
                      const ok = matched(c.color)
                      return (
                        <span
                          key={i}
                          title={`${c.color}${c.type ? ' · ' + c.type : ''} — ${ok ? '✓' : '✗'}`}
                          className="relative inline-flex items-center justify-center rounded-md"
                          style={{
                            width: 20,
                            height: 20,
                            background: c.color,
                            border: needsBorder(c.color) ? '1px solid #3a4347' : '1px solid rgba(0,0,0,0.25)'
                          }}
                        >
                          <span
                            className="absolute -bottom-1 -right-1 rounded-full"
                            style={{ background: ok ? '#00ae42' : '#ff5c5c', width: 9, height: 9 }}
                          >
                            {ok ? (
                              <Check size={7} className="text-black absolute inset-0 m-auto" />
                            ) : (
                              <X size={7} className="text-white absolute inset-0 m-auto" />
                            )}
                          </span>
                        </span>
                      )
                    })
                  )}
                </div>

                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost py-1.5 mt-auto justify-center text-xs"
                >
                  <ExternalLink size={13} /> {t('mw.open')}
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
