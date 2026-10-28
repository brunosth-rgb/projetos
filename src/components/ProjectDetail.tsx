import { useEffect, useId, useRef, useState } from 'react'
import type { Profile, Project, Status, Urgency } from '../domain/types'
import { STATUS_LABEL, URGENCY_LABEL } from '../ui/labels'
import type { Actions } from '../state/useProjects'
import { StepChecklist } from './StepChecklist'

interface Props {
  project: Project | null
  profiles: Profile[]
  actions: Actions
  onClose(): void
}

const field =
  'h-9 w-full max-w-[240px] rounded-control border border-control bg-surface px-2.5 text-sm text-ink transition-colors hover:border-faint max-sm:h-11 max-sm:max-w-none'
const STATUSES = Object.keys(STATUS_LABEL) as Status[]
const URGENCIES = Object.keys(URGENCY_LABEL) as Urgency[]

export function ProjectDetail({ project, profiles, actions, onClose }: Props) {
  const creating = project === null
  const dialogRef = useRef<HTMLDivElement>(null)
  const uid = useId()
  const ids = {
    form: `${uid}-form`,
    title: `${uid}-title`,
    status: `${uid}-status`,
    urgency: `${uid}-urgency`,
    due: `${uid}-due`,
    description: `${uid}-desc`,
  }
  const [title, setTitle] = useState(project?.title ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState<Status>(project?.status ?? 'planejado')
  const [urgency, setUrgency] = useState<Urgency>(project?.urgency ?? 'media')
  const [dueDate, setDueDate] = useState(project?.due_date ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  // Last values sent to actions, so flush-on-close followed by blur does not save twice.
  const sent = useRef<{ title?: string; description?: string }>({})

  // Keep fields in sync when the project changes underneath (optimistic update / rollback).
  const pTitle = project?.title
  const pDescription = project?.description
  const pStatus = project?.status
  const pUrgency = project?.urgency
  const pDue = project?.due_date
  useEffect(() => { if (pTitle !== undefined) { setTitle(pTitle); sent.current.title = undefined } }, [pTitle])
  useEffect(() => { if (pDescription !== undefined) { setDescription(pDescription); sent.current.description = undefined } }, [pDescription])
  useEffect(() => { if (pStatus !== undefined) setStatus(pStatus) }, [pStatus])
  useEffect(() => { if (pUrgency !== undefined) setUrgency(pUrgency) }, [pUrgency])
  useEffect(() => { if (pDue !== undefined) setDueDate(pDue ?? '') }, [pDue])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const flushTitle = () => {
    if (!project) return
    const t = title.trim()
    if (t && t !== project.title && t !== sent.current.title) {
      sent.current.title = t
      void actions.editProject(project.id, { title: t })
    }
  }
  const flushDescription = () => {
    if (project && description !== project.description && description !== sent.current.description) {
      sent.current.description = description
      void actions.editProject(project.id, { description })
    }
  }
  const handleClose = () => {
    flushTitle()
    flushDescription()
    onClose()
  }
  const closeRef = useRef(handleClose)
  closeRef.current = handleClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const createDirty =
    creating &&
    (title !== '' || description !== '' || status !== 'planejado' || urgency !== 'media' || dueDate !== '')

  const saveTitle = () => {
    if (!project) return
    if (!title.trim()) {
      setTitle(project.title)
      return
    }
    flushTitle()
    setTitle(title.trim())
  }

  const saveDescription = flushDescription

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      setError('Informe um título para o projeto.')
      return
    }
    void actions.addProject({
      title: t,
      description,
      urgency,
      due_date: dueDate || null,
      status,
    })
    onClose()
  }

  const confirmDelete = () => {
    if (!project) return
    void actions.removeProject(project.id)
    onClose()
  }

  return (
    <div
      className="fade-in fixed inset-0 z-40 flex justify-end bg-scrim"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !createDirty) handleClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
        tabIndex={-1}
        className="sheet-in flex h-full w-[520px] max-w-full flex-col border-l border-border bg-surface shadow-float outline-none max-sm:w-full max-sm:border-l-0"
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-6 max-sm:px-4">
          <h2 id="project-detail-title" className="text-sm font-medium text-muted">
            {creating ? 'Novo projeto' : 'Detalhes do projeto'}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={handleClose}
            className="-mr-2 inline-flex h-9 items-center rounded-control px-2 text-sm font-medium text-ink transition-colors hover:bg-active max-sm:h-11"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-8 max-sm:px-4">
          <form id={ids.form} onSubmit={submit} noValidate>
            <label htmlFor={ids.title} className="sr-only">
              Título
            </label>
            <input
              id={ids.title}
              className="-mx-2 block h-11 w-[calc(100%+1rem)] rounded-control border border-transparent bg-transparent px-2 text-xl font-semibold tracking-[-0.01em] text-ink transition-colors hover:border-border focus:border-control focus-visible:outline-offset-0"
              placeholder="Título do projeto"
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              onBlur={saveTitle}
            />
            {error && (
              <p role="alert" className="mt-1 text-sm text-negative">
                {error}
              </p>
            )}

            <dl className="mt-5 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
              <dt>
                <label htmlFor={ids.status} className="text-sm text-muted">
                  Status
                </label>
              </dt>
              <dd>
                <select
                  id={ids.status}
                  className={field}
                  value={status}
                  onChange={e => {
                    const v = e.target.value as Status
                    setStatus(v)
                    if (project) void actions.editProject(project.id, { status: v })
                  }}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </dd>
              <dt>
                <label htmlFor={ids.urgency} className="text-sm text-muted">
                  Urgência
                </label>
              </dt>
              <dd>
                <select
                  id={ids.urgency}
                  className={field}
                  value={urgency}
                  onChange={e => {
                    const v = e.target.value as Urgency
                    setUrgency(v)
                    if (project) void actions.editProject(project.id, { urgency: v })
                  }}
                >
                  {URGENCIES.map(u => (
                    <option key={u} value={u}>
                      {URGENCY_LABEL[u]}
                    </option>
                  ))}
                </select>
              </dd>
              <dt>
                <label htmlFor={ids.due} className="text-sm text-muted">
                  Prazo
                </label>
              </dt>
              <dd>
                <input
                  id={ids.due}
                  type="date"
                  className={`${field} num`}
                  value={dueDate}
                  onChange={e => {
                    setDueDate(e.target.value)
                    if (project) void actions.editProject(project.id, { due_date: e.target.value || null })
                  }}
                />
              </dd>
            </dl>

            <label htmlFor={ids.description} className="mt-6 mb-1.5 block text-sm text-muted">
              Descrição
            </label>
            <textarea
              id={ids.description}
              className="block w-full resize-y rounded-control border border-control bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-faint"
              rows={4}
              placeholder="Notas, contexto, links"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={saveDescription}
            />
          </form>

          {project && (
            <div className="mt-8">
              <StepChecklist projectId={project.id} steps={project.steps} profiles={profiles} actions={actions} />
            </div>
          )}
        </div>

        <div className="flex min-h-16 shrink-0 items-center border-t border-border px-6 py-3 max-sm:px-4">
          {creating ? (
            <button
              type="submit"
              form={ids.form}
              className="ml-auto inline-flex h-9 items-center rounded-control bg-primary px-4 text-sm font-medium text-primary-ink transition-opacity hover:opacity-85 max-sm:h-11 max-sm:w-full max-sm:justify-center"
            >
              Criar projeto
            </button>
          ) : confirming ? (
            <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label="Confirmação">
              <p className="mr-auto text-sm">Apagar este projeto e seus steps?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="inline-flex h-9 items-center rounded-control border border-control bg-surface px-3 text-sm transition-colors hover:border-faint max-sm:h-11"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex h-9 items-center rounded-control bg-negative px-3 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90 max-sm:h-11"
                >
                  Confirmar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="-ml-2 inline-flex h-9 items-center rounded-control px-2 text-sm font-medium text-negative transition-colors hover:bg-active max-sm:h-11"
            >
              Apagar projeto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
