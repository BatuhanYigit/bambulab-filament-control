// Uygulama genelinde paylaşılan tip tanımları (main + renderer)

export interface TempProfile {
  nozzleMin: number
  nozzleMax: number
  bedMin: number
  bedMax: number
  /** Kapalı kabin (enclosure) gerektiriyor mu */
  enclosure?: boolean
  /** Kurutma önerisi, ör. "55°C / 8 saat" */
  drying?: string
  /** Soğutma fanı önerisi yüzdesi */
  fan?: string
}

export interface CatalogColor {
  name: string
  hex: string
  /** Üretici renk/ürün kodu varsa */
  code?: string
  /** İndirilmiş örnek görsel (resources/swatches altında) */
  image?: string
}

export interface CatalogMaterial {
  /** Tam ürün adı, ör. "PLA Basic" */
  material: string
  /** Genel tür: PLA / PETG / ABS / ASA / TPU / PA / PC / Support */
  type: string
  temp: TempProfile
  /** Genelde dolu net ağırlık (g) */
  defaultNetWeight: number
  colors: CatalogColor[]
}

export interface CatalogBrand {
  id: string
  brand: string
  /** "Global" | "Türkiye" */
  region: 'Global' | 'Türkiye'
  website?: string
  materials: CatalogMaterial[]
}

export interface Spool {
  id: string
  brand: string
  material: string
  type: string
  colorName: string
  colorHex: string
  /** Dolu net ağırlık (g) */
  netWeightG: number
  /** Kalan miktar (g) */
  remainingG: number
  /** Boş makara ağırlığı (g) — tartı ile ölçüm için */
  spoolWeightG?: number
  opened: boolean
  openedDate?: string
  /** AMS yuvası (varsa) */
  amsUnit?: number | null
  amsSlot?: number | null
  /** Bambu RFID etiket kimliği — AMS ile otomatik eşleştirme için */
  rfidUid?: string
  temp?: TempProfile
  notes?: string
  /** Kuru saklama / kullanım uyarısı */
  archived?: boolean
  createdAt: string
  updatedAt: string
}

export interface PrintLogEntry {
  id: string
  date: string
  taskName?: string
  spoolId?: string
  /** Kullanılan miktar (g) */
  grams: number
  source: 'manual' | 'ams' | 'studio' | 'cloud'
  note?: string
  /** Bambu Cloud görev kimliği — tekrar içe aktarmayı önlemek için */
  cloudId?: string
  /** Kullanılan filament özeti, ör. "PLA · #FF6A13" */
  detail?: string
  /** Yazıcı adı */
  device?: string
  /** Kapak görseli URL */
  imageUrl?: string
  /** Toplam tüketime sayılsın mı (iptal baskılar için false) */
  counted?: boolean
  /** Hangi spool'dan ne kadar düşüldü — silince iade için */
  deductions?: { spoolId: string; grams: number }[]
}

export interface CloudTask {
  id: string
  title: string
  grams: number
  date: string
  device?: string
  imageUrl?: string
  /** Bambu cloud ham durum kodu (resmi enum belgelenmemiş) */
  status?: number
  /** Baskı süresi (dk) */
  costTime?: number
  filaments: { type?: string; color?: string; grams?: number }[]
}

export interface CloudSettings {
  account: string
  token: string
  region: 'global' | 'china'
}

export interface PrinterSettings {
  ip: string
  serial: string
  accessCode: string
  autoConnect: boolean
  /** Bağlantı modu: yerel ağ (LAN) veya Bambu Cloud (her yerden) */
  mode?: 'lan' | 'cloud'
}

/** Bambu Cloud'a bağlı cihaz (yazıcı) */
export interface BoundDevice {
  serial: string
  name: string
  online: boolean
}

export interface AppSettings {
  printer: PrinterSettings
  studioPath?: string
  /** Düşük stok uyarı eşiği (g) */
  lowStockThreshold: number
  /** AMS'ten otomatik kalan miktar güncelleme */
  amsAutoSync: boolean
  /** AMS RFID etiketlerini kullan (yalnızca RFID'li Bambu makaralar) */
  rfidEnabled?: boolean
  /** Bambu Cloud (geçmiş baskılar için) */
  cloud?: CloudSettings
  /** Arayüz dili */
  lang?: 'tr' | 'en'
  /** İlk açılış turu tamamlandı/atlandı mı */
  tourDone?: boolean
}

export interface AmsTray {
  unit: number
  slot: number
  empty: boolean
  type?: string
  brand?: string
  colorHex?: string
  /** RFID kalan yüzde (-1 = bilinmiyor) */
  remainPercent?: number
  rfidUid?: string
  nozzleMin?: number
  nozzleMax?: number
  /** Eşleşen envanter spool id'si */
  matchedSpoolId?: string
}

export interface PrintStatus {
  /** gcode_state: IDLE | PREPARE | RUNNING | PAUSE | FINISH | FAILED */
  state?: string
  /** İlerleme yüzdesi 0-100 */
  percent?: number
  /** Kalan süre (dk) */
  remainingMin?: number
  layer?: number
  totalLayers?: number
  nozzleTemp?: number
  nozzleTarget?: number
  bedTemp?: number
  bedTarget?: number
  chamberTemp?: number
  /** Aktif baskı/görev adı */
  taskName?: string
  /** O an kullanılan AMS yuvası (global id) */
  activeTray?: number
  /** Hız seviyesi: 1 sessiz, 2 standart, 3 spor, 4 çılgın */
  speedLevel?: number
}

export interface AmsState {
  connected: boolean
  trays: AmsTray[]
  /** Canlı baskı durumu */
  print?: PrintStatus
  lastUpdate?: string
  error?: string
}

export interface DiscoveredPrinter {
  ip: string
  serial?: string
  model?: string
  name?: string
  signal?: string
  via: 'ssdp' | 'scan'
}

export interface StudioProfile {
  name: string
  vendor?: string
  type?: string
  nozzle?: number
  nozzleMin?: number
  nozzleMax?: number
  bed?: number
  source: 'system' | 'user'
}

export interface AppData {
  spools: Spool[]
  printLog: PrintLogEntry[]
  settings: AppSettings
  /** Kullanıcının eklediği özel katalog markaları */
  customCatalog: CatalogBrand[]
}
