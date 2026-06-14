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
