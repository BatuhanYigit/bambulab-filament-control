import dgram from 'dgram'
import net from 'net'
import { networkInterfaces } from 'os'
import type { DiscoveredPrinter } from '../shared/types'

const SSDP_ADDR = '239.255.255.250'
const BAMBU_PORTS = [1990, 2021]
const PRINTER_TCP_PORT = 8883 // Bambu MQTT (TLS)

function parseSsdp(text: string): Partial<DiscoveredPrinter> {
  const out: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim().toLowerCase()
    const val = line.slice(idx + 1).trim()
    out[key] = val
  }
  return {
    ip: out['location'] || undefined,
    serial: out['usn'] || undefined,
    model: out['devmodel.bambu.com'] || undefined,
    name: out['devname.bambu.com'] || undefined,
    signal: out['devsignal.bambu.com'] || undefined
  }
}

/** SSDP üzerinden Bambu yazıcılarını dinle (Studio'nun yaptığı gibi) */
function ssdpDiscover(timeoutMs: number): Promise<DiscoveredPrinter[]> {
  return new Promise((resolve) => {
    const found = new Map<string, DiscoveredPrinter>()
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })

    const finish = (): void => {
      try {
        sock.close()
      } catch {
        /* yoksay */
      }
      resolve([...found.values()])
    }

    sock.on('error', () => finish())

    sock.on('message', (msg, rinfo) => {
      const text = msg.toString()
      if (!/bambu/i.test(text) && !/3dprinter/i.test(text)) return
      const p = parseSsdp(text)
      const ip = p.ip || rinfo.address
      if (!ip) return
      const existing = found.get(ip)
      found.set(ip, {
        ip,
        serial: p.serial || existing?.serial,
        model: p.model || existing?.model,
        name: p.name || existing?.name,
        signal: p.signal || existing?.signal,
        via: 'ssdp'
      })
    })

    sock.bind(2021, () => {
      try {
        sock.addMembership(SSDP_ADDR)
      } catch {
        /* bazı arayüzlerde üyelik eklenemeyebilir */
      }
      sock.setBroadcast(true)
      // aktif arama: yazıcıların hemen yanıt vermesini tetikle
      const msearch = Buffer.from(
        'M-SEARCH * HTTP/1.1\r\n' +
          `HOST: ${SSDP_ADDR}:1990\r\n` +
          'MAN: "ssdp:discover"\r\n' +
          'ST: urn:bambulab-com:device:3dprinter:1\r\n' +
          'MX: 3\r\n\r\n'
      )
      for (const port of BAMBU_PORTS) {
        try {
          sock.send(msearch, port, SSDP_ADDR)
        } catch {
          /* yoksay */
        }
      }
    })

    setTimeout(finish, timeoutMs)
  })
}

function localSubnets(): string[] {
  const prefixes = new Set<string>()
  const ifs = networkInterfaces()
  for (const name of Object.keys(ifs)) {
    for (const info of ifs[name] ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        const parts = info.address.split('.')
        if (parts.length === 4) prefixes.add(`${parts[0]}.${parts[1]}.${parts[2]}`)
      }
    }
  }
  return [...prefixes]
}

function probeTcp(ip: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let done = false
    const finish = (ok: boolean): void => {
      if (done) return
      done = true
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(port, ip)
  })
}

/** /24 alt ağı 8883 portu için tara (SSDP engelliyse yedek) */
async function portScan(timeoutMs: number): Promise<DiscoveredPrinter[]> {
  const subnets = localSubnets()
  if (subnets.length === 0) return []
  const results: DiscoveredPrinter[] = []
  const perHostTimeout = 500
  const deadline = Date.now() + timeoutMs

  for (const prefix of subnets) {
    const hosts: string[] = []
    for (let i = 1; i <= 254; i++) hosts.push(`${prefix}.${i}`)

    // 32'lik gruplar halinde paralel tara
    const batchSize = 32
    for (let i = 0; i < hosts.length; i += batchSize) {
      if (Date.now() > deadline) break
      const batch = hosts.slice(i, i + batchSize)
      const checks = await Promise.all(
        batch.map(async (ip) => ((await probeTcp(ip, PRINTER_TCP_PORT, perHostTimeout)) ? ip : null))
      )
      for (const ip of checks) {
        if (ip) results.push({ ip, via: 'scan' })
      }
    }
  }
  return results
}

export async function discoverPrinters(): Promise<DiscoveredPrinter[]> {
  const [ssdp, scan] = await Promise.all([ssdpDiscover(4000), portScan(6000)])

  const byIp = new Map<string, DiscoveredPrinter>()
  for (const p of ssdp) byIp.set(p.ip, p)
  for (const p of scan) {
    if (!byIp.has(p.ip)) byIp.set(p.ip, p)
  }
  // SSDP (seri no'lu) olanları başa al
  return [...byIp.values()].sort((a, b) => (a.via === 'ssdp' ? -1 : 1) - (b.via === 'ssdp' ? -1 : 1))
}
