import React, { useState } from 'react'
import { Plus, Trash2, History, RefreshCw, Loader2, AlertCircle, Pencil, X } from 'lucide-react'
import { useData, bestSpoolMatch, type CloudImportRow } from '../state'
import { useI18n } from '../i18n'
import { ColorSwatch } from '../components/bits'
import { Modal } from '../components/Modal'
import type { PrintLogEntry } from '../../../shared/types'

export function PrintLog(): React.JSX.Element {
  const { data, addPrintLog, updatePrintLog, deletePrintLog, applyCloudImport, clearCloudLog, importedCloudIds, updateSettings } =
    useData()
  const { t, lang } = useI18n()
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US'

  const [open, setOpen] = useState(false)
  const [spoolId, setSpoolId] = useState('')
  const [grams, setGrams] = useState(0)
  const [task, setTask] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [reviewRows, setReviewRows] = useState<CloudImportRow[] | null>(null)

  // record editing
  const [editEntry, setEditEntry] = useState<PrintLogEntry | null>(null)
  const [eName, setEName] = useState('')
  const [eCounted, setECounted] = useState(true)
  const [eRows, setERows] = useState<{ spoolId: string; grams: number }[]>([])

  const openEdit = (e: PrintLogEntry): void => {
    setEditEntry(e)
    setEName(e.taskName ?? '')
    setECounted(e.counted !== false)
    const rows = e.deductions?.length
      ? e.deductions.map((d) => ({ spoolId: d.spoolId, grams: d.grams }))
      : [{ spoolId: e.spoolId ?? '', grams: Math.round(e.grams) }]
    setERows(rows)
  }

  const saveEdit = (): void => {
    if (!editEntry) return
    updatePrintLog(editEntry.id, { taskName: eName.trim() || undefined, counted: eCounted, rows: eRows })
    setEditEntry(null)
  }

  const setERow = (i: number, patch: Partial<{ spoolId: string; grams: number }>): void =>
    setERows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const cloud = data.settings.cloud
  const total = data.printLog.filter((e) => e.counted !== false).reduce((a, e) => a + e.grams, 0)

  const fetchCloud = async (): Promise<void> => {
    if (!cloud?.token) {
      setImportMsg({ ok: false, text: t('log.needLogin') })
      return
    }
    setImporting(true)
    setImportMsg(null)
    const res = await window.api.cloudTasks(cloud.token, cloud.region)
    setImporting(false)
    if (res.ok && res.tasks) {
      const fresh = res.tasks.filter((tk) => !importedCloudIds.has(tk.id))
      if (fresh.length === 0) {
        setImportMsg({ ok: true, text: t('log.noNew') })
        return
      }
      // smart defaults: include, match each filament to its own spool (multi-color)
      setReviewRows(
        fresh.map((tk) => {
          const fils = tk.filaments?.length ? tk.filaments : [{ grams: tk.grams }]
          const items = fils.map((f) => {
            const g = Math.round((f.grams && f.grams > 0 ? f.grams : fils.length === 1 ? tk.grams : 0) || 0)
            const match = bestSpoolMatch({ type: f.type, color: f.color }, data.spools)
            return { color: f.color, type: f.type, grams: g, spoolId: match?.id ?? '' }
          })
          // if per-filament weight is missing, put the total estimate on the first filament
          if (items.reduce((a, it) => a + it.grams, 0) === 0 && tk.grams > 0 && items[0]) {
            items[0].grams = Math.round(tk.grams)
          }
          return { task: tk, include: true, items }
        })
      )
    } else if (res.expired) {
      updateSettings({ cloud: undefined })
      setImportMsg({ ok: false, text: t('log.expired') })
    } else {
      setImportMsg({ ok: false, text: res.error ?? t('log.fetchFail') })
    }
  }

  const setRow = (i: number, patch: Partial<CloudImportRow>): void => {
    setReviewRows((rows) => (rows ? rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : rows))
  }

  const setItem = (ri: number, ii: number, patch: Partial<CloudImportRow['items'][number]>): void => {
    setReviewRows((rows) =>
      rows
        ? rows.map((r, idx) =>
            idx === ri ? { ...r, items: r.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : r
          )
        : rows
    )
  }

  const confirmImport = (): void => {
    if (!reviewRows) return
    const added = applyCloudImport(reviewRows)
    const deducted = reviewRows.reduce(
      (a, r) => a + (r.include ? r.items.filter((it) => it.spoolId && it.grams > 0).length : 0),
      0
    )
    setReviewRows(null)
    setImportMsg({ ok: true, text: t('log.imported', { added, deducted }) })
  }

  const submit = (): void => {
    addPrintLog({
      date: new Date().toISOString(),
      taskName: task.trim() || undefined,
      spoolId: spoolId || undefined,
      grams,
      source: 'manual'
    })
    setOpen(false)
    setGrams(0)
    setTask('')
    setSpoolId('')
  }

  const includedCount = reviewRows?.filter((r) => r.include).length ?? 0
  const allIncluded = reviewRows ? reviewRows.every((r) => r.include) : false

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {t('log.totalConsumption')}: <span className="text-gray-100 font-semibold">{Math.round(total)} g</span> ·{' '}
          {data.printLog.length} {t('log.records')}
        </div>
        <div className="flex items-center gap-2">
          {data.printLog.some((e) => e.source === 'cloud') && (
            <button
              className="btn-ghost text-gray-500"
              onClick={() => {
                if (confirm(t('log.confirmClear'))) {
                  clearCloudLog()
                  setImportMsg(null)
                }
              }}
            >
              <Trash2 size={15} /> {t('log.clearCloud')}
            </button>
          )}
          <button className="btn-ghost" onClick={fetchCloud} disabled={importing}>
            {importing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t('log.sync')}
          </button>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> {t('log.addRecord')}
          </button>
        </div>
      </div>

      {importMsg && <p className={`text-sm ${importMsg.ok ? 'text-bambu' : 'text-accent-red'}`}>{importMsg.text}</p>}

      {data.printLog.length === 0 ? (
        <div className="card p-12 flex flex-col items-center text-center text-gray-500">
          <History size={40} className="mb-3 text-gray-700" />
          <p>{t('log.emptyTitle')}</p>
          <p className="text-xs mt-1">{t('log.emptyHint')}</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-700/50">
          {data.printLog.map((e) => {
            const sp = data.spools.find((s) => s.id === (e.spoolId ?? e.deductions?.[0]?.spoolId))
            const notCounted = e.counted === false
            const sourceLabel =
              e.source === 'manual' ? t('log.manual') : e.source === 'cloud' ? t('log.cloud') : e.source
            return (
              <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${notCounted ? 'opacity-55' : ''}`}>
                {e.imageUrl ? (
                  <img src={e.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover bg-ink-700 shrink-0" />
                ) : sp ? (
                  <ColorSwatch hex={sp.colorHex} size={28} />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-ink-700" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate flex items-center gap-2">
                    {e.taskName ?? t('nav.history')}
                    {notCounted && <span className="chip py-0 text-[10px] text-accent-amber">{t('log.notCounted')}</span>}
                    {sp && (
                      <span className="text-gray-500">
                        — {sp.brand} {sp.colorName}
                      </span>
                    )}
                    {!sp && e.detail && <span className="text-gray-500">— {e.detail}</span>}
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(e.date).toLocaleString(locale)} · {sourceLabel}
                    {e.device ? ` · ${e.device}` : ''}
                    {e.deductions?.length ? ` · ${t('log.deductedFromInv')}` : ''}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold ${notCounted ? 'text-gray-500 line-through' : 'text-accent-amber'}`}
                >
                  -{Math.round(e.grams)} g
                </div>
                <button className="text-gray-600 hover:text-gray-200" onClick={() => openEdit(e)} title={t('common.edit')}>
                  <Pencil size={15} />
                </button>
                <button
                  className="text-gray-600 hover:text-accent-red"
                  onClick={() => deletePrintLog(e.id)}
                  title={t('common.delete')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Manual record */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('log.addRecordTitle')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" disabled={grams <= 0} onClick={submit}>
              {t('common.add')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">{t('log.filamentSpool')}</label>
            <select className="input" value={spoolId} onChange={(e) => setSpoolId(e.target.value)}>
              <option value="">{t('log.noSpool')}</option>
              {data.spools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.brand} {s.material} · {s.colorName} ({Math.round(s.remainingG)} g)
                </option>
              ))}
            </select>
            {spoolId && <p className="text-xs text-gray-500 mt-1">{t('log.autoDeduct')}</p>}
          </div>
          <div>
            <label className="label">{t('inv.amountUsed')}</label>
            <input type="number" className="input" value={grams || ''} onChange={(e) => setGrams(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">{t('inv.printName')}</label>
            <input className="input" value={task} onChange={(e) => setTask(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Cloud import review */}
      <Modal
        open={!!reviewRows}
        onClose={() => setReviewRows(null)}
        wide
        title={t('log.reviewTitle')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setReviewRows(null)}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={confirmImport}>
              {t('log.importBtn', { n: includedCount })}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-2 mb-3 text-xs text-gray-400 bg-ink-900/50 rounded-xl p-3">
          <AlertCircle size={15} className="text-accent-amber shrink-0 mt-0.5" />
          <span>{t('log.reviewWarn')}</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              className="accent-bambu w-4 h-4"
              checked={allIncluded}
              onChange={(e) => setReviewRows((rows) => rows?.map((r) => ({ ...r, include: e.target.checked })) ?? rows)}
            />
            {t('log.selectAll')}
          </label>
          <span className="text-xs text-gray-500">
            {includedCount} / {reviewRows?.length ?? 0} {t('log.selected')}
          </span>
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {reviewRows?.map((r, i) => (
            <div
              key={r.task.id}
              className={`rounded-xl border p-3 ${
                r.include ? 'border-ink-600 bg-ink-800/60' : 'border-ink-700/40 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="accent-bambu w-4 h-4 shrink-0"
                  checked={r.include}
                  onChange={(e) => setRow(i, { include: e.target.checked })}
                />
                {r.task.imageUrl ? (
                  <img src={r.task.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-ink-700 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-ink-700 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {r.task.title}
                    {r.items.length > 1 && (
                      <span className="chip py-0 text-[10px] ml-2">
                        {r.items.length} {t('log.colors')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(r.task.date).toLocaleDateString(locale)}
                    {r.task.costTime ? ` · ${r.task.costTime} ${t('log.min')}` : ''}
                    {typeof r.task.status === 'number' ? ` · ${t('log.status')}:${r.task.status}` : ''}
                  </div>
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {Math.round(r.items.reduce((a, it) => a + (it.grams || 0), 0))} g
                </div>
              </div>

              {/* Per-filament deduction (multi-color) */}
              <div className="mt-3 pl-7 space-y-2">
                {r.items.map((it, j) => (
                  <div key={j} className="flex items-center gap-2">
                    {it.color ? (
                      <ColorSwatch hex={it.color} size={22} />
                    ) : (
                      <div className="w-[22px] h-[22px] rounded-lg bg-ink-700 shrink-0" />
                    )}
                    <span className="text-xs text-gray-500 w-12 shrink-0">{it.type ?? '—'}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="input py-1 w-20"
                        value={it.grams || ''}
                        disabled={!r.include}
                        onChange={(e) => setItem(i, j, { grams: Number(e.target.value) })}
                      />
                      <span className="text-xs text-gray-600">g</span>
                    </div>
                    <select
                      className="input py-1 flex-1"
                      value={it.spoolId}
                      disabled={!r.include}
                      onChange={(e) => setItem(i, j, { spoolId: e.target.value })}
                    >
                      <option value="">{t('log.noDeduct')}</option>
                      {data.spools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.brand} {s.colorName} ({Math.round(s.remainingG)} g)
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Record editing */}
      <Modal
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        title={t('log.editTitle')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditEntry(null)}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={saveEdit}>
              {t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">{t('log.printName')}</label>
            <input className="input" value={eName} onChange={(e) => setEName(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              className="accent-bambu w-4 h-4"
              checked={eCounted}
              onChange={(e) => setECounted(e.target.checked)}
            />
            {t('log.countAndDeduct')}
          </label>
          {!eCounted && <p className="text-xs text-accent-amber -mt-2">{t('log.notCountedHint')}</p>}

          <div>
            <label className="label">{t('log.deductions')}</label>
            <div className="space-y-2">
              {eRows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className="input py-1.5 flex-1"
                    value={r.spoolId}
                    disabled={!eCounted}
                    onChange={(e) => setERow(i, { spoolId: e.target.value })}
                  >
                    <option value="">{t('log.noDeduct')}</option>
                    {data.spools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.brand} {s.colorName} ({Math.round(s.remainingG)} g)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input py-1.5 w-24"
                    value={r.grams || ''}
                    onChange={(e) => setERow(i, { grams: Number(e.target.value) })}
                  />
                  <span className="text-xs text-gray-600">g</span>
                  {eRows.length > 1 && (
                    <button
                      className="text-gray-600 hover:text-accent-red"
                      onClick={() => setERows((rows) => rows.filter((_, idx) => idx !== i))}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="btn-ghost py-1.5 mt-2 text-xs"
              onClick={() => setERows((rows) => [...rows, { spoolId: '', grams: 0 }])}
            >
              <Plus size={14} /> {t('log.addDeduction')}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {t('log.total')}: {Math.round(eRows.reduce((a, r) => a + (r.grams || 0), 0))} g
          </p>
        </div>
      </Modal>
    </div>
  )
}
