import type { Profile, Project } from '../domain/types'
import { isDueSoon, isOverdue, sortProjects } from '../domain/projects'
import { STATUS_LABEL } from '../ui/labels'
import { ProjectMeta } from './ProjectMeta'

export function ListView({
  projects,
  profiles,
  today,
  onOpen,
}: {
  projects: Project[]
  profiles: Profile[]
  today: string
  onOpen: (id: string) => void
}) {
  if (projects.length === 0) {
    return <p className="p-6 text-center text-slate-600">Nenhum projeto encontrado.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {sortProjects(projects).map(p => {
        const state = isOverdue(p, today) ? 'overdue' : isDueSoon(p, today) ? 'due-soon' : undefined
        const highlight =
          state === 'overdue'
            ? 'border-red-500 bg-red-50'
            : state === 'due-soon'
              ? 'border-amber-500 bg-amber-50'
              : 'border-slate-200 bg-white'
        return (
          <li key={p.id} data-state={state} className={`rounded border-l-4 border ${highlight}`}>
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className="flex w-full flex-col gap-1 p-3 text-left sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium">
                {p.title} <span className="text-xs font-normal text-slate-500">{STATUS_LABEL[p.status]}</span>
              </span>
              <ProjectMeta project={p} profiles={profiles} today={today} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
