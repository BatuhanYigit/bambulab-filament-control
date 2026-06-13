import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import type { AmsState, AmsTray, PrinterSettings } from '../shared/types'

type Listener = (state: AmsState) => void

let client: MqttClient | null = null
let listener: Listener | null = null
let lastState: AmsState = { connected: false, trays: [] }
let currentSettings: PrinterSettings | null = null

export function onAmsState(cb: Listener): void {
  listener = cb
}

function emit(patch: Partial<AmsState>): void {
  lastState = { ...lastState, ...patch, lastUpdate: new Date().toISOString() }
  listener?.(lastState)
}

export function getAmsState(): AmsState {
  return lastState
}

/** Bambu tray_color "FF6A13FF" (RGBA hex) -> "#FF6A13" */
function trayColorToHex(raw?: string): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined
  const clean = raw.replace('#', '')
  if (clean.length < 6) return undefined
  return '#' + clean.slice(0, 6).toUpperCase()
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function parseReport(payload: any): void {
  const print = payload?.print
  if (!print) return

  // --- Canlı baskı durumu (kısmi mesajlarda birikir) ---
  const prev = lastState.print ?? {}
  const ps = { ...prev }
  let printChanged = false
  const set = <K extends keyof typeof ps>(key: K, val: (typeof ps)[K] | undefined): void => {
    if (val !== undefined && val !== ps[key]) {
      ps[key] = val
      printChanged = true
    }
  }
  if (typeof print.gcode_state === 'string') set('state', print.gcode_state)
  set('percent', num(print.mc_percent))
  set('remainingMin', num(print.mc_remaining_time))
  set('layer', num(print.layer_num))
  set('totalLayers', num(print.total_layer_num))
  set('nozzleTemp', num(print.nozzle_temper))
  set('nozzleTarget', num(print.nozzle_target_temper))
  set('bedTemp', num(print.bed_temper))
  set('bedTarget', num(print.bed_target_temper))
  set('chamberTemp', num(print.chamber_temper))
  set('speedLevel', num(print.spd_lvl))
  if (typeof print.subtask_name === 'string' && print.subtask_name) set('taskName', print.subtask_name)
  else if (typeof print.gcode_file === 'string' && print.gcode_file) set('taskName', print.gcode_file)
  if (print.ams && print.ams.tray_now !== undefined) {
    const at = num(print.ams.tray_now)
    // 254/255 = harici makara / yok
    set('activeTray', at !== undefined && at < 250 ? at : undefined)
  }
  if (printChanged) emit({ print: ps, connected: true })

  // AMS bilgisi sadece bazı mesajlarda gelir; yoksa mevcut durumu koru
  const amsRoot = print.ams
  if (amsRoot && Array.isArray(amsRoot.ams)) {
    const trays: AmsTray[] = []
    for (const unit of amsRoot.ams) {
      const unitId = Number(unit.id ?? 0)
      const slots = Array.isArray(unit.tray) ? unit.tray : []
      for (const t of slots) {
        const slotId = Number(t.id ?? 0)
        const type = typeof t.tray_type === 'string' && t.tray_type.length ? t.tray_type : undefined
        const empty = !type
        const remainRaw = Number(t.remain)
        trays.push({
          unit: unitId,
          slot: slotId,
          empty,
          type,
          brand: typeof t.tray_sub_brands === 'string' && t.tray_sub_brands.length ? t.tray_sub_brands : undefined,
          colorHex: trayColorToHex(t.tray_color),
          remainPercent: Number.isFinite(remainRaw) ? remainRaw : -1,
          rfidUid: typeof t.tag_uid === 'string' && /[^0]/.test(t.tag_uid) ? t.tag_uid : undefined,
          nozzleMin: t.nozzle_temp_min ? Number(t.nozzle_temp_min) : undefined,
          nozzleMax: t.nozzle_temp_max ? Number(t.nozzle_temp_max) : undefined
        })
      }
    }
    if (trays.length) emit({ trays, connected: true, error: undefined })
  }
}

export function connectPrinter(settings: PrinterSettings): Promise<{ ok: boolean; error?: string }> {
  currentSettings = settings
  return new Promise((resolve) => {
    if (!settings.ip || !settings.accessCode || !settings.serial) {
      resolve({ ok: false, error: 'IP, seri no ve access code gerekli' })
      return
    }
    disconnectPrinter()

    const url = `mqtts://${settings.ip}:8883`
    let settled = false

    try {
      client = mqtt.connect(url, {
        username: 'bblp',
        password: settings.accessCode,
        reconnectPeriod: 5000,
        connectTimeout: 8000,
        rejectUnauthorized: false,
        protocol: 'mqtts'
      })
    } catch (e: any) {
      resolve({ ok: false, error: String(e?.message ?? e) })
      return
    }

    const reportTopic = `device/${settings.serial}/report`
    const requestTopic = `device/${settings.serial}/request`

    client.on('connect', () => {
      client?.subscribe(reportTopic, () => {
        // tam durumu çek
        client?.publish(requestTopic, JSON.stringify({ pushing: { sequence_id: '0', command: 'pushall' } }))
      })
      emit({ connected: true, error: undefined })
      if (!settled) {
        settled = true
        resolve({ ok: true })
      }
    })

    client.on('message', (_topic, message) => {
      try {
        parseReport(JSON.parse(message.toString()))
      } catch {
        /* parse hatası yoksay */
      }
    })

    client.on('error', (err) => {
      emit({ connected: false, error: String(err?.message ?? err) })
      if (!settled) {
        settled = true
        resolve({ ok: false, error: String(err?.message ?? err) })
      }
    })

    client.on('close', () => {
      emit({ connected: false })
    })

    // güvenlik zaman aşımı
    setTimeout(() => {
      if (!settled) {
        settled = true
        resolve({ ok: false, error: 'Bağlantı zaman aşımına uğradı' })
      }
    }, 9000)
  })
}

export function disconnectPrinter(): void {
  if (client) {
    try {
      client.end(true)
    } catch {
      /* yoksay */
    }
    client = null
  }
  emit({ connected: false, trays: lastState.trays })
}

export function refreshPrinter(): void {
  if (client && currentSettings) {
    client.publish(
      `device/${currentSettings.serial}/request`,
      JSON.stringify({ pushing: { sequence_id: '0', command: 'pushall' } })
    )
  }
}
