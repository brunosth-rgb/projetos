import { useEffect, useId, useRef, useState } from 'react'
import type { Project } from '../domain/types'
import { upcomingDeadlines } from '../domain/deadlines'
import { dayOfMonth, shortDate, weekdayShort } from '../domain/dates'

interface Cell {
  key: string
  label: string
  /** Spoken label, with the full date for day cells. */
  spoken: string
  projects: Project[]
  kind: 'overdue' | 'today' | 'day'
}

function countText(n: number): string {
  return n === 0 ? 'nenhum projeto' : n === 1 ? '1 projeto' : `${n} projetos`
}

function buildCells(projects: Project[], today: string): Cell[] {
  const { overdue, days } = upcomingDeadlines(projects, today)
  return [
    { key: 'overdue', label: 'Atrasados', spoken: 'Atrasados', projects: overdue, kind: 'overdue' },
    ...days.map((d, i): Cell => {
      const label = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : `${weekdayShort(d.date)} ${dayOfMonth(d.date)}`
      return {
        key: d.date,
        label,
        spoken: `${label}, ${shortDate(d.date)}`,
        projects: d.projects,
        kind: i === 0 ? 'today' : 'day',
      }
    }),
  ]
}

/**
 * "Próximos prazos": overdue + the next 7 days in one ruled strip. A cell with one project opens it;
 * a cell with several opens a small list of titles. Hidden when the account has no projects.
 */
export function DeadlineStrip({
  projects,
  today,
  onOpen,
}: {
  projects: Project[]
  today: string
  onOpen: (id: string) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const popId = useId()

  const close = (refocus: boolean) => {
    if (refocus && open) cellRefs.current.get(open)?.focus()
    setOpen(null)
  }
  const closeRef = useRef(close)
  closeRef.current = close

  useEffect(() => {
    if (!open) return
    // Move focus into the list so Tab and Enter reach the titles; Escape brings it back to the cell.
    popRef.current?.querySelector('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current(true)
    }
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeRef.current(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const cells = buildCells(projects, today)
  const openCell = cells.find(c => c.key === open)
  const openEmpty = open !== null && (!openCell || openCell.projects.length === 0)

  // The open cell lost its projects (edited, completed, deleted, day rolled over): nothing to list.
  useEffect(() => {
    if (openEmpty) setOpen(null)
  }, [openEmpty])

  if (projects.length === 0) return null

  const activate = (c: Cell) => {
    if (c.projects.length === 0) return
    if (c.projects.length === 1) {
      setOpen(null)
      onOpen(c.projects[0].id)
      return
    }
    if (open === c.key) {
      setOpen(null)
      return
    }
    const btn = cellRefs.current.get(c.key)
    const wrap = wrapRef.current
    if (btn && wrap) {
      const b = btn.getBoundingClientRect()
      const w = wrap.getBoundingClientRect()
      const top = b.bottom - w.top + 4
      // Anchor to the cell's left edge, or its right edge when the cell sits in the right half.
      setPos(b.left - w.left > w.width / 2 ? { top, right: w.right - b.right } : { top, left: b.left - w.left })
    }
    setOpen(c.key)
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onBlur={e => {
        // Focus left both the popover and its cell (Tab past the list, focus elsewhere): close.
        if (!open) return
        const next = e.relatedTarget as Node | null
        const cell = cellRefs.current.get(open)
        if (next && (popRef.current?.contains(next) || cell?.contains(next))) return
        setOpen(null)
      }}
    >
      <h2 className="sr-only">Próximos prazos</h2>
      {/* gap-px over the border colour draws the 1px dividers in both the 8x1 and the 4x2 layout. */}
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-8">
        {cells.map(c => {
          const n = c.projects.length
          const multi = n > 1
          const countTone =
            n === 0 ? 'text-muted' : c.kind === 'overdue' ? 'text-negative' : 'text-ink'
          return (
            <button
              key={c.key}
              ref={el => {
                if (el) cellRefs.current.set(c.key, el)
                else cellRefs.current.delete(c.key)
              }}
              type="button"
              aria-label={`${c.spoken}: ${countText(n)}`}
              aria-disabled={n === 0 ? 'true' : undefined}
              aria-expanded={multi ? open === c.key : undefined}
              aria-controls={multi && open === c.key ? popId : undefined}
              title={n > 0 ? c.projects.map(p => p.title).join('\n') : undefined}
              onClick={() => activate(c)}
              className={`relative flex min-h-16 flex-col justify-between gap-1 bg-surface px-3 py-2.5 text-left transition-colors focus-visible:-outline-offset-2 ${
                n > 0 ? 'hover:bg-active' : 'cursor-default'
              } ${open === c.key ? 'bg-active' : ''}`}
            >
              {c.kind === 'today' && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-data" />}
              <span className={`text-xs whitespace-nowrap ${c.kind === 'today' ? 'font-medium text-ink' : 'text-muted'}`}>
                {c.label}
              </span>
              <span className={`num text-base leading-6 font-medium ${countTone}`}>{n}</span>
            </button>
          )
        })}
      </div>
      {openCell && !openEmpty && (
        <div
          ref={popRef}
          id={popId}
          role="group"
          aria-label={`Projetos: ${openCell.spoken}`}
          style={{ top: pos.top, left: pos.left, right: pos.right }}
          className="fade-in absolute z-30 w-72 max-w-full rounded-card border border-border bg-surface p-1 shadow-float"
        >
          <ul>
            {openCell.projects.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(null)
                    onOpen(p.id)
                  }}
                  className="flex min-h-9 w-full items-center rounded-control px-2.5 text-left text-sm transition-colors hover:bg-active focus-visible:-outline-offset-2 max-sm:min-h-11"
                >
                  <span className="truncate">{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
