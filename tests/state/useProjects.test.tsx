import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { Profile, Project, Step } from '../../src/domain/types'

const repo = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listProfiles: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createStep: vi.fn(),
  updateStep: vi.fn(),
  deleteStep: vi.fn(),
}))
const pushToast = vi.hoisted(() => vi.fn())

vi.mock('../../src/data/repo', () => repo)
vi.mock('../../src/ui/Toast', () => ({ useToast: () => ({ pushToast }) }))

import { useProjects } from '../../src/state/useProjects'

function mkProject(over: Partial<Project> = {}): Project {
  return {
    id: 'p1', title: 'A', description: '', status: 'planejado', urgency: 'media',
    due_date: null, position: 1000, created_by: 'u1', created_at: '', updated_at: '',
    completed_at: null, steps: [], ...over,
  }
}
const profile: Profile = { id: 'u1', display_name: 'Ana', email: 'a@x.com' }

async function setup(projects: Project[]) {
  repo.listProjects.mockResolvedValue(projects)
  repo.listProfiles.mockResolvedValue([profile])
  const hook = renderHook(() => useProjects())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useProjects', () => {
  it('carrega projetos e perfis', async () => {
    const { result } = await setup([mkProject()])
    expect(result.current.projects).toHaveLength(1)
    expect(result.current.profiles).toEqual([profile])
    expect(result.current.loadError).toBeNull()
  })

  it('falha no carregamento define loadError', async () => {
    repo.listProjects.mockRejectedValue(new Error('boom'))
    repo.listProfiles.mockResolvedValue([profile])
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.loadError).not.toBeNull()
    expect(result.current.projects).toEqual([])
  })

  it('editProject faz rollback e avisa com retry', async () => {
    const { result } = await setup([mkProject({ title: 'Antigo' })])
    repo.updateProject.mockRejectedValue(new Error('x'))
    await act(() => result.current.actions.editProject('p1', { title: 'Novo' }))
    expect(result.current.projects[0].title).toBe('Antigo')
    expect(pushToast).toHaveBeenCalledTimes(1)
    const toast = pushToast.mock.calls[0][0]
    expect(typeof toast.retry).toBe('function')

    repo.updateProject.mockResolvedValue(undefined)
    await act(async () => { toast.retry() })
    await waitFor(() => expect(result.current.projects[0].title).toBe('Novo'))
  })

  it('editProject aplica otimisticamente e persiste', async () => {
    const { result } = await setup([mkProject()])
    repo.updateProject.mockResolvedValue(undefined)
    await act(() => result.current.actions.editProject('p1', { title: 'Novo' }))
    expect(result.current.projects[0].title).toBe('Novo')
    expect(repo.updateProject).toHaveBeenCalledWith('p1', { title: 'Novo' })
  })

  it('moveProject para concluido define completed_at', async () => {
    const { result } = await setup([mkProject()])
    repo.updateProject.mockResolvedValue(undefined)
    await act(() => result.current.actions.moveProject('p1', 'concluido', null, null))
    const patch = repo.updateProject.mock.calls[0][1]
    expect(patch.status).toBe('concluido')
    expect(patch.completed_at).not.toBeNull()
    expect(result.current.projects[0].status).toBe('concluido')
  })

  it('moveProject saindo de concluido envia completed_at null', async () => {
    const { result } = await setup([
      mkProject({ status: 'concluido', completed_at: '2026-01-01T00:00:00Z' }),
    ])
    repo.updateProject.mockResolvedValue(undefined)
    await act(() => result.current.actions.moveProject('p1', 'em_execucao', null, null))
    expect(repo.updateProject.mock.calls[0][1]).toMatchObject({ status: 'em_execucao', completed_at: null })
  })

  it('moveProject em coluna vazia usa position 1000', async () => {
    const { result } = await setup([mkProject({ position: 5000 })])
    repo.updateProject.mockResolvedValue(undefined)
    await act(() => result.current.actions.moveProject('p1', 'em_execucao', null, null))
    expect(repo.updateProject.mock.calls[0][1].position).toBe(1000)
  })

  it('moveProject entre vizinhos usa a média', async () => {
    const { result } = await setup([
      mkProject({ id: 'p1', status: 'em_execucao', position: 1000 }),
      mkProject({ id: 'p2', status: 'em_execucao', position: 2000 }),
      mkProject({ id: 'p3', status: 'planejado', position: 1000 }),
    ])
    repo.updateProject.mockResolvedValue(undefined)
    await act(() => result.current.actions.moveProject('p3', 'em_execucao', 'p1', 'p2'))
    expect(repo.updateProject.mock.calls[0][1].position).toBe(1500)
  })

  it('addStep anexa ao projeto certo e troca o temporário pelo retorno', async () => {
    const { result } = await setup([mkProject({ id: 'p1' }), mkProject({ id: 'p2' })])
    const step: Step = {
      id: 's1', project_id: 'p2', title: 'T', done: false, position: 1000,
      assignee_id: null, created_at: '',
    }
    repo.createStep.mockResolvedValue(step)
    await act(() => result.current.actions.addStep('p2', 'T'))
    expect(result.current.projects[0].steps).toHaveLength(0)
    expect(result.current.projects[1].steps).toEqual([step])
  })

  it('addStep com falha remove o step e avisa', async () => {
    const { result } = await setup([mkProject()])
    repo.createStep.mockRejectedValue(new Error('x'))
    await act(() => result.current.actions.addStep('p1', 'T'))
    expect(result.current.projects[0].steps).toHaveLength(0)
    expect(pushToast).toHaveBeenCalledWith(expect.objectContaining({ retry: expect.any(Function) }))
  })

  it('addProject com falha remove o temporário', async () => {
    const { result } = await setup([])
    repo.createProject.mockRejectedValue(new Error('x'))
    await act(() =>
      result.current.actions.addProject({
        title: 'N', urgency: 'baixa', due_date: null, status: 'planejado', position: 1000,
      }),
    )
    expect(result.current.projects).toHaveLength(0)
    expect(pushToast).toHaveBeenCalled()
  })

  it('falha em uma ação não desfaz outra ação bem-sucedida', async () => {
    const { result } = await setup([mkProject({ id: 'p1' }), mkProject({ id: 'p2' })])
    let rejectA!: (e: Error) => void
    repo.updateProject.mockImplementation((id: string) =>
      id === 'p1' ? new Promise((_, rej) => { rejectA = rej }) : Promise.resolve(),
    )
    let a!: Promise<void>
    act(() => { a = result.current.actions.editProject('p1', { title: 'X' }) })
    await act(() => result.current.actions.editProject('p2', { title: 'Y' }))
    await act(async () => { rejectA(new Error('x')); await a })
    expect(result.current.projects[0].title).toBe('A')
    expect(result.current.projects[1].title).toBe('Y')
  })

  it('removeProject faz rollback preservando a ordem', async () => {
    const { result } = await setup([mkProject({ id: 'p1' }), mkProject({ id: 'p2', position: 2000 })])
    repo.deleteProject.mockRejectedValue(new Error('x'))
    await act(() => result.current.actions.removeProject('p1'))
    expect(result.current.projects.map(p => p.id)).toEqual(['p1', 'p2'])
  })

  it('editStep e removeStep fazem rollback', async () => {
    const step: Step = {
      id: 's1', project_id: 'p1', title: 'T', done: false, position: 1000,
      assignee_id: null, created_at: '',
    }
    const { result } = await setup([mkProject({ steps: [step] })])
    repo.updateStep.mockRejectedValue(new Error('x'))
    await act(() => result.current.actions.editStep('s1', { done: true }))
    expect(result.current.projects[0].steps[0].done).toBe(false)
    repo.deleteStep.mockRejectedValue(new Error('x'))
    await act(() => result.current.actions.removeStep('s1'))
    expect(result.current.projects[0].steps).toHaveLength(1)
    expect(pushToast).toHaveBeenCalledTimes(2)
  })
})
