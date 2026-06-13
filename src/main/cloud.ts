import type { CloudTask } from '../shared/types'

type Region = 'global' | 'china'

function base(region: Region): string {
  return region === 'china' ? 'https://api.bambulab.cn' : 'https://api.bambulab.com'
}

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': 'bambu-filament-control/0.1'
}

export interface LoginResult {
  ok: boolean
  token?: string
  /** E-postaya/uygulamaya doğrulama kodu gönderildi, kod ile tekrar dene */
  needCode?: boolean
  /** Kod, authenticator (TFA) uygulamasından alınmalı */
  needTfa?: boolean
  error?: string
}

/** Adım 1: e-posta + şifre ile giriş. MFA varsa kod istenir. */
export async function cloudLogin(account: string, password: string, region: Region): Promise<LoginResult> {
  try {
    const res = await fetch(`${base(region)}/v1/user-service/user/login`, {
      method: 'POST',
      headers: COMMON_HEADERS,
      body: JSON.stringify({ account, password })
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return { ok: false, error: `Giriş başarısız (${res.status}). ${txt.slice(0, 200)}` }
    }
    const data: any = await res.json()
    if (data.accessToken) return { ok: true, token: data.accessToken }
    if (data.loginType === 'verifyCode') return { ok: false, needCode: true }
    if (data.loginType === 'tfa' || data.tfaKey) return { ok: false, needTfa: true }
    return { ok: false, error: 'Beklenmeyen yanıt. Bölge (global/çin) doğru mu?' }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}

/** Adım 2: doğrulama kodu ile giriş (e-posta kodu veya authenticator kodu). */
export async function cloudLoginCode(account: string, code: string, region: Region): Promise<LoginResult> {
  try {
    const res = await fetch(`${base(region)}/v1/user-service/user/login`, {
      method: 'POST',
      headers: COMMON_HEADERS,
      body: JSON.stringify({ account, code })
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return { ok: false, error: `Kod doğrulanamadı (${res.status}). ${txt.slice(0, 200)}` }
    }
    const data: any = await res.json()
    if (data.accessToken) return { ok: true, token: data.accessToken }
    return { ok: false, error: 'Kod kabul edilmedi.' }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}

export interface TasksResult {
  ok: boolean
  tasks?: CloudTask[]
  /** Token süresi dolmuş, tekrar giriş gerekli */
  expired?: boolean
  error?: string
}

/** Geçmiş baskı görevlerini (gram + filament) çek. */
export async function cloudTasks(token: string, region: Region, limit = 50): Promise<TasksResult> {
  try {
    const res = await fetch(`${base(region)}/v1/user-service/my/tasks?limit=${limit}`, {
      headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` }
    })
    if (res.status === 401 || res.status === 403) return { ok: false, expired: true, error: 'Oturum süresi doldu.' }
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return { ok: false, error: `Baskılar alınamadı (${res.status}). ${txt.slice(0, 200)}` }
    }
    const data: any = await res.json()
    const hits: any[] = Array.isArray(data?.hits) ? data.hits : []
    const tasks: CloudTask[] = hits.map((h) => {
      const filaments = Array.isArray(h.amsDetailMapping)
        ? h.amsDetailMapping.map((m: any) => ({
            type: m.filamentType,
            color: m.sourceColor ? `#${String(m.sourceColor).replace('#', '').slice(0, 6).toUpperCase()}` : undefined,
            grams: typeof m.weight === 'number' ? m.weight : undefined
          }))
        : []
      return {
        id: String(h.id ?? h.designId ?? Math.random()),
        title: h.designTitle || h.title || 'Baskı',
        grams: typeof h.weight === 'number' ? h.weight : 0,
        date: h.startTime || h.endTime || new Date().toISOString(),
        device: h.deviceName,
        imageUrl: h.cover,
        status: typeof h.status === 'number' ? h.status : undefined,
        costTime: typeof h.costTime === 'number' ? Math.round(h.costTime / 60) : undefined,
        filaments
      }
    })
    return { ok: true, tasks }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}
