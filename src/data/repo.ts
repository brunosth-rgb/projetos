import { supabase } from '../lib/supabase'
import type { NewProjectInput, Profile, Project, Step } from '../domain/types'

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, steps(*)')
    .order('position')
    .order('position', { referencedTable: 'steps' })
  check(error)
  return (data ?? []) as Project[]
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*')
  check(error)
  return (data ?? []) as Profile[]
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(input)
    .select('*, steps(*)')
    .single()
  check(error)
  return data as Project
}

export async function updateProject(
  id: string,
  patch: Partial<
    Pick<Project, 'title' | 'description' | 'status' | 'urgency' | 'due_date' | 'position' | 'completed_at'>
  >,
): Promise<void> {
  const { error } = await supabase.from('projects').update(patch).eq('id', id)
  check(error)
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  check(error)
}

export async function createStep(projectId: string, title: string, position: number): Promise<Step> {
  const { data, error } = await supabase
    .from('steps')
    .insert({ project_id: projectId, title, position })
    .select('*')
    .single()
  check(error)
  return data as Step
}

export async function updateStep(
  id: string,
  patch: Partial<Pick<Step, 'title' | 'done' | 'position' | 'assignee_id'>>,
): Promise<void> {
  const { error } = await supabase.from('steps').update(patch).eq('id', id)
  check(error)
}

export async function deleteStep(id: string): Promise<void> {
  const { error } = await supabase.from('steps').delete().eq('id', id)
  check(error)
}
