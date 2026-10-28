import type { Profile, Project, Status } from '../domain/types'
import { isDueSoon, isOverdue, sortProjects } from '../domain/projects'
import { STATUS_LABEL } from '../ui/labels'
import { Assignees, DueText, Progress, UrgencyMark } from './ProjectMeta'

// One grid for the header and the rows: Projeto | Urgência | Prazo | Progresso | Responsáveis.
// The last three are right-aligned so the figures share one right edge.
const GRID = 'sm:grid-cols-[minmax(0,1fr)_96px_136px_112px_84px] sm:gap-x-3'

function StatusTag({ status }: { status: Status }) {
  if (status === 'em_execucao')
    return (
      <span className="shrink-0 rounded-[4px] bg-pill-neutral-bg px-1.5 text-xs leading-[18px] whitespace-nowrap text-pill-neutral-ink">
        {STATUS_LABEL[status]}
      </span>
    )
  return <span className="shrink-0 text-xs whitespace-nowrap text-muted">{STATUS_LABEL[status]}</span>
}

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
    return (
      <div className="rounded-card border border-border bg-surface px-6 py-12 text-center text-sm text-muted">
        Nenhum projeto encontrado.
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div
        aria-hidden="true"
        className={`grid h-10 items-center border-b border-border px-4 text-xs text-muted max-sm:hidden ${GRID}`}
      >
        <span>Projeto</span>
        <span>Urgência</span>
        <span className="text-right">Prazo</span>
        <span className="text-right">Progresso</span>
        <span className="text-right">Responsáveis</span>
      </div>
      <ul>
        {sortProjects(projects).map(p => {
          const state = isOverdue(p, today) ? 'overdue' : isDueSoon(p, today) ? 'due-soon' : undefined
          return (
            <li key={p.id} data-state={state} className="border-b border-rule last:border-b-0">
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2 text-left transition-colors hover:bg-active focus-visible:-outline-offset-2 max-sm:min-h-14 max-sm:py-3 sm:min-h-12 ${GRID}`}
              >
                <span className="flex min-w-0 flex-col gap-0.5 sm:col-start-1 sm:row-start-1">
                  <span className="font-medium max-sm:line-clamp-2 sm:truncate">{p.title}</span>
                  {/* Status and description share the subline (phones keep two lines and drop it). */}
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted max-sm:hidden">
                    <StatusTag status={p.status} />
                    {p.description && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{p.description}</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="justify-self-end sm:col-start-3 sm:row-start-1">
                  <DueText project={p} today={today} align="end" />
                </span>
                {/* Phone: urgency, progress and people share the second line. Wider: each is a grid cell. */}
                <span className="col-span-2 flex items-center gap-4 sm:contents">
                  <span className="sm:col-start-2 sm:row-start-1">
                    <UrgencyMark urgency={p.urgency} />
                  </span>
                  <span className="sm:col-start-4 sm:row-start-1 sm:justify-self-end">
                    <Progress project={p} />
                  </span>
                  <span className="ml-auto flex sm:col-start-5 sm:row-start-1 sm:ml-0 sm:justify-self-end">
                    <Assignees project={p} profiles={profiles} />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
