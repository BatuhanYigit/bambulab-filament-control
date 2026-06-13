import React from 'react'
import {
  PackageOpen,
  AlertTriangle,
  Layers,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  Thermometer,
  Bed,
  Box,
  Clock,
  Gauge
} from 'lucide-react'
import { useData } from '../state'
import { useI18n } from '../i18n'
import { StatCard, ColorSwatch } from '../components/bits'
import { textColorFor, clampPct, barColor, isOpened, fmtGrams } from '../lib/ui'
import type { AmsTray, Spool } from '../../../shared/types'

function AmsSlotCard({
  tray,
  spool,
  active,
  rfidOn,
  t
}: {
  tray: AmsTray
  spool?: Spool
  active?: boolean
  rfidOn: boolean
  t: (k: string, p?: Record<string, string | number>) => string
}): React.JSX.Element {
  const hex = spool?.colorHex ?? tray.colorHex ?? '#2c3336'
  // Yüzde önceliği: envanterdeki eşleşen spool → yoksa (RFID açıksa) RFID'den gelen değer
  const invPct = spool ? clampPct(spool.remainingG, spool.netWeightG) : null
  const rfidPct = rfidOn && tray.remainPercent !== undefined && tray.remainPercent >= 0 ? tray.remainPercent : null
  const pct = invPct ?? rfidPct
  const label = spool ? `${spool.brand} ${spool.colorName}` : (tray.brand ?? tray.type)
  return (
    <div className={`card p-3 ${active ? 'ring-2 ring-bambu' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">
          {t('dash.slot')} {tray.slot + 1}
          {active && <span className="text-bambu"> ●</span>}
        </span>
        {tray.empty ? (
          <span className="text-xs text-gray-600">{t('dash.empty')}</span>
        ) : (
          <span className="text-xs text-gray-400">{spool?.type ?? tray.type}</span>
        )}
      </div>
      {tray.empty ? (
        <div className="h-16 rounded-xl border border-dashed border-ink-600 flex items-center justify-center text-gray-700 text-xs">
          —
        </div>
      ) : (
        <>
          <div
            className="h-16 rounded-xl flex items-center justify-center text-xs font-medium px-2 text-center"
            style={{ background: hex, color: textColorFor(hex) }}
          >
            {label}
          </div>
          {pct !== null && (
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-ink-900 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor(pct) }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                {spool ? <span>{fmtGrams(spool.remainingG)}</span> : <span />}
                <span>%{Math.round(pct)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function fmtMin(min: number, lang: string): string {
  if (min <= 0) return '0' + (lang === 'tr' ? 'dk' : 'm')
  const h = Math.floor(min / 60)
  const m = min % 60
  if (lang === 'tr') return h > 0 ? `${h}sa ${m}dk` : `${m}dk`
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function Dashboard(): React.JSX.Element {
  const { data, ams } = useData()
  const { t, lang } = useI18n()
  const spools = data.spools.filter((s) => !s.archived)

  const totalRemaining = spools.reduce((a, s) => a + s.remainingG, 0)
  const opened = spools.filter((s) => isOpened(s)).length
  const low = spools.filter((s) => s.remainingG <= data.settings.lowStockThreshold)

  // AMS yuvalarını 0-3 olarak göster (unit 0)
  const unit0 = ams.trays.filter((t) => t.unit === 0).sort((a, b) => a.slot - b.slot)
  const slots: AmsTray[] = []
  for (let i = 0; i < 4; i++) {
    slots.push(unit0.find((t) => t.slot === i) ?? { unit: 0, slot: i, empty: true })
  }

  // AMS yuvasını envanterdeki spool ile eşle: RFID → AMS yuva ataması → renk+tür yakınlığı
  const hexRgb = (h?: string): [number, number, number] | null => {
    if (!h) return null
    const c = h.replace('#', '')
    if (c.length < 6) return null
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
  }
  const colorDist = (a?: string, b?: string): number => {
    const x = hexRgb(a)
    const y = hexRgb(b)
    if (!x || !y) return Infinity
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
  }
  const rfidOn = data.settings.rfidEnabled !== false
  const matchSpool = (tr: AmsTray): Spool | undefined => {
    if (tr.empty) return undefined
    if (rfidOn && tr.rfidUid) {
      const s = spools.find((sp) => sp.rfidUid === tr.rfidUid)
      if (s) return s
    }
    const slot = spools.find((sp) => sp.amsUnit === tr.unit && sp.amsSlot === tr.slot)
    if (slot) return slot
    if (tr.type && tr.colorHex) {
      const cand = spools.filter((sp) => sp.type.toLowerCase() === tr.type!.toLowerCase())
      let best: Spool | undefined
      let bd = 60 // renk eşik (RGB mesafesi)
      for (const sp of cand) {
        const d = colorDist(sp.colorHex, tr.colorHex)
        if (d < bd) {
          bd = d
          best = sp
        }
      }
      return best
    }
    return undefined
  }

  const ps = ams.print
  const activeTray = ps?.activeTray
  const isActive = (tr: AmsTray): boolean => activeTray !== undefined && tr.unit * 4 + tr.slot === activeTray
  const activeTrayObj = ams.trays.find(isActive)
  const printing = ps?.state === 'RUNNING' || ps?.state === 'PAUSE' || ps?.state === 'PREPARE'
  const stateLabel = ps?.state ? t(`state.${ps.state}`) : ''

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label={t('dash.totalSpools')} value={spools.length} sub={`${opened} ${t('dash.opened')}`} />
        <StatCard
          label={t('dash.totalRemaining')}
          value={`${(totalRemaining / 1000).toFixed(2)} kg`}
          accent="#1ed368"
          sub={`${Math.round(totalRemaining)} g`}
        />
        <StatCard
          label={t('dash.lowStock')}
          value={low.length}
          accent={low.length ? '#ff9f1c' : undefined}
          sub={`≤ ${data.settings.lowStockThreshold} g`}
        />
        <StatCard label={t('dash.brands')} value={new Set(spools.map((s) => s.brand)).size} sub={t('dash.types')} />
      </div>

      {/* Live print */}
      {ams.connected && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className={printing ? 'text-bambu' : 'text-gray-500'} />
              <h2 className="font-semibold">{t('dash.livePrint')}</h2>
            </div>
            {stateLabel && (
              <span
                className={`chip ${
                  ps?.state === 'RUNNING'
                    ? 'text-bambu'
                    : ps?.state === 'PAUSE'
                      ? 'text-accent-amber'
                      : ps?.state === 'FAILED'
                        ? 'text-accent-red'
                        : 'text-gray-400'
                }`}
              >
                {stateLabel}
              </span>
            )}
          </div>

          {!printing ? (
            <p className="text-sm text-gray-500">{t('dash.idleMsg')}</p>
          ) : (
            <div className="space-y-4">
              {ps?.taskName && <div className="text-sm text-gray-200 truncate font-medium">{ps.taskName}</div>}

              {/* Progress */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-bold text-bambu">{ps?.percent ?? 0}%</span>
                  <span className="text-xs text-gray-500">
                    {ps?.layer != null && ps?.totalLayers != null
                      ? `${t('dash.layer')} ${ps.layer}/${ps.totalLayers}`
                      : ''}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-ink-900 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-bambu transition-all duration-700"
                    style={{ width: `${ps?.percent ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="chip justify-center py-1.5">
                  <Clock size={14} className="text-accent-blue" />
                  {ps?.remainingMin != null ? fmtMin(ps.remainingMin, lang) : '—'}
                </div>
                <div className="chip justify-center py-1.5">
                  <Thermometer size={14} className="text-accent-amber" />
                  {Math.round(ps?.nozzleTemp ?? 0)}°
                  <span className="text-gray-600">/{Math.round(ps?.nozzleTarget ?? 0)}°</span>
                </div>
                <div className="chip justify-center py-1.5">
                  <Bed size={14} className="text-accent-blue" />
                  {Math.round(ps?.bedTemp ?? 0)}°<span className="text-gray-600">/{Math.round(ps?.bedTarget ?? 0)}°</span>
                </div>
                {ps?.chamberTemp != null && ps.chamberTemp > 0 ? (
                  <div className="chip justify-center py-1.5">
                    <Box size={14} className="text-gray-400" />
                    {Math.round(ps.chamberTemp)}°
                  </div>
                ) : ps?.speedLevel ? (
                  <div className="chip justify-center py-1.5">
                    <Gauge size={14} className="text-gray-400" />
                    {t(`speed.${ps.speedLevel}`)}
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {/* Active filament */}
              {activeTrayObj &&
                (() => {
                  const sp = matchSpool(activeTrayObj)
                  return (
                    <div className="flex items-center gap-3 pt-1 border-t border-ink-700/50">
                      <span className="text-xs text-gray-500">{t('dash.activeFilament')}:</span>
                      <ColorSwatch hex={sp?.colorHex ?? activeTrayObj.colorHex ?? '#2c3336'} size={24} ring />
                      <span className="text-sm text-gray-200">
                        {sp ? `${sp.brand} ${sp.colorName}` : (activeTrayObj.brand ?? activeTrayObj.type)}
                        <span className="text-gray-500">
                          {' '}
                          · {t('dash.slot')} {activeTrayObj.slot + 1}
                        </span>
                      </span>
                    </div>
                  )
                })()}
            </div>
          )}
        </div>
      )}

      {/* AMS */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-bambu" />
            <h2 className="font-semibold">{t('dash.amsLive')}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {ams.connected ? (
              <span className="flex items-center gap-1.5 text-bambu">
                <Wifi size={14} /> {t('common.connected')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-500">
                <WifiOff size={14} /> {t('common.notConnected')}
              </span>
            )}
            {ams.connected && (
              <button className="text-gray-500 hover:text-gray-300" onClick={() => window.api.refreshPrinter()}>
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
        {!ams.connected && <p className="text-sm text-gray-500 mb-4">{t('dash.amsHint')}</p>}
        <div className="grid grid-cols-4 gap-3">
          {slots.map((tray) => (
            <AmsSlotCard
              key={tray.slot}
              tray={tray}
              spool={matchSpool(tray)}
              active={isActive(tray)}
              rfidOn={rfidOn}
              t={t}
            />
          ))}
        </div>
        {ams.error && <p className="text-xs text-accent-red mt-3">{ams.error}</p>}
      </div>

      {/* Düşük stok */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-accent-amber" />
          <h2 className="font-semibold">{t('dash.lowStockAlerts')}</h2>
        </div>
        {low.length === 0 ? (
          <p className="text-sm text-gray-500">{t('dash.allGood')}</p>
        ) : (
          <div className="space-y-2">
            {low.map((s) => {
              const pct = clampPct(s.remainingG, s.netWeightG)
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <ColorSwatch hex={s.colorHex} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      {s.brand} {s.material} · <span className="text-gray-400">{s.colorName}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-ink-900 mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor(pct) }} />
                    </div>
                  </div>
                  <span className="text-sm font-medium" style={{ color: barColor(pct) }}>
                    {Math.round(s.remainingG)} g
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
