import { isDatePast, isDateWithin3Days } from './projects'

// Date-only helpers for display. Dates are 'YYYY-MM-DD' strings; nothing here parses them as UTC
// instants, so the local calendar day never shifts.

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number)
  return [y, m, d]
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = parts(from)
  const [y2, m2, d2] = parts(to)
  // Date.UTC on the components is plain calendar arithmetic (no time zone, no DST).
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

/** 'dd/mm' */
export function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Short Portuguese weekday ('qua') computed from the date components. */
export function weekdayShort(date: string): string {
  const [y, m, d] = parts(date)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** Day of the month without leading zero. */
export function dayOfMonth(date: string): number {
  return parts(date)[2]
}

export type DueTone = 'overdue' | 'soon' | 'none'

/**
 * Display parts for a due date: 'dd/mm', relative text ('hoje', 'amanhã', 'em 3 dias', 'ontem',
 * 'há 2 dias'; 'Sem prazo' when null) and a tone by date alone (overdue = past, soon = within 3 days).
 * Callers that know the project status (concluído has no tone) should prefer isOverdue/isDueSoon.
 */
export function dueLabel(due: string | null, today: string): { date: string; relative: string; tone: DueTone } {
  if (due === null) return { date: '', relative: 'Sem prazo', tone: 'none' }
  const n = daysBetween(today, due)
  const relative =
    n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : n > 1 ? `em ${n} dias` : `há ${-n} dias`
  // Same date rules as isOverdue/isDueSoon (single source in projects.ts).
  const tone: DueTone = isDatePast(due, today) ? 'overdue' : isDateWithin3Days(due, today) ? 'soon' : 'none'
  return { date: shortDate(due), relative, tone }
}
