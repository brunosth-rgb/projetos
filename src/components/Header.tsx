import type { Status } from '../domain/types'
import { STATUS_LABEL } from '../ui/labels'

export type Filters = { showDone: boolean; statuses: Status[] | null; mine: boolean }
export type View = 'lista' | 'kanban'

// 36px controls (44px touch targets on phones), --control borders, radius 6.
const chip =
  'inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-control border bg-surface px-3 text-sm transition-colors max-sm:h-11'
const chipIdle = 'border-control text-ink hover:border-faint'
const chipOn = 'border-ink bg-active font-medium text-ink'

/** Toolbar: view switch and filters. "Mostrar concluídos" and Status only apply to the list. */
export function Header({
  view,
  onViewChange,
  filters,
  onFiltersChange,
}: {
  view: View
  onViewChange: (v: View) => void
  filters: Filters
  onFiltersChange: (f: Filters) => void
}) {
  const seg = (v: View, label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => onViewChange(v)}
      className={`inline-flex h-full items-center rounded-[4px] px-3 text-sm transition-colors ${
        view === v ? 'bg-active font-medium text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      className="no-scrollbar -mx-6 -my-1.5 flex items-center gap-2 overflow-x-auto px-6 py-1.5 max-sm:-mx-4 max-sm:px-4"
    >
      <div className="inline-flex h-9 shrink-0 items-stretch gap-0.5 rounded-control border border-control bg-surface p-[3px] max-sm:h-11">
        {seg('lista', 'Lista')}
        {seg('kanban', 'Kanban')}
      </div>
      <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />
      {view === 'lista' && (
        <>
          <label className={`${chip} ${chipIdle} pr-1`}>
            <span className="text-muted">Status</span>
            <select
              className="h-full cursor-pointer rounded-[4px] bg-transparent pr-1 text-sm font-medium text-ink outline-offset-0"
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
          <label className={`${chip} ${filters.showDone ? chipOn : chipIdle}`}>
            <input
              type="checkbox"
              className="size-4 accent-[var(--text)]"
              checked={filters.showDone}
              onChange={e => onFiltersChange({ ...filters, showDone: e.target.checked })}
            />
            Mostrar concluídos
          </label>
        </>
      )}
      <button
        type="button"
        aria-pressed={filters.mine}
        onClick={() => onFiltersChange({ ...filters, mine: !filters.mine })}
        className={`${chip} ${filters.mine ? chipOn : chipIdle}`}
      >
        Meus steps
      </button>
    </div>
  )
}
