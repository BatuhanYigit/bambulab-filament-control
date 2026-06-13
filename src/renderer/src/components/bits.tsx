import React from 'react'
import { Thermometer, Bed, Wind, Box, Droplets } from 'lucide-react'
import type { TempProfile } from '../../../shared/types'
import { needsBorder, clampPct, barColor, fmtGrams } from '../lib/ui'
import { useI18n } from '../i18n'

/** Renk örneğinin üstüne gelince ad + hex gösteren açılır etiket.
 *  Kapsayıcı butonun `group relative` sınıfına sahip olması gerekir. */
export function SwatchLabel({ name, hex }: { name: string; hex: string }): React.JSX.Element {
  return (
    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 hidden group-hover:block whitespace-nowrap">
      <span className="flex items-center gap-1.5 rounded-md bg-ink-900 border border-ink-600 px-2 py-1 text-[11px] text-gray-100 shadow-xl">
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ background: hex, border: '1px solid rgba(255,255,255,0.2)' }}
        />
        {name}
        <span className="text-gray-500">{hex.toUpperCase()}</span>
      </span>
    </span>
  )
}

export function ColorSwatch({
  hex,
  size = 36,
  ring
}: {
  hex: string
  size?: number
  ring?: boolean
}): React.JSX.Element {
  return (
    <span
      className="inline-block rounded-lg shadow-inner shrink-0"
      style={{
        width: size,
        height: size,
        background: hex,
        border: needsBorder(hex) ? '1px solid #3a4347' : '1px solid rgba(0,0,0,0.25)',
        boxShadow: ring ? '0 0 0 2px #00ae42' : undefined
      }}
    />
  )
}

export function RemainingBar({
  remaining,
  net
}: {
  remaining: number
  net: number
}): React.JSX.Element {
  const pct = clampPct(remaining, net)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-semibold text-gray-100">{fmtGrams(remaining)}</span>
        <span className="text-xs text-gray-500">/ {fmtGrams(net)} · {Math.round(pct)}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-ink-900 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor(pct) }}
        />
      </div>
    </div>
  )
}

export function TempBadges({ temp }: { temp?: TempProfile }): React.JSX.Element | null {
  const { t } = useI18n()
  if (!temp) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="chip">
        <Thermometer size={13} className="text-accent-amber" />
        {temp.nozzleMin}–{temp.nozzleMax}°C
      </span>
      <span className="chip">
        <Bed size={13} className="text-accent-blue" />
        {temp.bedMin}–{temp.bedMax}°C
      </span>
      {temp.fan && (
        <span className="chip">
          <Wind size={13} className="text-gray-400" />
          {temp.fan}
        </span>
      )}
      {temp.enclosure && (
        <span className="chip text-accent-amber">
          <Box size={13} />
          {t('temp.enclosure')}
        </span>
      )}
      {temp.drying && (
        <span className="chip">
          <Droplets size={13} className="text-accent-blue" />
          {temp.drying}
        </span>
      )}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  accent
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}): React.JSX.Element {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: accent ?? '#e9edec' }}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}
