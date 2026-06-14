import { BrowserWindow } from 'electron'
import type { MwModel, MwColor } from '../shared/types'

// MakerWorld'ün resmi public API'si yok; web uygulamasının kullandığı uçlar
// Bambu hesabı token'ı (Bearer) ile çalışır. Arama renk içermez; renkler model
// detayındaki baskı profili filamentlerinden (instanceFilaments) gelir.
const BASE = 'https://makerworld.com/api/v1'

function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
}

export interface MwSearchResult {
  ok: boolean
  models?: MwModel[]
  total?: number
  expired?: boolean
  error?: string
}

/** Anahtar kelime (q) ile ara; yoksa navKey ile gözat (Trending vb.). */
export async function mwSearch(
  token: string,
  opts: { q?: string; navKey?: string; offset?: number; limit?: number }
): Promise<MwSearchResult> {
  const offset = opts.offset ?? 0
  const limit = opts.limit ?? 24
  const q = opts.q?.trim()
  const url = q
    ? `${BASE}/search-service/select/design?q=${encodeURIComponent(q)}&offset=${offset}&limit=${limit}`
    : `${BASE}/search-service/select/design/nav?navKey=${encodeURIComponent(opts.navKey || 'Trending')}&offset=${offset}&limit=${limit}`
  try {
    const res = await fetch(url, { headers: headers(token) })
    if (res.status === 401 || res.status === 403) return { ok: false, expired: true, error: 'Oturum süresi doldu.' }
    if (!res.ok) return { ok: false, error: `MakerWorld erişilemedi (${res.status}).` }
    const data: any = await res.json()
    const hits: any[] = Array.isArray(data?.hits) ? data.hits : []
    const models: MwModel[] = hits.map((h) => ({
      id: Number(h.id),
      title: String(h.title ?? ''),
      cover: String(h.cover ?? h.coverPortrait ?? ''),
      creator: String(h.designCreator?.name ?? ''),
      likes: Number(h.likeCount ?? 0),
      downloads: Number(h.downloadCount ?? 0),
      url: `https://makerworld.com/en/models/${h.id}`,
      printable: h.is_printable !== false
    }))
    return { ok: true, models, total: Number(data?.total ?? models.length) }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Anahtar kelime araması: MakerWorld'ün arama API'si dışarıdan çalışmadığı için
 * gizli bir gerçek tarayıcı penceresinde arama sayfasını yükleyip sonuç modellerini
 * DOM'dan toplar. Sonra renkler detay API'sinden çekilip envanterle eşleştirilir.
 */
export function mwSearchBrowser(keyword: string): Promise<MwSearchResult> {
  const term = keyword.trim()
  if (!term) return Promise.resolve({ ok: true, models: [] })
  return new Promise((resolve) => {
    let done = false
    const win = new BrowserWindow({
      show: false,
      width: 1366,
      height: 1000,
      webPreferences: { offscreen: false, sandbox: true, javascript: true }
    })
    const finish = (r: MwSearchResult): void => {
      if (done) return
      done = true
      try {
        win.destroy()
      } catch {
        /* yoksay */
      }
      resolve(r)
    }
    win.webContents.setUserAgent(CHROME_UA)

    const scrape = `(() => {
      const out = new Map();
      document.querySelectorAll('a[href*="/models/"]').forEach((a) => {
        const m = (a.getAttribute('href') || '').match(/\\/models\\/(\\d+)/);
        if (!m) return;
        const id = m[1];
        if (out.has(id)) return;
        const img = a.querySelector('img');
        const title = (a.getAttribute('aria-label') || (img && img.getAttribute('alt')) || a.textContent || '').trim();
        out.set(id, { id, title, cover: img ? img.src : '' });
      });
      return JSON.stringify([...out.values()].slice(0, 40));
    })()`

    win.webContents.on('did-finish-load', async () => {
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1200))
        if (done) return
        try {
          const json = await win.webContents.executeJavaScript(scrape, true)
          const arr: any[] = JSON.parse(json)
          if (arr.length > 0) {
            const models: MwModel[] = arr.map((x) => ({
              id: Number(x.id),
              title: x.title || `Model ${x.id}`,
              cover: x.cover || '',
              creator: '',
              likes: 0,
              downloads: 0,
              url: `https://makerworld.com/en/models/${x.id}`,
              printable: true
            }))
            finish({ ok: true, models })
            return
          }
        } catch {
          /* sayfa henüz hazır değil */
        }
      }
      finish({ ok: false, error: 'Arama sonucu yüklenemedi.' })
    })

    win.loadURL(`https://makerworld.com/en/models/search?keyword=${encodeURIComponent(term)}`).catch((e) =>
      finish({ ok: false, error: String(e?.message ?? e) })
    )
    setTimeout(() => finish({ ok: false, error: 'Arama zaman aşımına uğradı.' }), 28000)
  })
}

/** Bir modelin varsayılan profilindeki gerekli renkleri (hex) çek. */
export async function mwColors(token: string, id: number): Promise<{ ok: boolean; colors?: MwColor[]; error?: string }> {
  try {
    const res = await fetch(`${BASE}/design-service/design/${id}`, { headers: headers(token) })
    if (!res.ok) return { ok: false, error: `(${res.status})` }
    const det: any = await res.json()
    const instances: any[] = Array.isArray(det?.instances) ? det.instances : []
    const def = instances.find((i) => i.id === det.defaultInstanceId) ?? instances[0]
    const fils: any[] = Array.isArray(def?.instanceFilaments) ? def.instanceFilaments : []
    const seen = new Set<string>()
    const colors: MwColor[] = []
    for (const f of fils) {
      const c = String(f.color ?? '').toUpperCase()
      if (!c || seen.has(c)) continue
      seen.add(c)
      colors.push({ color: c, type: f.type ? String(f.type) : undefined })
    }
    return { ok: true, colors }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}
