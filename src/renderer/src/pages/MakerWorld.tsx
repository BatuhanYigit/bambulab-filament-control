import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Compass, Heart, Download, Check, X, Loader2, ExternalLink, Shuffle, SlidersHorizontal } from 'lucide-react'
import { useData } from '../state'
import { useI18n } from '../i18n'
import { needsBorder } from '../lib/ui'
import type { MwModel, MwColor } from '../../../shared/types'

interface ColorState {
  colors: MwColor[]
  loading: boolean
}
type Source = { q?: string; navKey?: string }
type Sort = 'match' | 'likes' | 'downloads'

const LIMIT = 36

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // filters
  const [tolerance, setTolerance] = useState(70)
  const [maxColors, setMaxColors] = useState(0) // 0 = any
  const [sort, setSort] = useState<Sort>('match')
  const [onlyBuildable, setOnlyBuildable] = useState(false)

  const sourceRef = useRef<Source>({ navKey: 'Trending' })
  const nextOffsetRef = useRef(0)
  const runIdRef = useRef(0)

  const invColors = useMemo(
    () => data.spools.filter((s) => !s.archived && s.remainingG > 0).map((s) => s.colorHex),
    [data.spools]
  )
  const matched = (hex: string): boolean => invColors.some((c) => dist(c, hex) < tolerance)

  const colorsOf = (id: number): ColorState | undefined => colorsMap[id]
  const missingOf = (id: number): number => {
    const cm = colorsMap[id]
    if (!cm || cm.loading) return -1
    return cm.colors.filter((c) => !matched(c.color)).length
  }
  const buildableOf = (id: number): boolean | undefined => {
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

  const fetchPage = async (src: Source, offset: number, append: boolean): Promise<void> => {
    if (!cloud?.token) {
      setError(t('mw.needLogin'))
      return
    }
    sourceRef.current = src
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setModels([])
      setColorsMap({})
    }
    setError(null)
    const runId = ++runIdRef.current
    const res = await window.api.mwSearch({ ...src, offset, limit: LIMIT })
    if (runId !== runIdRef.current) return
    setLoading(false)
    setLoadingMore(false)
    if (res.expired) {
      setError(t('mw.expired'))
      return
    }
    if (!res.ok || !res.models) {
      setError(res.error ?? t('mw.noResults'))
      return
    }
    nextOffsetRef.current = offset + LIMIT
    setTotal(res.total ?? res.models.length)
    const fresh = res.models
    setModels((prev) => {
      if (!append) return fresh
      const have = new Set(prev.map((m) => m.id))
      return [...prev, ...fresh.filter((m) => !have.has(m.id))]
    })
    setColorsMap((prev) => {
      const next = { ...prev }
      fresh.forEach((m) => {
        if (!next[m.id]) next[m.id] = { colors: [], loading: true }
      })
      return next
    })
    loadColors(fresh, runId)
  }

  const onSearch = (): void => {
    void fetchPage(q.trim() ? { q: q.trim() } : { navKey: 'Trending' }, 0, false)
  }
  const onTrending = (): void => {
    setQ('')
    fetchPage({ navKey: 'Trending' }, 0, false)
  }
  const onDiscover = (): void => {
    setQ('')
    const cat = `category_${Math.floor(Math.random() * 9) + 1}00`
    const offset = Math.floor(Math.random() * 20) * LIMIT
    fetchPage({ navKey: cat }, offset, false)
  }
  const onLoadMore = (): void => {
    void fetchPage(sourceRef.current, nextOffsetRef.current, true)
  }

  useEffect(() => {
    if (cloud?.token) fetchPage({ navKey: 'Trending' }, 0, false)
    else setError(t('mw.needLogin'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // filter + sort for display
  const visible = useMemo(() => {
    let list = models.slice()
    if (maxColors > 0) {
      list = list.filter((m) => {
        const cm = colorsMap[m.id]
        if (!cm || cm.loading) return true // bilinmiyor → göster
        return cm.colors.length <= maxColors
      })
    }
    if (onlyBuildable) list = list.filter((m) => buildableOf(m.id) === true)
    const rank = (id: number): number => {
      const b = buildableOf(id)
      if (b === true) return 0
      if (b === undefined) return 1
      return 2
    }
    list.sort((a, b) => {
      if (sort === 'likes') return b.likes - a.likes
      if (sort === 'downloads') return b.downloads - a.downloads
      // match
      const ra = rank(a.id)
      const rb = rank(b.id)
      if (ra !== rb) return ra - rb
      const ma = missingOf(a.id)
      const mb = missingOf(b.id)
      if (ma >= 0 && mb >= 0 && ma !== mb) return ma - mb
      return b.likes - a.likes
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, colorsMap, maxColors, onlyBuildable, sort, tolerance, invColors])

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">{t('mw.intro')}</p>

      {/* Search + sources */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            className="input pl-9"
            placeholder={t('mw.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>
        <button className="btn-primary" onClick={onSearch} disabled={loading || !cloud?.token}>
          <Search size={16} /> {t('common.search')}
        </button>
        <button className="btn-ghost" onClick={onTrending} disabled={loading || !cloud?.token}>
          <Compass size={16} /> {t('mw.trending')}
        </button>
        <button className="btn-ghost" onClick={onDiscover} disabled={loading || !cloud?.token}>
          <Shuffle size={16} /> {t('mw.discover')}
        </button>
      </div>

      {/* Advanced filters */}
      <div className="card p-3 flex items-center gap-5 flex-wrap text-sm">
        <span className="flex items-center gap-1.5 text-gray-400">
          <SlidersHorizontal size={15} /> {t('mw.filters')}
        </span>

        <label className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">{t('mw.sort')}</span>
          <select className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="match">{t('mw.sortMatch')}</option>
            <option value="likes">{t('mw.sortLikes')}</option>
            <option value="downloads">{t('mw.sortDownloads')}</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">{t('mw.tolerance')}</span>
          <span className="text-[10px] text-gray-600">{t('mw.strict')}</span>
          <input
            type="range"
            min={30}
            max={130}
            step={5}
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="accent-bambu"
          />
          <span className="text-[10px] text-gray-600">{t('mw.loose')}</span>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">{t('mw.maxColors')}</span>
          <select
            className="input w-auto py-1.5"
            value={maxColors}
            onChange={(e) => setMaxColors(Number(e.target.value))}
          >
            <option value={0}>{t('mw.any')}</option>
            {[1, 2, 3, 4, 5, 6, 8].map((n) => (
              <option key={n} value={n}>
                ≤ {n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="accent-bambu w-4 h-4"
            checked={onlyBuildable}
            onChange={(e) => setOnlyBuildable(e.target.checked)}
          />
          {t('mw.onlyBuildable')}
        </label>

        <div className="flex-1" />
        <span className="text-xs text-gray-500">{t('mw.results', { n: visible.length })}</span>
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
          const cm = colorsOf(m.id)
          const b = buildableOf(m.id)
          const missing = missingOf(m.id)
          return (
            <div key={m.id} className="card overflow-hidden flex flex-col">
              <div className="relative h-40 bg-ink-900">
                {m.cover && <img src={m.cover} alt="" className="w-full h-full object-cover" loading="lazy" />}
                {b === true && (
                  <span className="absolute top-2 left-2 chip py-0.5 bg-bambu text-black font-medium">
                    <Check size={12} /> {t('mw.buildable')}
                  </span>
                )}
                {b === false && missing > 0 && (
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
                          className="relative inline-flex rounded-md"
                          style={{
                            width: 20,
                            height: 20,
                            background: c.color,
                            border: needsBorder(c.color) ? '1px solid #3a4347' : '1px solid rgba(0,0,0,0.25)'
                          }}
                        >
                          <span
                            className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
                            style={{ background: ok ? '#00ae42' : '#ff5c5c', width: 9, height: 9 }}
                          >
                            {ok ? <Check size={7} className="text-black" /> : <X size={7} className="text-white" />}
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

      {models.length > 0 && !loading && (
        <div className="flex justify-center pt-1">
          <button className="btn-ghost" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
            {t('mw.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}
