import { useEffect, useRef, useState } from 'react'
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

const field = 'w-full rounded border border-slate-300 px-2 py-2'
const label = 'block space-y-1 text-sm font-medium'
const STATUSES = Object.keys(STATUS_LABEL) as Status[]
const URGENCIES = Object.keys(URGENCY_LABEL) as Urgency[]

export function ProjectDetail({ project, profiles, actions, onClose }: Props) {
  const creating = project === null
  const dialogRef = useRef<HTMLDivElement>(null)
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
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center"
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
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white p-4 shadow-xl outline-none sm:max-w-xl sm:rounded-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="project-detail-title" className="text-lg font-semibold">
            {creating ? 'Novo projeto' : 'Detalhes do projeto'}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={handleClose}
            className="min-h-9 min-w-9 rounded hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3" noValidate>
          <label className={label}>
            Título
            <input
              className={field}
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              onBlur={saveTitle}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <label className={label}>
            Descrição
            <textarea
              className={field}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={saveDescription}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={label}>
              Status
              <select
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
            </label>
            <label className={label}>
              Urgência
              <select
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
            </label>
            <label className={label}>
              Prazo
              <input
                type="date"
                className={field}
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value)
                  if (project) void actions.editProject(project.id, { due_date: e.target.value || null })
                }}
              />
            </label>
          </div>

          {creating && (
            <button type="submit" className="min-h-10 w-full rounded bg-blue-600 px-4 py-2 text-white">
              Criar projeto
            </button>
          )}
        </form>

        {project && (
          <>
            <div className="mt-4">
              <StepChecklist projectId={project.id} steps={project.steps} profiles={profiles} actions={actions} />
            </div>
            <div className="mt-6 border-t pt-4">
              {confirming ? (
                <div className="space-y-2" role="group" aria-label="Confirmação">
                  <p className="text-sm">Apagar este projeto e seus steps?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="min-h-10 rounded bg-red-600 px-4 py-2 text-white"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="min-h-10 rounded border border-slate-300 px-4 py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="min-h-10 rounded border border-red-300 px-4 py-2 text-red-700"
                >
                  Apagar projeto
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
