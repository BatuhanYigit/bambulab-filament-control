import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { StudioProfile } from '../shared/types'

export type { StudioProfile }

/** Bambu Studio yapılandırma klasörünü otomatik bul (Windows / mac / linux) */
export function findStudioPath(): string | null {
  const candidates: string[] = []
  const appData = process.env.APPDATA
  if (appData) {
    candidates.push(join(appData, 'BambuStudio'))
    candidates.push(join(appData, 'OrcaSlicer'))
  }
  // mac
  candidates.push(join(homedir(), 'Library', 'Application Support', 'BambuStudio'))
  candidates.push(join(homedir(), 'Library', 'Application Support', 'OrcaSlicer'))
  // linux
  candidates.push(join(homedir(), '.config', 'BambuStudio'))
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

function walkJsonFiles(dir: string, out: string[], depth = 0): void {
  if (depth > 6 || !existsSync(dir)) return
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const e of entries) {
    const full = join(dir, e)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walkJsonFiles(full, out, depth + 1)
    else if (e.toLowerCase().endsWith('.json')) out.push(full)
  }
}

function firstNum(v: unknown): number | undefined {
  if (Array.isArray(v)) v = v[0]
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function firstStr(v: unknown): string | undefined {
  if (Array.isArray(v)) v = v[0]
  if (typeof v === 'string' && v.length) return v
  return undefined
}

/**
 * Tüm filament profillerini okur. Bambu profilleri seyrek olup `inherits` ile
 * üst profilden değer devralır; bu yüzden tüm dosyaları isim->ham eşlemesine
 * alıp inherits zincirini çözeriz.
 */
export function readStudioProfiles(studioPath?: string): StudioProfile[] {
  const base = studioPath && existsSync(studioPath) ? studioPath : findStudioPath()
  if (!base) return []

  const rawByName = new Map<string, any>()
  const sourceByName = new Map<string, 'system' | 'user'>()

  const scan = (dir: string, source: 'system' | 'user') => {
    const files: string[] = []
    walkJsonFiles(dir, files)
    for (const f of files) {
      // sadece filament klasörlerini dikkate al
      if (!f.toLowerCase().includes('filament')) continue
      try {
        const obj = JSON.parse(readFileSync(f, 'utf-8'))
        const name = firstStr(obj.name)
        if (!name) continue
        if (!rawByName.has(name)) {
          rawByName.set(name, obj)
          sourceByName.set(name, source)
        }
      } catch {
        /* bozuk json atla */
      }
    }
  }

  scan(join(base, 'system'), 'system')
  scan(join(base, 'user'), 'user')

  const resolveField = (name: string, pick: (o: any) => unknown, seen = new Set<string>()): unknown => {
    if (seen.has(name)) return undefined
    seen.add(name)
    const obj = rawByName.get(name)
    if (!obj) return undefined
    const val = pick(obj)
    if (val !== undefined && val !== null && !(Array.isArray(val) && val.length === 0) && val !== '') {
      if (Array.isArray(val) && val[0] === '') {
        // boş override, parent'a bak
      } else {
        return val
      }
    }
    const parent = firstStr(obj.inherits)
    if (parent) return resolveField(parent, pick, seen)
    return undefined
  }

  const result: StudioProfile[] = []
  for (const [name] of rawByName) {
    const type = firstStr(resolveField(name, (o) => o.filament_type))
    const vendor = firstStr(resolveField(name, (o) => o.filament_vendor))
    const nozzle = firstNum(resolveField(name, (o) => o.nozzle_temperature))
    const nozzleMin = firstNum(resolveField(name, (o) => o.nozzle_temperature_range_low))
    const nozzleMax = firstNum(resolveField(name, (o) => o.nozzle_temperature_range_high))
    const bed =
      firstNum(resolveField(name, (o) => o.hot_plate_temp)) ??
      firstNum(resolveField(name, (o) => o.textured_plate_temp)) ??
      firstNum(resolveField(name, (o) => o.cool_plate_temp)) ??
      firstNum(resolveField(name, (o) => o.eng_plate_temp))

    // sadece sıcaklık bilgisi olan anlamlı profilleri tut
    if (nozzle === undefined && nozzleMin === undefined && bed === undefined) continue

    result.push({
      name,
      vendor,
      type,
      nozzle,
      nozzleMin,
      nozzleMax,
      bed,
      source: sourceByName.get(name) ?? 'system'
    })
  }

  result.sort((a, b) => a.name.localeCompare(b.name))
  return result
}
