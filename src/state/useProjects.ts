import { useCallback, useEffect, useRef, useState } from 'react'
import * as repo from '../data/repo'
import { positionBetween } from '../domain/projects'
import type { NewProjectInput, Profile, Project, Status, Step } from '../domain/types'
import { useToast } from '../ui/Toast'

type ProjectPatch = Parameters<typeof repo.updateProject>[1]
type StepPatch = Parameters<typeof repo.updateStep>[1]

export interface Actions {
  addProject(input: NewProjectInput): Promise<void>
  editProject(id: string, patch: ProjectPatch): Promise<void>
  moveProject(id: string, status: Status, beforeId: string | null, afterId: string | null): Promise<void>
  removeProject(id: string): Promise<void>
  addStep(projectId: string, title: string): Promise<void>
  editStep(stepId: string, patch: StepPatch): Promise<void>
  removeStep(stepId: string): Promise<void>
}

export interface UseProjects {
  projects: Project[]
  profiles: Profile[]
  loading: boolean
  loadError: string | null
  reload(): Promise<void>
  actions: Actions
}

const SAVE_ERROR = 'Não foi possível salvar. Tente de novo.'

let tempCounter = 0
const tempId = () => `tmp-${++tempCounter}`

// Restores only the fields a patch touched, so unrelated concurrent changes survive.
function pickPrev<T extends object>(entity: T, patch: Partial<T>): Partial<T> {
  const prev: Partial<T> = {}
  for (const key of Object.keys(patch) as (keyof T)[]) prev[key] = entity[key]
  return prev
}

