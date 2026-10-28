import { isDueSoon, isOverdue } from './projects'
import type { Project } from './types'

function overduePhrase(n: number): string {
  return n === 1 ? '1 atrasado' : `${n} atrasados`
}

function soonPhrase(n: number): string {
  return n === 1 ? '1 vence em até 3 dias' : `${n} vencem em até 3 dias`
}

/** One-line finding for the title row. Counts exclude concluded projects. */
export function projectFinding(projects: Project[], today: string): string {
  if (projects.length === 0) return 'Nenhum projeto ainda.'
  const overdue = projects.filter(p => isOverdue(p, today)).length
  const soon = projects.filter(p => isDueSoon(p, today)).length
  if (overdue > 0 && soon > 0) return `${overduePhrase(overdue)} · ${soonPhrase(soon)}`
  if (overdue > 0) return overduePhrase(overdue)
  if (soon > 0) return `Nada atrasado. ${soonPhrase(soon)}.`
  return 'Nada atrasado e nada vence nos próximos 3 dias.'
}
