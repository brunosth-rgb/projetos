// Dev-only in-memory stand-in for src/data/repo.ts (wired by vite.preview.config.ts; never in the deploy build).
// ?empty starts with no projects. Data resets on reload.
import type * as Repo from '../src/data/repo'
import type { NewProjectInput, Profile, Project, Step } from '../src/domain/types'
import { PEOPLE, sampleProjects } from './sample-data'

const empty = new URLSearchParams(window.location.search).has('empty')
let projects: Project[] = empty ? [] : sampleProjects()

const delay = () => new Promise(r => setTimeout(r, 120))
const clone = <T,>(v: T): T => structuredClone(v)
const now = () => new Date().toISOString()

function byPositionThenCreated(a: Project, b: Project) {
  if (a.position !== b.position) return a.position - b.position
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
}

function findStep(id: string): Step | undefined {
  for (const p of projects) {
    const s = p.steps.find(x => x.id === id)
    if (s) return s
  }
  return undefined
}

export async function listProjects(): Promise<Project[]> {
  await delay()
  return clone(projects)
    .sort(byPositionThenCreated)
    .map(p => ({ ...p, steps: [...p.steps].sort((a, b) => a.position - b.position) }))
}

export async function listProfiles(): Promise<Profile[]> {
  await delay()
  return clone(PEOPLE)
}

export async function createProject(input: NewProjectInput & { position: number }): Promise<Project> {
  await delay()
  const t = now()
  const p: Project = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description ?? '',
    status: input.status,
    urgency: input.urgency,
    due_date: input.due_date,
    position: input.position,
    created_by: PEOPLE[0].id,
    created_at: t,
    updated_at: t,
    completed_at: null,
    steps: [],
  }
  projects.push(p)
  return clone(p)
}

export async function updateProject(id: string, patch: Parameters<typeof Repo.updateProject>[1]): Promise<void> {
  await delay()
  const p = projects.find(x => x.id === id)
  if (p) Object.assign(p, patch, { updated_at: now() })
}

export async function deleteProject(id: string): Promise<void> {
  await delay()
  projects = projects.filter(p => p.id !== id)
}

export async function createStep(projectId: string, title: string, position: number): Promise<Step> {
  await delay()
  const p = projects.find(x => x.id === projectId)
  if (!p) throw new Error('Projeto não encontrado')
  const s: Step = {
    id: crypto.randomUUID(),
    project_id: projectId,
    title,
    done: false,
    position,
    assignee_id: null,
    created_at: now(),
  }
  p.steps.push(s)
  return clone(s)
}

export async function updateStep(id: string, patch: Parameters<typeof Repo.updateStep>[1]): Promise<void> {
  await delay()
  const s = findStep(id)
  if (s) Object.assign(s, patch)
}

export async function deleteStep(id: string): Promise<void> {
  await delay()
  for (const p of projects) p.steps = p.steps.filter(s => s.id !== id)
}

// Compile-time check: this module must expose the same functions and signatures as src/data/repo.ts.
export const signatures = {
  listProjects,
  listProfiles,
  createProject,
  updateProject,
  deleteProject,
  createStep,
  updateStep,
  deleteStep,
} satisfies typeof Repo
