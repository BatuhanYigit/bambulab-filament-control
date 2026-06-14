import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { loadData, saveData, getDataFilePath } from './store'
import { readStudioProfiles, findStudioPath } from './studio'
import { connectPrinter, connectCloud, disconnectPrinter, getAmsState, onAmsState, refreshPrinter } from './printer'
import { discoverPrinters } from './discover'
import { cloudLogin, cloudLoginCode, cloudTasks, cloudUid, cloudDevices } from './cloud'
import { mwSearch, mwColors, mwSearchBrowser } from './makerworld'
import { SEED_CATALOG } from '../shared/catalog'
import type { AppData, PrinterSettings } from '../shared/types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 680,
    show: false,
    backgroundColor: '#0d0f10',
    autoHideMenuBar: true,
    title: 'Bambu Filament Control',
    // In dev, point the taskbar/window icon at the generated PNG (packaged builds use the embedded exe icon)
    icon: app.isPackaged ? undefined : join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// AMS durumunu renderer'a aktif olarak ilet (pencere yıkıldıysa gönderme — kapanışta crash olmasın)
onAmsState((state) => {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('ams:state', state)
  }
})

function registerIpc(): void {
  ipcMain.handle('data:get', () => loadData())

  ipcMain.handle('data:save', (_e, data: AppData) => {
    saveData(data)
    return true
  })

  ipcMain.handle('catalog:get', () => {
    const data = loadData()
    return [...SEED_CATALOG, ...(data.customCatalog ?? [])]
  })

  ipcMain.handle('studio:getProfiles', (_e, path?: string) => {
    return readStudioProfiles(path)
  })

  ipcMain.handle('studio:autoPath', () => findStudioPath())

  ipcMain.handle('studio:pickPath', async () => {
    if (!mainWindow) return null
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Bambu Studio klasörünü seç',
      properties: ['openDirectory']
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('printer:scan', () => discoverPrinters())
  ipcMain.handle('printer:connect', (_e, settings: PrinterSettings) => connectPrinter(settings))

  // Bambu Cloud üzerinden bağlan (herhangi bir ağdan; LAN gerekmez)
  ipcMain.handle('printer:connectCloud', async (_e, serial: string) => {
    const { cloud } = loadData().settings
    if (!cloud?.token) return { ok: false, error: 'Önce Bambu Cloud girişi yapın' }
    if (!serial) return { ok: false, error: 'Yazıcı seçilmedi' }
    const uidRes = await cloudUid(cloud.token, cloud.region)
    if (!uidRes.ok || !uidRes.uid) return { ok: false, error: uidRes.error ?? 'Kullanıcı kimliği alınamadı' }
    return connectCloud({ serial, uid: uidRes.uid, token: cloud.token, region: cloud.region })
  })

  // Bambu Cloud'a bağlı yazıcıları listele
  ipcMain.handle('printer:cloudDevices', () => {
    const { cloud } = loadData().settings
    if (!cloud?.token) return { ok: false, error: 'Önce Bambu Cloud girişi yapın' }
    return cloudDevices(cloud.token, cloud.region)
  })
  ipcMain.handle('printer:disconnect', () => {
    disconnectPrinter()
    return true
  })
  ipcMain.handle('printer:state', () => getAmsState())
  ipcMain.handle('printer:refresh', () => {
    refreshPrinter()
    return true
  })

  ipcMain.handle('cloud:login', (_e, account: string, password: string, region: 'global' | 'china') =>
    cloudLogin(account, password, region)
  )
  ipcMain.handle('cloud:loginCode', (_e, account: string, code: string, region: 'global' | 'china') =>
    cloudLoginCode(account, code, region)
  )
  ipcMain.handle('cloud:tasks', (_e, token: string, region: 'global' | 'china') => cloudTasks(token, region))

  // MakerWorld (renk uyumlu proje bulucu) — stored cloud token kullanır
  ipcMain.handle('mw:search', (_e, opts: { q?: string; navKey?: string; offset?: number; limit?: number }) => {
    const { cloud } = loadData().settings
    if (!cloud?.token) return { ok: false, error: 'Önce Bambu Cloud girişi yapın' }
    return mwSearch(cloud.token, opts)
  })
  ipcMain.handle('mw:colors', (_e, id: number) => {
    const { cloud } = loadData().settings
    if (!cloud?.token) return { ok: false, error: 'Önce Bambu Cloud girişi yapın' }
    return mwColors(cloud.token, id)
  })
  ipcMain.handle('mw:searchBrowser', (_e, keyword: string) => mwSearchBrowser(keyword))

  ipcMain.handle('app:openDataFolder', () => {
    shell.showItemInFolder(getDataFilePath())
    return true
  })
}

// --- Screenshot mode (npm run shots): captures each page to docs/screenshots ---
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const SHOT_PAGES: [string, string][] = [
  ['nav-panel', 'dashboard'],
  ['nav-envanter', 'inventory'],
  ['nav-katalog', 'catalog'],
  ['nav-gecmis', 'history'],
  ['nav-ayarlar', 'settings']
]
const REMOVE_TOUR = `document.querySelector('[data-tour-overlay]')?.remove(); true`
const REDACT = `(function(){
  document.querySelectorAll('.__redact').forEach(e=>e.remove());
  document.querySelectorAll('[data-redact]').forEach(el=>{
    const r=el.getBoundingClientRect(); if(r.width<2) return;
    const d=document.createElement('div'); d.className='__redact';
    d.style.cssText='position:fixed;z-index:99999;background:#070809;border-radius:8px;top:'+r.top+'px;left:'+r.left+'px;width:'+r.width+'px;height:'+r.height+'px';
    document.body.appendChild(d);
  }); return true })()`

async function captureScreens(win: BrowserWindow): Promise<void> {
  const dir = join(__dirname, '../../docs/screenshots')
  mkdirSync(dir, { recursive: true })
  await win.webContents.executeJavaScript(REMOVE_TOUR).catch(() => {})
  await delay(500)
  for (const [navId, name] of SHOT_PAGES) {
    await win.webContents
      .executeJavaScript(`(function(){const b=document.querySelector('[data-tour="${navId}"]'); if(b) b.click(); return !!b})()`)
      .catch(() => {})
    await delay(900)
    await win.webContents.executeJavaScript(REMOVE_TOUR).catch(() => {})
    if (name === 'settings') {
      await win.webContents.executeJavaScript(REDACT).catch(() => {})
      await delay(250)
    }
    const img = await win.webContents.capturePage()
    writeFileSync(join(dir, `${name}.png`), img.toPNG())
    console.log('captured', name)
  }
  app.quit()
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  if (process.env.SHOTS && mainWindow) {
    mainWindow.webContents.once('did-finish-load', async () => {
      await delay(1600)
      if (mainWindow) await captureScreens(mainWindow)
    })
  }

  // ayarlarda otomatik bağlan açıksa yazıcıya bağlan (LAN veya Cloud)
  const data = loadData()
  const pr = data.settings.printer
  if (pr.autoConnect) {
    if (pr.mode === 'cloud' && data.settings.cloud?.token && pr.serial) {
      cloudUid(data.settings.cloud.token, data.settings.cloud.region).then((u) => {
        if (u.ok && u.uid) connectCloud({ serial: pr.serial, uid: u.uid, token: data.settings.cloud!.token, region: data.settings.cloud!.region })
      })
    } else if (pr.ip) {
      connectPrinter(pr)
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  disconnectPrinter()
  if (process.platform !== 'darwin') app.quit()
})
