import React, { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Minus, Search, PackageOpen, Package, Lock } from 'lucide-react'
import { useData } from '../state'
import { useI18n } from '../i18n'
import { ColorSwatch, RemainingBar, TempBadges } from '../components/bits'
import { isOpened, needsBorder, clampPct } from '../lib/ui'
import { SpoolModal } from '../components/SpoolModal'
import { Modal } from '../components/Modal'
import type { Spool } from '../../../shared/types'

function UsageModal({ spool, onClose }: { spool: Spool | null; onClose: () => void }): React.JSX.Element {
  const { addPrintLog } = useData()
  const { t } = useI18n()
  const [grams, setGrams] = useState(0)
  const [task, setTask] = useState('')
  return (
    <Modal
      open={!!spool}
      onClose={onClose}
      title={t('inv.useFilament')}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn-primary"
            disabled={grams <= 0}
            onClick={() => {
              if (spool)
                addPrintLog({
                  date: new Date().toISOString(),
                  taskName: task.trim() || undefined,
                  spoolId: spool.id,
                  grams,
                  source: 'manual'
                })
              onClose()
            }}
          >
            {t('inv.deduct')}
          </button>
        </>
      }
    >
      {spool && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ColorSwatch hex={spool.colorHex} />
            <div>
              <div className="text-sm">
                {spool.brand} {spool.material}
              </div>
              <div className="text-xs text-gray-500">
                {spool.colorName} · {t('inv.remaining')} {Math.round(spool.remainingG)} g
              </div>
            </div>
          </div>
          <div>
            <label className="label">{t('inv.amountUsed')}</label>
            <input
              type="number"
              className="input"
              value={grams || ''}
              autoFocus
              onChange={(e) => setGrams(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">{t('inv.printName')}</label>
            <input className="input" value={task} onChange={(e) => setTask(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  )
}

function SpoolCard({
  spool,
  onEdit,
  onUse,
  onOpen
}: {
  spool: Spool
  onEdit: () => void
  onUse: () => void
  onOpen: () => void
}): React.JSX.Element {
  const { deleteSpool, updateSpool } = useData()
  const { t } = useI18n()
  const opened = isOpened(spool)
  const stop = (e: React.MouseEvent): void => e.stopPropagation()

  return (
    <div
      className={`card relative overflow-hidden p-4 flex flex-col gap-3 ${
        opened ? '' : 'ring-1 ring-accent-blue/15 cursor-pointer'
      }`}
      onClick={opened ? undefined : onOpen}
      title={opened ? undefined : t('inv.clickToOpen')}
    >
      {/* Vakumlu poşet kaplaması */}
      {!opened && (
        <>
          <div className="vacuum-bag absolute inset-0 pointer-events-none z-10" />
          <div className="vacuum-seam vacuum-seam-top z-10" />
          <div className="vacuum-seam vacuum-seam-bottom z-10" />
        </>
      )}

      <div className="flex items-start gap-3 relative z-0">
        <div
          className={`relative shrink-0 rounded-xl ${opened ? '' : 'sealed-wrap'}`}
          style={{
            width: 46,
            height: 46,
            background: spool.colorHex,
            border: needsBorder(spool.colorHex) ? '1px solid #3a4347' : '1px solid rgba(0,0,0,0.25)',
            boxShadow: spool.amsSlot != null ? '0 0 0 2px #00ae42' : undefined
          }}
        >
          {!opened && (
            <span className="absolute -bottom-1.5 -right-1.5 bg-ink-850 rounded-md p-0.5 border border-ink-600 shadow">
              <Package size={12} className="text-accent-blue" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            {spool.brand} {spool.material}
          </div>
          <div className="text-xs text-gray-500 truncate">{spool.colorName}</div>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            <span className="chip py-0.5">{spool.type}</span>
            {opened ? (
              <span className="chip py-0.5 text-accent-amber">
                <PackageOpen size={12} /> {t('inv.opened')}
              </span>
            ) : (
              <span className="chip py-0.5 text-accent-blue">
                <Package size={12} /> {t('inv.sealed')}
              </span>
            )}
            {spool.amsSlot != null && <span className="chip py-0.5 text-bambu">AMS {spool.amsSlot + 1}</span>}
          </div>
        </div>
      </div>

      {opened ? (
        <RemainingBar remaining={spool.remainingG} net={spool.netWeightG} />
      ) : (
        <div className="relative z-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-semibold text-gray-100 flex items-center gap-1.5">
              <Lock size={12} className="text-accent-blue" /> {t('inv.sealedFull')}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(spool.remainingG)} g
              {spool.remainingG >= spool.netWeightG - 0.5 ? ` · ${t('inv.full')}` : ''}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-ink-900 overflow-hidden">
            <div
              className="h-full rounded-full sealed-wrap"
              style={{
                width: `${clampPct(spool.remainingG, spool.netWeightG)}%`,
                background: 'rgba(61,169,252,0.4)'
              }}
            />
          </div>
        </div>
      )}

      {spool.temp && (
        <div className="relative z-0">
          <TempBadges temp={spool.temp} />
        </div>
      )}

      {spool.notes && <div className="text-xs text-gray-500 italic relative z-0">{spool.notes}</div>}

      <div className="flex gap-2 pt-1 relative z-20">
        {opened ? (
          <>
            <button className="btn-ghost flex-1 py-1.5" onClick={(e) => { stop(e); onUse() }}>
              <Minus size={14} /> {t('inv.use')}
            </button>
            <button
              className="btn-ghost py-1.5 px-3"
              title={t('inv.reseal')}
              onClick={(e) => {
                stop(e)
                updateSpool(spool.id, { opened: false })
              }}
            >
              <Lock size={14} />
            </button>
          </>
        ) : (
          <button
            className="btn-primary flex-1 py-1.5"
            onClick={(e) => {
              stop(e)
              onOpen()
            }}
          >
            <PackageOpen size={14} /> {t('inv.open')}
          </button>
        )}
        <button className="btn-ghost py-1.5 px-3" onClick={(e) => { stop(e); onEdit() }}>
          <Pencil size={14} />
        </button>
        <button
          className="btn-danger py-1.5 px-3"
          onClick={(e) => {
            stop(e)
            if (confirm(t('inv.confirmDelete', { name: `${spool.brand} ${spool.colorName}` }))) deleteSpool(spool.id)
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export function Inventory(): React.JSX.Element {
  const { data, updateSpool } = useData()
  const { t } = useI18n()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Spool | null>(null)
  const [usingSpool, setUsingSpool] = useState<Spool | null>(null)
  const [openConfirm, setOpenConfirm] = useState<Spool | null>(null)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('__all__')
  const [sort, setSort] = useState<'remaining-asc' | 'remaining-desc' | 'name' | 'recent'>('remaining-asc')

  const types = useMemo(() => Array.from(new Set(data.spools.map((s) => s.type))), [data.spools])

  const filtered = data.spools
    .filter((s) => {
      if (typeFilter !== '__all__' && s.type !== typeFilter) return false
      if (!q) return true
      const hay = `${s.brand} ${s.material} ${s.colorName} ${s.type}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    .sort((a, b) => {
      switch (sort) {
        case 'remaining-asc':
          return a.remainingG - b.remainingG
        case 'remaining-desc':
          return b.remainingG - a.remainingG
        case 'name':
          return `${a.brand} ${a.material}`.localeCompare(`${b.brand} ${b.material}`)
        case 'recent':
          return +new Date(b.updatedAt) - +new Date(a.updatedAt)
        default:
          return 0
      }
    })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            className="input pl-9"
            placeholder={t('inv.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="__all__">{t('common.all')}</option>
          {types.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="remaining-asc">{t('inv.sortRemainingAsc')}</option>
          <option value="remaining-desc">{t('inv.sortRemainingDesc')}</option>
          <option value="name">{t('inv.sortName')}</option>
          <option value="recent">{t('inv.sortRecent')}</option>
        </select>
        <div className="flex-1" />
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus size={16} /> {t('inv.addSpool')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center text-center text-gray-500">
          <PackageOpen size={40} className="mb-3 text-gray-700" />
          <p className="mb-1">{t('inv.emptyTitle')}</p>
          <p className="text-xs">{t('inv.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SpoolCard
              key={s.id}
              spool={s}
              onEdit={() => {
                setEditing(s)
                setModalOpen(true)
              }}
              onUse={() => setUsingSpool(s)}
              onOpen={() => setOpenConfirm(s)}
            />
          ))}
        </div>
      )}

      <SpoolModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      <UsageModal spool={usingSpool} onClose={() => setUsingSpool(null)} />

      {/* Açma onayı */}
      <Modal
        open={!!openConfirm}
        onClose={() => setOpenConfirm(null)}
        title={t('inv.confirmOpenTitle')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpenConfirm(null)}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                if (openConfirm) updateSpool(openConfirm.id, { opened: true })
                setOpenConfirm(null)
              }}
            >
              <PackageOpen size={15} /> {t('inv.open')}
            </button>
          </>
        }
      >
        {openConfirm && (
          <div className="flex items-center gap-3">
            <ColorSwatch hex={openConfirm.colorHex} size={40} />
            <div>
              <div className="text-sm">
                {openConfirm.brand} {openConfirm.material} · {openConfirm.colorName}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('inv.confirmOpenBody')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
