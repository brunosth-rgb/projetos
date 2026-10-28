import { addDays, isOverdue } from './projects'
import type { Project } from './types'
import { URGENCY_RANK } from '../ui/labels'

export const DEADLINE_DAYS = 7

function byUrgencyThenTitle(a: Project, b: Project): number {
  const u = URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]
  if (u !== 0) return u
  return a.title.localeCompare(b.title, 'pt-BR')
}

/**
 * Projects due in the next 7 days (today + 6) bucketed by day, plus the overdue ones.
 * Concluded projects and projects without a due date are left out. Inside each bucket:
 * most urgent first, then by title.
 */
export function upcomingDeadlines(
  projects: Project[],
  today: string,
): { overdue: Project[]; days: { date: string; projects: Project[] }[] } {
  const days = Array.from({ length: DEADLINE_DAYS }, (_, i) => ({ date: addDays(today, i), projects: [] as Project[] }))
  const byDate = new Map(days.map(d => [d.date, d.projects]))
  const overdue: Project[] = []
  for (const p of projects) {
    if (p.status === 'concluido' || p.due_date === null) continue
    if (isOverdue(p, today)) overdue.push(p)
    else byDate.get(p.due_date)?.push(p)
  }
  overdue.sort(byUrgencyThenTitle)
  for (const d of days) d.projects.sort(byUrgencyThenTitle)
  return { overdue, days }
}
