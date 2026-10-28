import type { Status } from '../domain/types'
import { STATUS_LABEL } from '../ui/labels'

export type Filters = { showDone: boolean; statuses: Status[] | null; mine: boolean }
export type View = 'lista' | 'kanban'

export function Header({
  view,
  onViewChange,
  filters,
  onFiltersChange,
  onNew,
  onSignOut,
}: {
  view: View
  onViewChange: (v: View) => void
  filters: Filters
  onFiltersChange: (f: Filters) => void
  onNew: () => void
  onSignOut: () => void
}) {
  const btn = 'rounded border px-3 py-1.5 text-sm'
  const on = 'bg-slate-800 text-white border-slate-800'
  const off = 'bg-white border-slate-300'
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
      <div className="flex gap-1">
        <button type="button" aria-pressed={view === 'lista'} onClick={() => onViewChange('lista')} className={`${btn} ${view === 'lista' ? on : off}`}>
          Lista
        </button>
        <button type="button" aria-pressed={view === 'kanban'} onClick={() => onViewChange('kanban')} className={`${btn} ${view === 'kanban' ? on : off}`}>
          Kanban
        </button>
      </div>
      {view === 'lista' && (
        <>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={filters.showDone}
              onChange={e => onFiltersChange({ ...filters, showDone: e.target.checked })}
            />
            Mostrar concluídos
          </label>
          <label className="flex items-center gap-1 text-sm">
            Status
            <select
              className="rounded border border-slate-300 px-2 py-1"
              value={filters.statuses && filters.statuses.length === 1 ? filters.statuses[0] : ''}
              onChange={e => {
                const v = e.target.value as Status | ''
                onFiltersChange({ ...filters, statuses: v ? [v] : null })
              }}
            >
              <option value="">Todos</option>
              {(Object.keys(STATUS_LABEL) as Status[]).map(s => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <button
        type="button"
        aria-pressed={filters.mine}
        onClick={() => onFiltersChange({ ...filters, mine: !filters.mine })}
        className={`${btn} ${filters.mine ? on : off}`}
      >
        Meus steps
      </button>
      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onNew} className={`${btn} bg-blue-600 text-white border-blue-600`}>
          Novo projeto
        </button>
        <button type="button" onClick={onSignOut} className={`${btn} ${off}`}>
          Sair
        </button>
      </div>
    </header>
  )
}
