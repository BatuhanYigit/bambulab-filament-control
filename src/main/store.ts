import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import type { AppData } from '../shared/types'

const DATA_FILE = join(app.getPath('userData'), 'filament-data.json')

const DEFAULT_DATA: AppData = {
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

let cache: AppData | null = null

export function loadData(): AppData {
  if (cache) return cache
  try {
    if (existsSync(DATA_FILE)) {
      const raw = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
      cache = { ...DEFAULT_DATA, ...raw, settings: { ...DEFAULT_DATA.settings, ...(raw.settings ?? {}) } }
    } else {
      cache = structuredClone(DEFAULT_DATA)
    }
  } catch (e) {
    console.error('Veri okunamadı, varsayılana dönülüyor:', e)
    cache = structuredClone(DEFAULT_DATA)
  }
  return cache!
}

export function saveData(data: AppData): void {
  cache = data
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true })
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Veri yazılamadı:', e)
  }
}

export function getDataFilePath(): string {
  return DATA_FILE
}
