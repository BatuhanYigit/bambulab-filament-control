// Küçük UI yardımcıları

/** Arka plan rengine göre okunaklı metin rengi (siyah/beyaz) */
export function textColorFor(hex?: string): string {
  if (!hex) return '#000'
  const c = hex.replace('#', '')
  if (c.length < 6) return '#000'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#0d0f10' : '#ffffff'
}

/** Beyaza yakın renkler için kenarlık gerekiyor mu */
export function needsBorder(hex?: string): boolean {
  if (!hex) return true
  const c = hex.replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return r > 235 && g > 235 && b > 235
}

export function fmtGrams(g: number): string {
  return `${Math.round(g)} g`
}

export function clampPct(remaining: number, net: number): number {
  if (net <= 0) return 0
  return Math.max(0, Math.min(100, (remaining / net) * 100))
}

/** Kalan yüzdeye göre renk */
export function barColor(pct: number): string {
  if (pct <= 10) return '#ff5c5c'
  if (pct <= 25) return '#ff9f1c'
  return '#00ae42'
}

export function classNames(...xs: (string | false | undefined | null)[]): string {
  return xs.filter(Boolean).join(' ')
}

/**
 * Is the spool opened? Driven by the `opened` flag, which is set automatically
 * whenever filament is deducted (manual use, cloud import, AMS sync) and can be
 * toggled manually (open / re-seal). See state.applyDeductions and addSpool.
 */
export function isOpened(s: { opened?: boolean }): boolean {
  return !!s.opened
}
