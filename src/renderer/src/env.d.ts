/// <reference types="vite/client" />
import type {
  AppData,
  CatalogBrand,
  AmsState,
  PrinterSettings,
  StudioProfile,
  DiscoveredPrinter,
  CloudTask,
  BoundDevice
} from '../../shared/types'

interface CloudLoginResult {
  ok: boolean
  token?: string
  needCode?: boolean
  needTfa?: boolean
  error?: string
}
interface CloudTasksResult {
  ok: boolean
  tasks?: CloudTask[]
  expired?: boolean
  error?: string
}

export interface RendererApi {
  getData: () => Promise<AppData>
  saveData: (data: AppData) => Promise<boolean>
  getCatalog: () => Promise<CatalogBrand[]>
  getStudioProfiles: (path?: string) => Promise<StudioProfile[]>
  getStudioAutoPath: () => Promise<string | null>
  pickStudioPath: () => Promise<string | null>
  scanPrinters: () => Promise<DiscoveredPrinter[]>
  connectPrinter: (settings: PrinterSettings) => Promise<{ ok: boolean; error?: string }>
  connectCloud: (serial: string) => Promise<{ ok: boolean; error?: string }>
  cloudDevices: () => Promise<{ ok: boolean; devices?: BoundDevice[]; expired?: boolean; error?: string }>

  disconnectPrinter: () => Promise<boolean>
  getPrinterState: () => Promise<AmsState>
  refreshPrinter: () => Promise<boolean>
  cloudLogin: (account: string, password: string, region: 'global' | 'china') => Promise<CloudLoginResult>
  cloudLoginCode: (account: string, code: string, region: 'global' | 'china') => Promise<CloudLoginResult>
  cloudTasks: (token: string, region: 'global' | 'china') => Promise<CloudTasksResult>
  openDataFolder: () => Promise<boolean>
  onAmsState: (cb: (state: AmsState) => void) => () => void
}

declare global {
  interface Window {
    api: RendererApi
  }
}

export {}
