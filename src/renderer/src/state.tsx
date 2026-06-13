import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type {
  AppData,
  CatalogBrand,
  AmsState,
  Spool,
  PrintLogEntry,
  AppSettings,
  CloudTask
} from '../../shared/types'

interface DataContextValue {
  loaded: boolean
  data: AppData
  catalog: CatalogBrand[]
  ams: AmsState
  addSpool: (s: Omit<Spool, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateSpool: (id: string, patch: Partial<Spool>) => void
  deleteSpool: (id: string) => void
  addPrintLog: (e: Omit<PrintLogEntry, 'id'>) => void
  updatePrintLog: (
    id: string,
    patch: { taskName?: string; counted: boolean; rows: { spoolId: string; grams: number }[] }
  ) => void
  deletePrintLog: (id: string) => void
  applyCloudImport: (rows: CloudImportRow[]) => number
  clearCloudLog: () => void
  importedCloudIds: Set<string>
  updateSettings: (patch: Partial<AppSettings>) => void
  addCustomBrand: (b: CatalogBrand) => void
  reloadCatalog: () => void
  tourOpen: boolean
  startTour: () => void
  endTour: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

const EMPTY: AppData = {
  spools: [],
  printLog: [],
  customCatalog: [],
  settings: {
    printer: { ip: '', serial: '', accessCode: '', autoConnect: false },
    studioPath: '',
    lowStockThreshold: 100,
    amsAutoSync: true,
    rfidEnabled: true
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export interface CloudImportItem {
  color?: string
  type?: string
  grams: number
  spoolId: string
}

export interface CloudImportRow {
  task: CloudTask
  include: boolean
  /** Baskıdaki her filament için ayrı düşüm (multi-color destekli) */
  items: CloudImportItem[]
}

/** Düşümleri uygula (refund=true ise iade et). */
function applyDeductions(
  spools: Spool[],
  deductions: { spoolId: string; grams: number }[],
  refund = false
): Spool[] {
  const byId = new Map<string, number>()
  for (const d of deductions) byId.set(d.spoolId, (byId.get(d.spoolId) ?? 0) + d.grams)
  const now = new Date().toISOString()
  return spools.map((s) => {
    const g = byId.get(s.id)
    if (!g) return s
    const next = refund
      ? Math.min(s.netWeightG, Math.round(s.remainingG + g))
      : Math.max(0, Math.round(s.remainingG - g))
    // kullanım olduysa otomatik "açık" işaretle
    const opened = refund ? s.opened : true
    return { ...s, remainingG: next, opened, updatedAt: now }
  })
}

function hexToRgb(hex?: string): [number, number, number] | null {
  if (!hex) return null
  const c = hex.replace('#', '')
  if (c.length < 6) return null
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}

function colorDistance(a?: string, b?: string): number {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  if (!ra || !rb) return Infinity
  return Math.sqrt((ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2 + (ra[2] - rb[2]) ** 2)
}

/** Bulut baskısındaki filamente en uygun spool'u tahmin et (tür + en yakın renk). */
export function bestSpoolMatch(
  filament: { type?: string; color?: string } | undefined,
  spools: Spool[]
): Spool | null {
  const active = spools.filter((s) => !s.archived && s.remainingG > 0)
  if (active.length === 0) return null
  let candidates = active
  if (filament?.type) {
    const sameType = active.filter((s) => s.type.toLowerCase() === filament.type!.toLowerCase())
    if (sameType.length) candidates = sameType
  }
  let best: Spool | null = null
  let bestDist = Infinity
  for (const s of candidates) {
    const d = colorDistance(s.colorHex, filament?.color)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  return best
}

export function DataProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [data, setData] = useState<AppData>(EMPTY)
  const [catalog, setCatalog] = useState<CatalogBrand[]>([])
  const [ams, setAms] = useState<AmsState>({ connected: false, trays: [] })
  const [loaded, setLoaded] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const skipSave = useRef(true)

  const reloadCatalog = useCallback(() => {
    window.api.getCatalog().then(setCatalog)
  }, [])

  // ilk yükleme
  useEffect(() => {
    ;(async () => {
      const d = await window.api.getData()
      setData({ ...EMPTY, ...d, settings: { ...EMPTY.settings, ...d.settings } })
      const cat = await window.api.getCatalog()
      setCatalog(cat)
      const st = await window.api.getPrinterState()
      setAms(st)
      setLoaded(true)
      if (!d.settings?.tourDone) setTourOpen(true)
    })()
    const off = window.api.onAmsState(setAms)
    return off
  }, [])

  // veri değişince main'e kaydet (ilk yüklemeyi atla)
  useEffect(() => {
    if (skipSave.current) {
      if (loaded) skipSave.current = false
      return
    }
    window.api.saveData(data)
  }, [data, loaded])

  // AMS otomatik senkron: rfid eşleşen spool'ların kalanını güncelle
  useEffect(() => {
    if (!loaded || !data.settings.amsAutoSync || !ams.connected) return
    if (data.settings.rfidEnabled === false) return
    setData((prev) => {
      let changed = false
      const spools = prev.spools.map((sp) => {
        if (!sp.rfidUid) return sp
        const tray = ams.trays.find((t) => t.rfidUid && t.rfidUid === sp.rfidUid)
        if (!tray || tray.remainPercent === undefined || tray.remainPercent < 0) return sp
        const newRemain = Math.round((sp.netWeightG * tray.remainPercent) / 100)
        if (Math.abs(newRemain - sp.remainingG) > 2) {
          changed = true
          return {
            ...sp,
            remainingG: newRemain,
            opened: sp.opened || newRemain < sp.netWeightG - 0.5,
            amsUnit: tray.unit,
            amsSlot: tray.slot,
            updatedAt: new Date().toISOString()
          }
        }
        return sp
      })
      return changed ? { ...prev, spools } : prev
    })
  }, [ams, loaded, data.settings.amsAutoSync])

  const addSpool: DataContextValue['addSpool'] = (s) => {
    const now = new Date().toISOString()
    // kısmen kullanılmış (kalan < dolu) eklenirse otomatik açık say
    const opened = s.opened || s.remainingG < s.netWeightG - 0.5
    setData((p) => ({ ...p, spools: [{ ...s, opened, id: uid(), createdAt: now, updatedAt: now }, ...p.spools] }))
  }

  const updateSpool: DataContextValue['updateSpool'] = (id, patch) => {
    setData((p) => ({
      ...p,
      spools: p.spools.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s))
    }))
  }

  const deleteSpool: DataContextValue['deleteSpool'] = (id) => {
    setData((p) => ({ ...p, spools: p.spools.filter((s) => s.id !== id) }))
  }

  const addPrintLog: DataContextValue['addPrintLog'] = (e) => {
    setData((p) => {
      const deductions = e.spoolId && e.grams > 0 ? [{ spoolId: e.spoolId, grams: e.grams }] : e.deductions
      const entry: PrintLogEntry = { ...e, id: uid(), counted: e.counted ?? true, deductions }
      let spools = p.spools
      if (deductions?.length) {
        spools = applyDeductions(p.spools, deductions)
      }
      return { ...p, printLog: [entry, ...p.printLog], spools }
    })
  }

  const updatePrintLog: DataContextValue['updatePrintLog'] = (id, { taskName, counted, rows }) => {
    setData((p) => {
      const entry = p.printLog.find((e) => e.id === id)
      if (!entry) return p
      // önce eski düşümleri iade et
      let spools = entry.deductions?.length ? applyDeductions(p.spools, entry.deductions, true) : p.spools
      const newDeductions = counted
        ? rows.filter((r) => r.spoolId && r.grams > 0).map((r) => ({ spoolId: r.spoolId, grams: Math.round(r.grams) }))
        : []
      if (newDeductions.length) spools = applyDeductions(spools, newDeductions)
      const grams = Math.round(rows.reduce((a, r) => a + (r.grams || 0), 0))
      const printLog = p.printLog.map((e) =>
        e.id === id
          ? {
              ...e,
              taskName: taskName ?? e.taskName,
              counted,
              grams,
              deductions: newDeductions.length ? newDeductions : undefined
            }
          : e
      )
      return { ...p, spools, printLog }
    })
  }

  const deletePrintLog: DataContextValue['deletePrintLog'] = (id) => {
    setData((p) => {
      const entry = p.printLog.find((e) => e.id === id)
      let spools = p.spools
      if (entry?.deductions?.length) {
        spools = applyDeductions(p.spools, entry.deductions, true) // iade
      }
      return { ...p, printLog: p.printLog.filter((e) => e.id !== id), spools }
    })
  }

  const applyCloudImport: DataContextValue['applyCloudImport'] = (rows) => {
    let added = 0
    setData((p) => {
      const existing = new Set(p.printLog.filter((e) => e.cloudId).map((e) => e.cloudId))
      const fresh: PrintLogEntry[] = []
      let spools = p.spools
      for (const r of rows) {
        const t = r.task
        if (existing.has(t.id)) continue
        added++
        const totalGrams = r.items.reduce((a, it) => a + (it.grams || 0), 0)
        const detail = r.items.length
          ? r.items.map((x) => [x.type, x.color].filter(Boolean).join(' ')).join(', ')
          : undefined
        const deductions = r.include
          ? r.items
              .filter((it) => it.spoolId && it.grams > 0)
              .map((it) => ({ spoolId: it.spoolId, grams: it.grams }))
          : []
        if (deductions.length) spools = applyDeductions(spools, deductions)
        fresh.push({
          id: uid(),
          cloudId: t.id,
          date: t.date,
          taskName: t.title,
          grams: totalGrams,
          source: 'cloud',
          counted: r.include,
          deductions: deductions.length ? deductions : undefined,
          detail,
          device: t.device,
          imageUrl: t.imageUrl
        })
      }
      if (fresh.length === 0) return p
      const printLog = [...fresh, ...p.printLog].sort((a, b) => +new Date(b.date) - +new Date(a.date))
      return { ...p, spools, printLog }
    })
    return added
  }

  const clearCloudLog: DataContextValue['clearCloudLog'] = () => {
    setData((p) => {
      const cloudEntries = p.printLog.filter((e) => e.source === 'cloud')
      const refunds = cloudEntries.flatMap((e) => e.deductions ?? [])
      const spools = refunds.length ? applyDeductions(p.spools, refunds, true) : p.spools
      return { ...p, spools, printLog: p.printLog.filter((e) => e.source !== 'cloud') }
    })
  }

  const updateSettings: DataContextValue['updateSettings'] = (patch) => {
    setData((p) => ({ ...p, settings: { ...p.settings, ...patch } }))
  }

  const addCustomBrand: DataContextValue['addCustomBrand'] = (b) => {
    setData((p) => ({ ...p, customCatalog: [...p.customCatalog, b] }))
    setTimeout(reloadCatalog, 50)
  }

  const startTour = (): void => setTourOpen(true)
  const endTour = (): void => {
    setTourOpen(false)
    setData((p) => ({ ...p, settings: { ...p.settings, tourDone: true } }))
  }

  const value: DataContextValue = {
    loaded,
    data,
    catalog,
    ams,
    addSpool,
    updateSpool,
    deleteSpool,
    addPrintLog,
    updatePrintLog,
    deletePrintLog,
    applyCloudImport,
    clearCloudLog,
    importedCloudIds: new Set(data.printLog.filter((e) => e.cloudId).map((e) => e.cloudId!)),
    updateSettings,
    addCustomBrand,
    reloadCatalog,
    tourOpen,
    startTour,
    endTour
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
