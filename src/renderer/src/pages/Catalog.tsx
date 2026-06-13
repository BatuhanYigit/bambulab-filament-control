import React, { useMemo, useState } from 'react'
import { Search, Plus, Globe, MapPin, Check } from 'lucide-react'
import { useData } from '../state'
import { TempBadges, SwatchLabel } from '../components/bits'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n'
import { needsBorder } from '../lib/ui'
import type { CatalogColor, CatalogMaterial } from '../../../shared/types'

export function Catalog(): React.JSX.Element {
  const { catalog, addSpool } = useData()
  const { notify } = useToast()
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [region, setRegion] = useState<'Hepsi' | 'Global' | 'Türkiye'>('Hepsi')
  const [added, setAdded] = useState<string | null>(null)

  const brands = useMemo(
    () => catalog.filter((b) => region === 'Hepsi' || b.region === region),
    [catalog, region]
  )

  const quickAdd = (brand: string, m: CatalogMaterial, col: CatalogColor): void => {
    addSpool({
      brand,
      material: m.material,
      type: m.type,
      colorName: col.name,
      colorHex: col.hex,
      netWeightG: m.defaultNetWeight,
      remainingG: m.defaultNetWeight,
      opened: false,
      temp: m.temp,
      amsUnit: null,
      amsSlot: null
    })
    const key = brand + m.material + col.name
    setAdded(key)
    setTimeout(() => setAdded((k) => (k === key ? null : k)), 1200)
    notify(t('cat.added', { brand, material: m.material, color: col.name }), col.hex)
  }

  const matchesQuery = (brandName: string, m: CatalogMaterial): boolean => {
    if (!q) return true
    const t = q.toLowerCase()
    return (
      brandName.toLowerCase().includes(t) ||
      m.material.toLowerCase().includes(t) ||
      m.type.toLowerCase().includes(t) ||
      m.colors.some((c) => c.name.toLowerCase().includes(t))
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input className="input pl-9" placeholder={t('cat.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-ink-800 rounded-xl p-1">
          {(['Hepsi', 'Global', 'Türkiye'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                region === r ? 'bg-bambu text-black' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {r === 'Hepsi' ? t('common.all') : r}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">{t('cat.clickHint')}</p>

      {brands.map((brand) => (
        <div key={brand.id} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-lg">{brand.brand}</h2>
            <span className="chip">
              {brand.region === 'Türkiye' ? <MapPin size={12} /> : <Globe size={12} />}
              {brand.region}
            </span>
          </div>

          <div className="space-y-5">
            {brand.materials
              .filter((m) => matchesQuery(brand.brand, m))
              .map((m) => (
                <div key={m.material} className="border-t border-ink-700/50 pt-4 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="font-medium text-sm">
                      {m.material} <span className="text-gray-600">· {m.type}</span>
                    </div>
                    <TempBadges temp={m.temp} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.colors.map((col) => {
                      const key = brand.brand + m.material + col.name
                      const isAdded = added === key
                      return (
                        <button
                          key={col.name + col.hex}
                          onClick={() => quickAdd(brand.brand, m, col)}
                          className={`group relative rounded-lg transition-transform hover:scale-110 hover:z-20 ${
                            isAdded ? 'animate-pop' : ''
                          }`}
                          style={{
                            width: 32,
                            height: 32,
                            background: col.hex,
                            border: needsBorder(col.hex) ? '1px solid #3a4347' : '1px solid rgba(0,0,0,0.25)'
                          }}
                        >
                          <SwatchLabel name={col.name} hex={col.hex} />
                          {isAdded ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                              <Check size={16} className="text-bambu-light" />
                            </span>
                          ) : (
                            <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded-lg">
                              <Plus size={14} className="text-white" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
