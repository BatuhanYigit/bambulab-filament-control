import React, { useEffect, useState } from 'react'
import {
  Wifi,
  WifiOff,
  FolderOpen,
  FolderSearch,
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  Radar,
  Printer,
  Cloud,
  LogOut,
  Languages,
  GraduationCap
} from 'lucide-react'
import { useData } from '../state'
import { useI18n, type Lang } from '../i18n'
import type { StudioProfile, DiscoveredPrinter } from '../../../shared/types'

export function Settings(): React.JSX.Element {
  const { data, ams, updateSettings, startTour } = useData()
  const { t, lang, setLang } = useI18n()
  const { printer } = data.settings

  const [ip, setIp] = useState(printer.ip)
  const [serial, setSerial] = useState(printer.serial)
  const [code, setCode] = useState(printer.accessCode)
  const [connecting, setConnecting] = useState(false)
  const [connResult, setConnResult] = useState<{ ok: boolean; error?: string } | null>(null)

  const [discovering, setDiscovering] = useState(false)
  const [found, setFound] = useState<DiscoveredPrinter[] | null>(null)

  const cloud = data.settings.cloud
  const [cAccount, setCAccount] = useState(cloud?.account ?? '')
  const [cPassword, setCPassword] = useState('')
  const [cCode, setCCode] = useState('')
  const [cRegion, setCRegion] = useState<'global' | 'china'>(cloud?.region ?? 'global')
  const [cBusy, setCBusy] = useState(false)
  const [cNeedCode, setCNeedCode] = useState(false)
  const [cMsg, setCMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [studioPath, setStudioPath] = useState(data.settings.studioPath ?? '')
  const [profiles, setProfiles] = useState<StudioProfile[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [profQ, setProfQ] = useState('')

  useEffect(() => {
    if (!studioPath) {
      window.api.getStudioAutoPath().then((p) => {
        if (p) {
          setStudioPath(p)
          updateSettings({ studioPath: p })
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveAndConnect = async (): Promise<void> => {
    const settings = { ip: ip.trim(), serial: serial.trim(), accessCode: code.trim(), autoConnect: printer.autoConnect }
    updateSettings({ printer: settings })
    setConnecting(true)
    setConnResult(null)
    const res = await window.api.connectPrinter(settings)
    setConnResult(res)
    setConnecting(false)
  }

  const disconnect = async (): Promise<void> => {
    await window.api.disconnectPrinter()
    setConnResult(null)
  }

  const scanNetwork = async (): Promise<void> => {
    setDiscovering(true)
    setFound(null)
    const res = await window.api.scanPrinters()
    setFound(res)
    setDiscovering(false)
  }

  const useFound = (p: DiscoveredPrinter): void => {
    setIp(p.ip)
    if (p.serial) setSerial(p.serial)
    setFound(null)
  }

  const doCloudLogin = async (): Promise<void> => {
    setCBusy(true)
    setCMsg(null)
    const res = await window.api.cloudLogin(cAccount.trim(), cPassword, cRegion)
    setCBusy(false)
    if (res.ok && res.token) {
      updateSettings({ cloud: { account: cAccount.trim(), token: res.token, region: cRegion } })
      setCPassword('')
      setCNeedCode(false)
      setCMsg({ ok: true, text: t('set.loginOk') })
    } else if (res.needCode) {
      setCNeedCode(true)
      setCMsg({ ok: true, text: t('set.codeSent') })
    } else if (res.needTfa) {
      setCNeedCode(true)
      setCMsg({ ok: true, text: t('set.tfaPrompt') })
    } else {
      setCMsg({ ok: false, text: res.error ?? t('set.loginFail') })
    }
  }

  const doCloudCode = async (): Promise<void> => {
    setCBusy(true)
    setCMsg(null)
    const res = await window.api.cloudLoginCode(cAccount.trim(), cCode.trim(), cRegion)
    setCBusy(false)
    if (res.ok && res.token) {
      updateSettings({ cloud: { account: cAccount.trim(), token: res.token, region: cRegion } })
      setCNeedCode(false)
      setCCode('')
      setCMsg({ ok: true, text: t('set.loginOk') })
    } else {
      setCMsg({ ok: false, text: res.error ?? t('set.codeFail') })
    }
  }

  const cloudLogout = (): void => {
    updateSettings({ cloud: undefined })
    setCMsg(null)
    setCNeedCode(false)
  }

  const scanProfiles = async (): Promise<void> => {
    setScanning(true)
    const res = await window.api.getStudioProfiles(studioPath || undefined)
    setProfiles(res)
    setScanning(false)
  }

  const pickPath = async (): Promise<void> => {
    const p = await window.api.pickStudioPath()
    if (p) {
      setStudioPath(p)
      updateSettings({ studioPath: p })
    }
  }

  const filteredProfiles = (profiles ?? []).filter((p) =>
    !profQ ? true : `${p.name} ${p.vendor ?? ''} ${p.type ?? ''}`.toLowerCase().includes(profQ.toLowerCase())
  )

  return (
    <div className="max-w-3xl space-y-6">
      {/* Printer */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            {ams.connected ? <Wifi size={18} className="text-bambu" /> : <WifiOff size={18} className="text-gray-500" />}
            {t('set.printerTitle')}
          </h2>
          <span className={`text-xs ${ams.connected ? 'text-bambu' : 'text-gray-500'}`}>
            {ams.connected ? t('common.connected') : t('common.notConnected')}
          </span>
        </div>

        {/* Network scanner */}
        <div className="mb-4 rounded-xl border border-ink-700/60 bg-ink-900/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Radar size={16} className="text-bambu" />
              {t('set.scanTitle')}
            </div>
            <button className="btn-primary py-1.5" onClick={scanNetwork} disabled={discovering}>
              {discovering ? <Loader2 size={15} className="animate-spin" /> : <Radar size={15} />}
              {discovering ? t('set.scanning') : t('set.scan')}
            </button>
          </div>

          {discovering && <p className="text-xs text-gray-500 mt-2">{t('set.scanInfo')}</p>}

          {found && (
            <div className="mt-3 space-y-1.5">
              {found.length === 0 ? (
                <p className="text-xs text-gray-500">{t('set.noPrinter')}</p>
              ) : (
                found.map((p) => (
                  <button
                    key={p.ip}
                    onClick={() => useFound(p)}
                    className="w-full flex items-center gap-3 rounded-lg bg-ink-800 hover:bg-ink-700 px-3 py-2 text-left transition-colors"
                  >
                    <Printer size={16} className="text-bambu shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-100">
                        {p.ip}
                        {p.model && <span className="text-gray-500"> · {p.model}</span>}
                      </div>
                      {(p.serial || p.name) && (
                        <div className="text-xs text-gray-500 truncate">
                          {p.name ? `${p.name} · ` : ''}
                          {p.serial ?? ''}
                        </div>
                      )}
                    </div>
                    <span className="chip py-0.5 shrink-0">{p.via === 'ssdp' ? 'Bambu' : 'port 8883'}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('set.ip')}</label>
            <input
              data-redact
              className="input"
              placeholder="192.168.1.50"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('set.serial')}</label>
            <input
              data-redact
              className="input"
              placeholder="01P00A..."
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">{t('set.accessCode')}</label>
          <input data-redact className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          <p className="text-xs text-gray-500 mt-1.5">{t('set.accessHint')}</p>
        </div>

        <label className="flex items-center gap-2 mt-4 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="accent-bambu w-4 h-4"
            checked={printer.autoConnect}
            onChange={(e) => updateSettings({ printer: { ...printer, autoConnect: e.target.checked } })}
          />
          {t('set.autoConnect')}
        </label>

        <label className="flex items-center gap-2 mt-4 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="accent-bambu w-4 h-4"
            checked={data.settings.rfidEnabled !== false}
            onChange={(e) => updateSettings({ rfidEnabled: e.target.checked })}
          />
          {t('set.rfidEnabled')}
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">{t('set.rfidHint')}</p>

        <label
          className={`flex items-center gap-2 mt-2 text-sm cursor-pointer ${
            data.settings.rfidEnabled === false ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300'
          }`}
        >
          <input
            type="checkbox"
            className="accent-bambu w-4 h-4"
            disabled={data.settings.rfidEnabled === false}
            checked={data.settings.amsAutoSync && data.settings.rfidEnabled !== false}
            onChange={(e) => updateSettings({ amsAutoSync: e.target.checked })}
          />
          {t('set.amsAutoSync')}
        </label>

        <div className="flex items-center gap-2 mt-4">
          <button className="btn-primary" onClick={saveAndConnect} disabled={connecting}>
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
            {t('set.saveConnect')}
          </button>
          {ams.connected && (
            <button className="btn-ghost" onClick={disconnect}>
              {t('set.disconnect')}
            </button>
          )}
          {connResult && (
            <span className={`text-sm flex items-center gap-1.5 ${connResult.ok ? 'text-bambu' : 'text-accent-red'}`}>
              {connResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {connResult.ok ? t('set.connectedOk') : connResult.error}
            </span>
          )}
        </div>
      </div>

      {/* Bambu Cloud */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Cloud size={18} className="text-accent-blue" />
            {t('set.cloudTitle')}
          </h2>
          {cloud?.token && (
            <span className="text-xs text-bambu" data-redact>
              {t('set.loggedInAs')} · {cloud.account}
            </span>
          )}
        </div>

        {cloud?.token ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{t('set.cloudBound')}</p>
            <button className="btn-ghost" onClick={cloudLogout}>
              <LogOut size={15} /> {t('set.logout')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">{t('set.cloudIntro')}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('set.email')}</label>
                <input data-redact className="input" value={cAccount} onChange={(e) => setCAccount(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('set.password')}</label>
                <input
                  type="password"
                  className="input"
                  value={cPassword}
                  onChange={(e) => setCPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doCloudLogin()}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <label className="text-xs text-gray-400">{t('set.region')}:</label>
              <div className="flex gap-1 bg-ink-800 rounded-xl p-1">
                {(['global', 'china'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setCRegion(r)}
                    className={`px-3 py-1 rounded-lg text-xs ${
                      cRegion === r ? 'bg-bambu text-black' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {r === 'global' ? t('set.regionGlobal') : t('set.regionChina')}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button className="btn-primary" onClick={doCloudLogin} disabled={cBusy || !cAccount || !cPassword}>
                {cBusy ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                {t('set.login')}
              </button>
            </div>

            {cNeedCode && (
              <div className="flex items-end gap-3 mt-3">
                <div className="flex-1">
                  <label className="label">{t('set.verifyCode')}</label>
                  <input
                    className="input"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doCloudCode()}
                  />
                </div>
                <button className="btn-primary" onClick={doCloudCode} disabled={cBusy || !cCode}>
                  {t('set.verify')}
                </button>
              </div>
            )}
          </>
        )}

        {cMsg && (
          <p className={`text-sm mt-3 flex items-center gap-1.5 ${cMsg.ok ? 'text-bambu' : 'text-accent-red'}`}>
            {cMsg.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {cMsg.text}
          </p>
        )}
      </div>

      {/* Bambu Studio */}
      <div className="card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Database size={18} className="text-accent-blue" />
          {t('set.studioTitle')}
        </h2>
        <label className="label">{t('set.studioFolder')}</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={studioPath}
            onChange={(e) => setStudioPath(e.target.value)}
            placeholder="%APPDATA%\BambuStudio"
          />
          <button className="btn-ghost" onClick={pickPath}>
            <FolderOpen size={16} /> {t('set.pick')}
          </button>
          <button className="btn-primary" onClick={scanProfiles} disabled={scanning}>
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <FolderSearch size={16} />}
            {t('set.scan')}
          </button>
        </div>

        {profiles && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{t('set.profilesFound', { n: profiles.length })}</span>
              <input
                className="input w-48 py-1.5"
                placeholder={t('set.searchProfiles')}
                value={profQ}
                onChange={(e) => setProfQ(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-ink-700/50 divide-y divide-ink-700/40">
              {filteredProfiles.slice(0, 300).map((p) => (
                <div key={p.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.type && <span className="chip py-0.5">{p.type}</span>}
                  <span className="text-xs text-gray-500 w-28 text-right">
                    {p.nozzleMin && p.nozzleMax ? `${p.nozzleMin}–${p.nozzleMax}°C` : p.nozzle ? `${p.nozzle}°C` : '—'}
                    {p.bed ? ` · ${p.bed}°` : ''}
                  </span>
                </div>
              ))}
              {filteredProfiles.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-600">{t('set.noProfileMatch')}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* General */}
      <div className="card p-5">
        <h2 className="font-semibold mb-4">{t('set.general')}</h2>

        <div className="flex items-center gap-3 mb-4">
          <label className="label mb-0 flex items-center gap-1.5">
            <Languages size={14} /> {t('set.language')}
          </label>
          <div className="flex gap-1 bg-ink-800 rounded-xl p-1">
            {(['tr', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  lang === l ? 'bg-bambu text-black' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {l === 'tr' ? 'Türkçe' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="label mb-0">{t('set.lowStockThreshold')}</label>
          <input
            type="number"
            className="input w-28"
            value={data.settings.lowStockThreshold}
            onChange={(e) => updateSettings({ lowStockThreshold: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button className="btn-ghost" onClick={() => window.api.openDataFolder()}>
            <FolderOpen size={16} /> {t('set.openDataFolder')}
          </button>
          <button className="btn-ghost" onClick={startTour}>
            <GraduationCap size={16} /> {t('tour.replay')}
          </button>
        </div>
      </div>
    </div>
  )
}
