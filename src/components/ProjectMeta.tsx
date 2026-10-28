import type { CSSProperties } from 'react'
import type { Profile, Project, Urgency } from '../domain/types'
import { isDueSoon, isOverdue, profileLabel, stepProgress } from '../domain/projects'
import { dueLabel } from '../domain/dates'
import { initials, personHues } from '../domain/people'
import { URGENCY_LABEL } from '../ui/labels'

/** YYYY-MM-DD -> dd/mm/yyyy without Date parsing. */
export function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function pendingAssignees(project: Project, profiles: Profile[]): string[] {
  return pendingProfiles(project, profiles).map(profileLabel)
}

/** Profiles with at least one pending step in the project, deduplicated, in step order. */
export function pendingProfiles(project: Project, profiles: Profile[]): Profile[] {
  const seen = new Map<string, Profile>()
  for (const s of project.steps) {
    if (s.done || !s.assignee_id || seen.has(s.assignee_id)) continue
    const p = profiles.find(x => x.id === s.assignee_id)
    if (p) seen.set(p.id, p)
  }
  return [...seen.values()]
}

// Marker weight grows with urgency; the word is always next to it, so colour is never alone.
const MARKER: Record<Urgency, string> = {
  baixa: 'rounded-full border border-muted',
  media: 'rounded-full bg-muted',
  alta: 'rounded-full bg-ink',
  critica: 'rounded-[2px] bg-negative',
}

export function UrgencyMark({ urgency }: { urgency: Urgency }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span aria-hidden="true" className={`size-2 shrink-0 ${MARKER[urgency]}`} />
      <span className={urgency === 'baixa' ? 'text-muted' : 'text-ink'}>{URGENCY_LABEL[urgency]}</span>
    </span>
  )
}

export function DueText({ project, today, align = 'start' }: { project: Project; today: string; align?: 'start' | 'end' }) {
  const d = dueLabel(project.due_date, today)
  if (!project.due_date) return <span className="text-sm whitespace-nowrap text-muted">Sem prazo</span>
  const tone = isOverdue(project, today) ? 'text-negative' : isDueSoon(project, today) ? 'text-warning' : 'text-muted'
  return (
    <span
      className={`num inline-flex items-baseline gap-1.5 text-sm whitespace-nowrap ${align === 'end' ? 'justify-end' : ''}`}
      title={formatDate(project.due_date)}
    >
      <span className="text-ink">{d.date}</span>
      <span className={tone}>{d.relative}</span>
    </span>
  )
}

export function Progress({ project, className = '' }: { project: Project; className?: string }) {
  const { done, total } = stepProgress(project)
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden="true" className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-border">
        <span className="block h-full rounded-full bg-data" style={{ width: `${pct}%` }} />
      </span>
      <span className={`num min-w-[2.25rem] text-right text-sm ${total === 0 ? 'text-muted' : 'text-ink'}`}>
        <span className="sr-only">Progresso dos steps: </span>
        {`${done}/${total}`}
      </span>
    </span>
  )
}

export function Initials({ profile, hue, size = 24 }: { profile: Profile; hue: number | undefined; size?: 20 | 24 }) {
  const label = profileLabel(profile)
  return (
    <span
      title={label}
      style={{ '--hue': hue } as CSSProperties}
      className={`tint inline-flex shrink-0 items-center justify-center rounded-full font-medium ${
        size === 24 ? 'size-6 text-[11px]' : 'size-5 text-[11px]'
      }`}
    >
      <span aria-hidden="true">{initials(label)}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** Initials circles for people with pending steps; full names stay in title and in sr-only text. */
export function Assignees({ project, profiles }: { project: Project; profiles: Profile[] }) {
  const people = pendingProfiles(project, profiles)
  if (people.length === 0) return null
  const hues = personHues(profiles)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="sr-only">Responsáveis: </span>
      {people.map((p, i) => (
        <span key={p.id} className="inline-flex">
          <Initials profile={p} hue={hues.get(p.id)} />
          {i < people.length - 1 && <span className="sr-only">, </span>}
        </span>
      ))}
    </span>
  )
}

/** Stacked meta for the kanban card: urgency and due on one line, progress and people on the next. */
export function ProjectMeta({
  project,
  profiles,
  today,
}: {
  project: Project
  profiles: Profile[]
  today: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <UrgencyMark urgency={project.urgency} />
        <DueText project={project} today={today} align="end" />
      </div>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <Progress project={project} />
        <Assignees project={project} profiles={profiles} />
      </div>
    </div>
  )
}
