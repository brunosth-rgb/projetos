import { useEffect, useState } from 'react'
import { useAuth } from './auth/AuthProvider'
import { Header, type Filters, type View } from './components/Header'
import { TopBar } from './components/TopBar'
import { KanbanView } from './components/KanbanView'
import { ListView } from './components/ListView'
import { ProjectDetail } from './components/ProjectDetail'
import { filterProjects, profileLabel, todayLocal } from './domain/projects'
import { projectFinding } from './domain/summary'
import type { Status } from './domain/types'
import { useProjects } from './state/useProjects'

const VIEW_KEY = 'gp.view'
const FILTERS_KEY = 'gp.filters'
const DEFAULT_FILTERS: Filters = { showDone: false, statuses: null, mine: false }
const STATUSES: Status[] = ['planejado', 'em_execucao', 'concluido']

function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage blocked or full: persistence is best-effort
  }
}

function loadView(): View {
  const v = readStored(VIEW_KEY)
  return v === 'lista' || v === 'kanban' ? v : 'lista'
}

function loadFilters(): Filters {
  const f = readStored(FILTERS_KEY) as Partial<Filters> | null | undefined
  if (!f || typeof f !== 'object') return DEFAULT_FILTERS
  const statuses =
    Array.isArray(f.statuses) && f.statuses.length === 1 && STATUSES.includes(f.statuses[0]) ? f.statuses : null
  return {
    showDone: typeof f.showDone === 'boolean' ? f.showDone : false,
    statuses,
    mine: typeof f.mine === 'boolean' ? f.mine : false,
  }
}

export default function App() {
  const { user, signOut } = useAuth()
  const { projects, profiles, loading, loadError, reload, actions } = useProjects()
  const [view, setView] = useState<View>(loadView)
  const [filters, setFilters] = useState<Filters>(loadFilters)
  // undefined = closed, null = creating, string = project id
  const [openId, setOpenId] = useState<string | null | undefined>(undefined)
  const [today, setToday] = useState(todayLocal)
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => writeStored(VIEW_KEY, view), [view])
  useEffect(() => writeStored(FILTERS_KEY, filters), [filters])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const visible = () => {
      if (document.visibilityState === 'hidden') return
      setToday(todayLocal())
      void reload()
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [reload])

  const openProject = typeof openId === 'string' ? (projects.find(p => p.id === openId) ?? null) : null
  const missing = typeof openId === 'string' && !openProject && !loading
  useEffect(() => {
    if (missing) setOpenId(undefined)
  }, [missing])

  const mineUserId = filters.mine && user ? user.id : null
  const visibleProjects = filterProjects(projects, {
    showDone: filters.showDone,
    statuses: filters.statuses,
    mineUserId,
  })
  // The kanban always shows every column in full; only "Meus steps" applies there.
  const kanbanProjects = filterProjects(projects, { showDone: true, statuses: null, mineUserId })

  const ownProfile = user ? profiles.find(p => p.id === user.id) : undefined
  const meta = (user?.user_metadata ?? {}) as { display_name?: unknown }
  const userLabel = ownProfile
    ? profileLabel(ownProfile)
    : typeof meta.display_name === 'string' && meta.display_name
      ? meta.display_name
      : (user?.email ?? '')
  const finding = loadError || (loading && projects.length === 0) ? '' : projectFinding(projects, today)

  return (
    <div className="min-h-screen bg-ground text-ink">
      <TopBar userLabel={userLabel} onSignOut={() => void signOut()} />
      {!online && (
        <div role="status" className="border-b border-pill-warning-border bg-pill-warning-bg text-sm text-pill-warning-ink">
          <div className="mx-auto max-w-[1200px] px-6 py-2 max-sm:px-4">Sem conexão: alterações não estão sendo salvas</div>
        </div>
      )}
      <div className="mx-auto max-w-[1200px] px-6 pt-8 pb-16 max-sm:px-4 max-sm:pt-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">Projetos</h1>
            <p className="num mt-1 min-h-5 text-sm text-muted">{finding}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="inline-flex h-9 shrink-0 items-center rounded-control bg-primary px-4 text-sm font-medium text-primary-ink transition-opacity hover:opacity-85 active:opacity-75 max-sm:h-11"
          >
            Novo projeto
          </button>
        </div>
        <Header view={view} onViewChange={setView} filters={filters} onFiltersChange={setFilters} />
        <main className="mt-5">
          {loadError ? (
            <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
              <p className="mb-4 text-sm">Não foi possível carregar os projetos</p>
              <button
                type="button"
                onClick={() => void reload()}
                className="inline-flex h-9 items-center rounded-control border border-control bg-surface px-3 text-sm transition-colors hover:border-faint max-sm:h-11"
              >
                Recarregar
              </button>
            </div>
          ) : loading && projects.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">Carregando…</p>
          ) : view === 'lista' ? (
            <ListView projects={visibleProjects} profiles={profiles} today={today} onOpen={setOpenId} />
          ) : (
            <KanbanView
              projects={kanbanProjects}
              profiles={profiles}
              today={today}
              onOpen={setOpenId}
              onMove={(id, status, b, a) => void actions.moveProject(id, status, b, a)}
            />
          )}
        </main>
      </div>
      {(openId === null || openProject) && (
        <ProjectDetail
          key={openId ?? 'new'}
          project={openProject}
          profiles={profiles}
          actions={actions}
          onClose={() => setOpenId(undefined)}
        />
      )}
    </div>
  )
}
