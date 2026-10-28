import type { Profile, Project, Urgency } from '../domain/types'
import { profileLabel, stepProgress } from '../domain/projects'
import { URGENCY_LABEL } from '../ui/labels'

const URGENCY_CLASS: Record<Urgency, string> = {
  critica: 'bg-red-100 text-red-800 border-red-300',
  alta: 'bg-orange-100 text-orange-800 border-orange-300',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  baixa: 'bg-slate-100 text-slate-700 border-slate-300',
}

/** YYYY-MM-DD -> dd/mm/yyyy without Date parsing. */
export function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function pendingAssignees(project: Project, profiles: Profile[]): string[] {
  const labels = new Set<string>()
  for (const s of project.steps) {
    if (s.done || !s.assignee_id) continue
    const p = profiles.find(x => x.id === s.assignee_id)
    if (p) labels.add(profileLabel(p))
  }
  return [...labels]
}

export function ProjectMeta({
  project,
  profiles,
}: {
  project: Project
  profiles: Profile[]
  today: string
}) {
  const { done, total } = stepProgress(project)
  const assignees = pendingAssignees(project, profiles)
  return (
    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <span className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium ${URGENCY_CLASS[project.urgency]}`}>
        {URGENCY_LABEL[project.urgency]}
      </span>
      <span>{project.due_date ? formatDate(project.due_date) : 'Sem prazo'}</span>
      <span aria-label="Progresso dos steps">{`${done}/${total}`}</span>
      {assignees.length > 0 && <span className="text-slate-600">{assignees.join(', ')}</span>}
    </div>
  )
}