export function useProjects(): UseProjects {
  const { pushToast } = useToast()
  const [projects, setProjectsState] = useState<Project[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Mirror of the state, updated synchronously so back-to-back actions see each other's changes.
  const ref = useRef<Project[]>([])
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const update = useCallback((fn: (prev: Project[]) => Project[]) => {
    ref.current = fn(ref.current)
    if (mounted.current) setProjectsState(ref.current)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [ps, prof] = await Promise.all([repo.listProjects(), repo.listProfiles()])
      if (!mounted.current) return
      ref.current = ps
      setProjectsState(ps)
      setProfiles(prof)
    } catch {
      if (!mounted.current) return
      ref.current = []
      setProjectsState([])
      setLoadError('Não foi possível carregar os projetos.')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Applies the change locally, persists, and on failure runs `undo` and toasts with a retry.
  async function optimistic(
    apply: () => void,
    persist: () => Promise<void>,
    errorMessage: string,
    undo: () => void,
    retry: () => void,
  ): Promise<void> {
    apply()
    try {
      await persist()
    } catch {
      undo()
      pushToast({ message: errorMessage, retry })
    }
  }

  const findStep = (stepId: string): { project: Project; step: Step } | null => {
    for (const project of ref.current) {
      const step = project.steps.find(s => s.id === stepId)
      if (step) return { project, step }
    }
    return null
  }

  const patchProject = (id: string, patch: Partial<Project>) =>
    update(list => list.map(p => (p.id === id ? { ...p, ...patch } : p)))

  const patchStep = (stepId: string, patch: Partial<Step>) =>
    update(list =>
      list.map(p => ({ ...p, steps: p.steps.map(s => (s.id === stepId ? { ...s, ...patch } : s)) })),
    )

  const addProject: Actions['addProject'] = async input => {
    const id = tempId()
    const now = new Date().toISOString()
    const temp: Project = {
      id,
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      urgency: input.urgency,
      due_date: input.due_date,
      position: input.position,
      created_by: '',
      created_at: now,
      updated_at: now,
      completed_at: null,
      steps: [],
    }
    await optimistic(
      () => update(list => [...list, temp]),
      async () => {
        const created = await repo.createProject(input)
        update(list => list.map(p => (p.id === id ? created : p)))
      },
      SAVE_ERROR,
      () => update(list => list.filter(p => p.id !== id)),
      () => void addProject(input),
    )
  }

  const editProject: Actions['editProject'] = async (id, patch) => {
    const current = ref.current.find(p => p.id === id)
    if (!current) return
    const prev = pickPrev(current, patch)
    await optimistic(
      () => patchProject(id, patch),
      () => repo.updateProject(id, patch),
      SAVE_ERROR,
      () => patchProject(id, prev),
      () => void editProject(id, patch),
    )
  }

  const moveProject: Actions['moveProject'] = async (id, status, beforeId, afterId) => {
    const current = ref.current.find(p => p.id === id)
    if (!current) return
    const posOf = (pid: string | null) =>
      pid === null ? null : (ref.current.find(p => p.id === pid)?.position ?? null)
    const patch: ProjectPatch = {
      status,
      position: positionBetween(posOf(beforeId), posOf(afterId)),
      completed_at:
        status === 'concluido'
          ? current.status === 'concluido' && current.completed_at
            ? current.completed_at
            : new Date().toISOString()
          : null,
    }
    const prev = pickPrev(current, patch)
    await optimistic(
      () => patchProject(id, patch),
      () => repo.updateProject(id, patch),
      SAVE_ERROR,
      () => patchProject(id, prev),
      () => void moveProject(id, status, beforeId, afterId),
    )
  }

  const removeProject: Actions['removeProject'] = async id => {
    const index = ref.current.findIndex(p => p.id === id)
    if (index < 0) return
    const removed = ref.current[index]
    await optimistic(
      () => update(list => list.filter(p => p.id !== id)),
      () => repo.deleteProject(id),
      SAVE_ERROR,
      () =>
        update(list => {
          const copy = [...list]
          copy.splice(Math.min(index, copy.length), 0, removed)
          return copy
        }),
      () => void removeProject(id),
    )
  }

  const addStep: Actions['addStep'] = async (projectId, title) => {
    const project = ref.current.find(p => p.id === projectId)
    if (!project) return
    const last = project.steps.length ? project.steps[project.steps.length - 1].position : null
    const position = positionBetween(last, null)
    const id = tempId()
    const temp: Step = {
      id,
      project_id: projectId,
      title,
      done: false,
      position,
      assignee_id: null,
      created_at: new Date().toISOString(),
    }
    const mapSteps = (fn: (steps: Step[]) => Step[]) =>
      update(list => list.map(p => (p.id === projectId ? { ...p, steps: fn(p.steps) } : p)))
    await optimistic(
      () => mapSteps(steps => [...steps, temp]),
      async () => {
        const created = await repo.createStep(projectId, title, position)
        mapSteps(steps => steps.map(s => (s.id === id ? created : s)))
      },
      SAVE_ERROR,
      () => mapSteps(steps => steps.filter(s => s.id !== id)),
      () => void addStep(projectId, title),
    )
  }

  const editStep: Actions['editStep'] = async (stepId, patch) => {
    const found = findStep(stepId)
    if (!found) return
    const prev = pickPrev(found.step, patch)
    await optimistic(
      () => patchStep(stepId, patch),
      () => repo.updateStep(stepId, patch),
      SAVE_ERROR,
      () => patchStep(stepId, prev),
      () => void editStep(stepId, patch),
    )
  }

  const removeStep: Actions['removeStep'] = async stepId => {
    const found = findStep(stepId)
    if (!found) return
    const { project, step } = found
    const index = project.steps.findIndex(s => s.id === stepId)
    const mapSteps = (fn: (steps: Step[]) => Step[]) =>
      update(list => list.map(p => (p.id === project.id ? { ...p, steps: fn(p.steps) } : p)))
    await optimistic(
      () => mapSteps(steps => steps.filter(s => s.id !== stepId)),
      () => repo.deleteStep(stepId),
      SAVE_ERROR,
      () =>
        mapSteps(steps => {
          const copy = [...steps]
          copy.splice(Math.min(index, copy.length), 0, step)
          return copy
        }),
      () => void removeStep(stepId),
    )
  }

  return {
    projects,
    profiles,
    loading,
    loadError,
    reload,
    actions: { addProject, editProject, moveProject, removeProject, addStep, editStep, removeStep },
  }
}
