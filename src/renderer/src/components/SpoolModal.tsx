import React, { useMemo, useState, useEffect } from 'react'
import { Modal } from './Modal'
import { ColorSwatch } from './bits'
import { needsBorder } from '../lib/ui'
import { useData } from '../state'
import { useI18n } from '../i18n'
import type { Spool, TempProfile } from '../../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Spool | null
}

const CUSTOM = '__custom__'

export function SpoolModal({ open, onClose, editing }: Props): React.JSX.Element {
  const { catalog, addSpool, updateSpool, data } = useData()
  const { t } = useI18n()
  const rfidOn = data.settings.rfidEnabled !== false

  const [brand, setBrand] = useState('')
  const [material, setMaterial] = useState('')
  const [type, setType] = useState('PLA')
  const [colorName, setColorName] = useState('')
  const [colorHex, setColorHex] = useState('#00ae42')
  const [netWeight, setNetWeight] = useState(1000)
  const [remaining, setRemaining] = useState(1000)
  const [opened, setOpened] = useState(false)
  const [rfid, setRfid] = useState('')
  const [notes, setNotes] = useState('')
  const [temp, setTemp] = useState<TempProfile | undefined>(undefined)

  const isCustomBrand = brand === CUSTOM
  const isCustomColor = colorName === CUSTOM

  useEffect(() => {
    if (!open) return
    if (editing) {
      setBrand(editing.brand)
      setMaterial(editing.material)
      setType(editing.type)
      setColorName(editing.colorName)
      setColorHex(editing.colorHex)
      setNetWeight(editing.netWeightG)
      setRemaining(editing.remainingG)
      setOpened(editing.opened)
      setRfid(editing.rfidUid ?? '')
      setNotes(editing.notes ?? '')
      setTemp(editing.temp)
    } else {
      const b = catalog[0]
      setBrand(b?.brand ?? '')
      const m = b?.materials[0]
      setMaterial(m?.material ?? '')
      setType(m?.type ?? 'PLA')
      setNetWeight(m?.defaultNetWeight ?? 1000)
      setRemaining(m?.defaultNetWeight ?? 1000)
      setTemp(m?.temp)
      const col = m?.colors[0]
      setColorName(col?.name ?? '')
      setColorHex(col?.hex ?? '#00ae42')
      setOpened(false)
      setRfid('')
      setNotes('')
    }
  }, [open, editing, catalog])

  const brandObj = useMemo(() => catalog.find((b) => b.brand === brand), [catalog, brand])
  const materialObj = useMemo(
    () => brandObj?.materials.find((m) => m.material === material),
    [brandObj, material]
  )

  // marka değişince ilk malzemeyi seç
  const onBrandChange = (val: string): void => {
    setBrand(val)
    if (val === CUSTOM) return
    const b = catalog.find((x) => x.brand === val)
    const m = b?.materials[0]
    if (m) {
      setMaterial(m.material)
      setType(m.type)
      setTemp(m.temp)
      setNetWeight(m.defaultNetWeight)
      if (!editing) setRemaining(m.defaultNetWeight)
      const col = m.colors[0]
      if (col) {
        setColorName(col.name)
        setColorHex(col.hex)
      }
    }
  }

  const onMaterialChange = (val: string): void => {
    setMaterial(val)
    const m = brandObj?.materials.find((x) => x.material === val)
    if (m) {
      setType(m.type)
      setTemp(m.temp)
      setNetWeight(m.defaultNetWeight)
      if (!editing) setRemaining(m.defaultNetWeight)
      const col = m.colors[0]
      if (col) {
        setColorName(col.name)
        setColorHex(col.hex)
      }
    }
  }

  const pickColor = (name: string, hex: string): void => {
    setColorName(name)
    setColorHex(hex)
  }

  const save = (): void => {
    const payload = {
      brand: isCustomBrand ? brand.replace(CUSTOM, '').trim() || 'Özel' : brand,
      material,
      type,
      colorName: isCustomColor ? 'Özel' : colorName,
      colorHex,
      netWeightG: netWeight,
      remainingG: remaining,
      opened,
      openedDate: opened ? (editing?.openedDate ?? new Date().toISOString()) : undefined,
      rfidUid: rfid.trim() || undefined,
      notes: notes.trim() || undefined,
      temp,
      amsUnit: editing?.amsUnit ?? null,
      amsSlot: editing?.amsSlot ?? null
    }
    if (editing) updateSpool(editing.id, payload)
    else addSpool(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? t('spool.editTitle') : t('spool.addTitle')}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={save} disabled={!material}>
            {editing ? t('common.save') : t('common.add')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{t('spool.brand')}</label>
          <select className="input" value={brand} onChange={(e) => onBrandChange(e.target.value)}>
            {catalog.map((b) => (
              <option key={b.id} value={b.brand}>
                {b.brand} {b.region === 'Türkiye' ? '🇹🇷' : ''}
              </option>
            ))}
            <option value={CUSTOM}>{t('spool.customBrand')}</option>
          </select>
          {isCustomBrand && (
            <input
              className="input mt-2"
              placeholder={t('spool.brandName')}
              value={brand === CUSTOM ? '' : brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          )}
        </div>

        <div>
          <label className="label">{t('spool.material')}</label>
          {isCustomBrand ? (
            <input className="input" placeholder="PLA Basic" value={material} onChange={(e) => setMaterial(e.target.value)} />
          ) : (
            <select className="input" value={material} onChange={(e) => onMaterialChange(e.target.value)}>
              {brandObj?.materials.map((m) => (
                <option key={m.material} value={m.material}>
                  {m.material}
                </option>
              ))}
            </select>
          )}
          <div className="mt-1 text-xs text-gray-500">
            {t('spool.type')}: {type}
          </div>
        </div>
      </div>

      {/* Color selection */}
      <div className="mt-4">
        <label className="label">{t('spool.color')}</label>
        {materialObj && !isCustomBrand ? (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
            {materialObj.colors.map((col) => (
              <button
                key={col.name + col.hex}
                onClick={() => pickColor(col.name, col.hex)}
                title={col.name}
                className="relative rounded-lg transition-transform hover:scale-110"
                style={{
                  width: 30,
                  height: 30,
                  background: col.hex,
                  border: needsBorder(col.hex) ? '1px solid #3a4347' : '1px solid rgba(0,0,0,0.25)',
                  outline: colorName === col.name && colorHex === col.hex ? '2px solid #00ae42' : 'none',
                  outlineOffset: 2
                }}
              />
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-3 mt-2">
          <input
            type="color"
            value={colorHex}
            onChange={(e) => {
              setColorHex(e.target.value)
              setColorName(CUSTOM)
            }}
            className="h-9 w-12 rounded-lg bg-transparent cursor-pointer border border-ink-600"
          />
          <input
            className="input flex-1"
            placeholder={t('spool.colorName')}
            value={isCustomColor ? '' : colorName}
            onChange={(e) => setColorName(e.target.value)}
          />
          <span className="text-xs text-gray-500 w-16">{colorHex.toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="label">{t('spool.netWeight')}</label>
          <input
            type="number"
            className="input"
            value={netWeight}
            onChange={(e) => setNetWeight(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">{t('spool.remaining')}</label>
          <input
            type="number"
            className="input"
            value={remaining}
            onChange={(e) => setRemaining(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {rfidOn ? (
          <div>
            <label className="label">{t('spool.rfid')}</label>
            <input className="input" placeholder="1A2B3C4D" value={rfid} onChange={(e) => setRfid(e.target.value)} />
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input
              type="checkbox"
              checked={opened}
              onChange={(e) => setOpened(e.target.checked)}
              className="accent-bambu w-4 h-4"
            />
            {t('spool.opened')}
          </label>
        </div>
      </div>

      <div className="mt-4">
        <label className="label">{t('spool.note')}</label>
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('common.optional')} />
      </div>

      {temp && (
        <div className="mt-4 text-xs text-gray-500">
          {t('spool.recommended')}: {t('spool.nozzle')} {temp.nozzleMin}–{temp.nozzleMax}°C · {t('spool.bed')}{' '}
          {temp.bedMin}–{temp.bedMax}°C{temp.enclosure ? ` · ${t('spool.enclosureShort')}` : ''}
        </div>
      )}
    </Modal>
  )
}
