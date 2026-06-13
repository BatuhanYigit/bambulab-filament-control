import React, { useState } from 'react'
import { LayoutDashboard, Boxes, Palette, History, Settings as SettingsIcon, Wifi, WifiOff } from 'lucide-react'
import { useData } from './state'
import { useI18n } from './i18n'
import { Dashboard } from './pages/Dashboard'
import { Inventory } from './pages/Inventory'
import { Catalog } from './pages/Catalog'
import { PrintLog } from './pages/PrintLog'
import { Settings } from './pages/Settings'
import { Tour } from './components/Tour'

type Page = 'panel' | 'envanter' | 'katalog' | 'gecmis' | 'ayarlar'

const NAV: { id: Page; key: string; titleKey: string; icon: React.ElementType }[] = [
  { id: 'panel', key: 'nav.dashboard', titleKey: 'title.dashboard', icon: LayoutDashboard },
  { id: 'envanter', key: 'nav.inventory', titleKey: 'title.inventory', icon: Boxes },
  { id: 'katalog', key: 'nav.catalog', titleKey: 'title.catalog', icon: Palette },
  { id: 'gecmis', key: 'nav.history', titleKey: 'title.history', icon: History },
  { id: 'ayarlar', key: 'nav.settings', titleKey: 'title.settings', icon: SettingsIcon }
]

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<Page>('panel')
  const { ams, loaded, data, tourOpen, endTour } = useData()
  const { t } = useI18n()

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <span className="animate-pulse">{t('app.loading')}</span>
      </div>
    )
  }

  const currentTitle = NAV.find((n) => n.id === page)?.titleKey ?? 'title.dashboard'

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-ink-850/80 border-r border-ink-700/60 flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-bambu flex items-center justify-center font-bold text-black">B</div>
          <div>
            <div className="font-semibold text-sm leading-tight">{t('app.title')}</div>
            <div className="text-[11px] text-gray-500 leading-tight">{t('app.subtitle')}</div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = page === n.id
            return (
              <button
                key={n.id}
                data-tour={`nav-${n.id}`}
                onClick={() => setPage(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-bambu/15 text-bambu-light font-medium'
                    : 'text-gray-400 hover:bg-ink-700/50 hover:text-gray-200'
                }`}
              >
                <Icon size={18} />
                {t(n.key)}
              </button>
            )
          })}
        </nav>

        <div className="p-3 space-y-2">
          <div
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs ${
              ams.connected ? 'bg-bambu/10 text-bambu' : 'bg-ink-800 text-gray-500'
            }`}
          >
            {ams.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {ams.connected ? t('common.printerConnected') : t('common.printerNotConnected')}
          </div>
          <div className="text-center text-[10px] text-gray-600">{t('app.poweredBy')}</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-8 py-5 border-b border-ink-700/50 flex items-center justify-between">
          <h1 className="text-xl font-bold">{t(currentTitle)}</h1>
          <div className="text-xs text-gray-500">
            {data.spools.length} {t('common.spools')} ·{' '}
            {(data.spools.reduce((a, s) => a + s.remainingG, 0) / 1000).toFixed(2)} kg
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {page === 'panel' && <Dashboard />}
          {page === 'envanter' && <Inventory />}
          {page === 'katalog' && <Catalog />}
          {page === 'gecmis' && <PrintLog />}
          {page === 'ayarlar' && <Settings />}
        </div>
      </main>

      {tourOpen && <Tour onNavigate={(p) => setPage(p as Page)} onClose={endTour} />}
    </div>
  )
}
