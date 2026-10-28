import type { Profile, Project, Status } from './types'
import { URGENCY_RANK } from '../ui/labels'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local date as YYYY-MM-DD (no UTC shift). */
export function todayLocal(now: Date = new Date()): string {
  return fmt(now)
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return fmt(new Date(y, m - 1, d + n))
}

export function isOverdue(p: Project, today: string): boolean {
  return p.due_date !== null && p.status !== 'concluido' && p.due_date < today
}

export function isDueSoon(p: Project, today: string): boolean {
  if (p.due_date === null || p.status === 'concluido') return false
  return p.due_date >= today && p.due_date <= addDays(today, 3)
}

export function stepProgress(p: Project): { done: number; total: number } {
  return { done: p.steps.filter(s => s.done).length, total: p.steps.length }
}

export function sortProjects(ps: Project[]): Project[] {
  return [...ps].sort((a, b) => {
    const u = URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]
    if (u !== 0) return u
    if (a.due_date === b.due_date) return 0
    if (a.due_date === null) return 1
    if (b.due_date === null) return -1
    return a.due_date < b.due_date ? -1 : 1
  })
}

export function filterProjects(
  ps: Project[],
  f: { showDone: boolean; statuses: Status[] | null; mineUserId: string | null },
): Project[] {
  return ps.filter(p => {
    if (!f.showDone && p.status === 'concluido') return false
    if (f.statuses && !f.statuses.includes(p.status)) return false
    if (f.mineUserId && !p.steps.some(s => !s.done && s.assignee_id === f.mineUserId)) return false
    return true
  })
}

export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1000
  if (after === null) return (before as number) + 1000
  if (before === null) return after - 1000
  return (before + after) / 2
}

export function profileLabel(p: Profile): string {
  return p.display_name ? p.display_name : p.email
}
