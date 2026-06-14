import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppData,
  CatalogBrand,
  AmsState,
  PrinterSettings,
  StudioProfile,
  DiscoveredPrinter,
  CloudTask,
  BoundDevice
} from '../shared/types'

interface LoginResult {
  ok: boolean
  token?: string
  needCode?: boolean
  needTfa?: boolean
  error?: string
}
interface TasksResult {
  ok: boolean
  tasks?: CloudTask[]
  expired?: boolean
  error?: string
}

const api = {
  getData: (): Promise<AppData> => ipcRenderer.invoke('data:get'),
  saveData: (data: AppData): Promise<boolean> => ipcRenderer.invoke('data:save', data),
  getCatalog: (): Promise<CatalogBrand[]> => ipcRenderer.invoke('catalog:get'),

  getStudioProfiles: (path?: string): Promise<StudioProfile[]> =>
    ipcRenderer.invoke('studio:getProfiles', path),
  getStudioAutoPath: (): Promise<string | null> => ipcRenderer.invoke('studio:autoPath'),
  pickStudioPath: (): Promise<string | null> => ipcRenderer.invoke('studio:pickPath'),

  scanPrinters: (): Promise<DiscoveredPrinter[]> => ipcRenderer.invoke('printer:scan'),
  connectPrinter: (settings: PrinterSettings): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('printer:connect', settings),
  connectCloud: (serial: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('printer:connectCloud', serial),
  cloudDevices: (): Promise<{ ok: boolean; devices?: BoundDevice[]; expired?: boolean; error?: string }> =>
    ipcRenderer.invoke('printer:cloudDevices'),
  disconnectPrinter: (): Promise<boolean> => ipcRenderer.invoke('printer:disconnect'),
  getPrinterState: (): Promise<AmsState> => ipcRenderer.invoke('printer:state'),
  refreshPrinter: (): Promise<boolean> => ipcRenderer.invoke('printer:refresh'),

  cloudLogin: (account: string, password: string, region: 'global' | 'china'): Promise<LoginResult> =>
    ipcRenderer.invoke('cloud:login', account, password, region),
  cloudLoginCode: (account: string, code: string, region: 'global' | 'china'): Promise<LoginResult> =>
    ipcRenderer.invoke('cloud:loginCode', account, code, region),
  cloudTasks: (token: string, region: 'global' | 'china'): Promise<TasksResult> =>
    ipcRenderer.invoke('cloud:tasks', token, region),

  openDataFolder: (): Promise<boolean> => ipcRenderer.invoke('app:openDataFolder'),

  onAmsState: (cb: (state: AmsState) => void): (() => void) => {
    const handler = (_e: unknown, state: AmsState): void => cb(state)
    ipcRenderer.on('ams:state', handler)
    return () => ipcRenderer.removeListener('ams:state', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
