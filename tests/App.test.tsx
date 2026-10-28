import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import type { Project, Step } from '../src/domain/types'

const reload = vi.fn()
const signOut = vi.fn()
const state = vi.hoisted(() => ({ projects: [] as unknown[], loadError: null as string | null, loading: false }))

vi.mock('../src/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' }, loading: false, signIn: vi.fn(), signOut }),
}))
vi.mock('../src/state/useProjects', () => ({
  useProjects: () => ({
    projects: state.projects,
    profiles: [],
    loading: state.loading,
    loadError: state.loadError,
    reload,
    actions: {},
  }),
}))

function mk(id: string, steps: Step[] = []): Project {
  return {
    id, title: id, description: '', status: 'em_execucao', urgency: 'media', due_date: null,
    position: 1, created_by: 'u1', created_at: '', updated_at: '', completed_at: null, steps,
  }
}
const step = (id: string, assignee: string | null): Step => ({
  id, project_id: 'p', title: id, done: false, position: 1, assignee_id: assignee, created_at: '',
})

beforeEach(() => {
  localStorage.clear()
  reload.mockClear()
  signOut.mockClear()
  state.projects = []
  state.loadError = null
  state.loading = false
})

describe('App', () => {
  it('mostra o título e chama signOut', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Gerenciador de Projetos' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(signOut).toHaveBeenCalled()
  })

  it('loadError mostra mensagem e Recarregar, sem lista vazia', async () => {
    state.loadError = 'x'
    render(<App />)
    expect(screen.getByText('Não foi possível carregar os projetos')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum projeto encontrado.')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(reload).toHaveBeenCalled()
  })

  it('alterna para Kanban com as três colunas', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Kanban' }))
    for (const n of ['Planejado', 'Em execução', 'Concluído']) {
      expect(screen.getAllByText(n).length).toBeGreaterThan(0)
    }
  })

  it('aviso offline aparece e some', () => {
    render(<App />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(screen.getByRole('status')).toHaveTextContent('Sem conexão: alterações não estão sendo salvas')
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Meus steps filtra por user.id', async () => {
    state.projects = [mk('Meu', [step('a', 'u1')]), mk('Outro', [step('b', 'u2')])]
    render(<App />)
    expect(screen.getByText('Outro')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Meus steps' }))
    expect(screen.queryByText('Outro')).not.toBeInTheDocument()
    expect(screen.getByText('Meu')).toBeInTheDocument()
  })

  it('restaura view após remontar', async () => {
    const { unmount } = render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Kanban' }))
    unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: 'Kanban' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('valores inválidos no localStorage caem nos padrões', () => {
    localStorage.setItem('gp.view', '"xx"')
    localStorage.setItem('gp.filters', '{"showDone":1}')
    render(<App />)
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('recarrega ao voltar à aba', () => {
    render(<App />)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(reload).toHaveBeenCalled()
  })

  it('Novo projeto abre o detalhe de criação', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Novo projeto' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
