import { useEffect, useState } from 'react'
import { useAuth } from './auth/AuthProvider'
import { Header, type Filters, type View } from './components/Header'
import { KanbanView } from './components/KanbanView'
import { ListView } from './components/ListView'
import { ProjectDetail } from './components/ProjectDetail'
import { filterProjects, todayLocal } from './domain/projects'
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

  const visibleProjects = filterProjects(projects, {
    showDone: filters.showDone,
    statuses: filters.statuses,
    mineUserId: filters.mine && user ? user.id : null,
  })

  return (
    <div className="min-h-screen">
      <h1 className="px-3 pt-3 text-2xl font-semibold">Gerenciador de Projetos</h1>
      {!online && (
        <div role="status" className="bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Sem conexão: alterações não estão sendo salvas
        </div>
      )}
      <Header
        view={view}
        onViewChange={setView}
        filters={filters}
        onFiltersChange={setFilters}
        onNew={() => setOpenId(null)}
        onSignOut={() => void signOut()}
      />
      <main className="p-3">
        {loadError ? (
          <div className="p-6 text-center">
            <p className="mb-3">Não foi possível carregar os projetos</p>
            <button type="button" onClick={() => void reload()} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Recarregar
            </button>
          </div>
        ) : loading && projects.length === 0 ? (
          <p className="p-6 text-sm text-slate-600">Carregando…</p>
        ) : view === 'lista' ? (
          <ListView projects={visibleProjects} profiles={profiles} today={today} onOpen={setOpenId} />
        ) : (
          <KanbanView
            projects={visibleProjects}
            profiles={profiles}
            today={today}
            onOpen={setOpenId}
            onMove={(id, status, b, a) => void actions.moveProject(id, status, b, a)}
          />
        )}
      </main>
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
