import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoot from '../src/App'
import { ThemeProvider } from '../src/ui/theme'
import type { Project, Step } from '../src/domain/types'

// App renders the theme toggle in the top bar, so it needs the provider (as in main.tsx).
function App() {
  return (
    <ThemeProvider>
      <AppRoot />
    </ThemeProvider>
  )
}

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
  it('mostra o produto, o título e chama signOut pela barra superior', async () => {
    render(<App />)
    expect(screen.getByText('Gerenciador de Projetos')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Projetos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tema: Sistema' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(signOut).toHaveBeenCalled()
  })

  it('linha de resumo reflete os projetos', () => {
    const { unmount } = render(<App />)
    expect(screen.getByText('Nenhum projeto ainda.')).toBeInTheDocument()
    unmount()
    state.projects = [{ ...mk('Velho'), due_date: '2000-01-01' }, mk('Sem prazo')]
    render(<App />)
    expect(screen.getByText('1 atrasado')).toBeInTheDocument()
  })

  it('faixa de próximos prazos só aparece com projetos e abre o projeto', async () => {
    const { unmount } = render(<App />)
    expect(screen.queryByRole('heading', { name: 'Próximos prazos' })).not.toBeInTheDocument()
    unmount()
    state.projects = [{ ...mk('Velho'), due_date: '2000-01-01' }]
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Próximos prazos' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Atrasados: 1 projeto' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('sem resumo enquanto carrega ou com erro', () => {
    state.loading = true
    const { unmount } = render(<App />)
    expect(screen.queryByText('Nenhum projeto ainda.')).not.toBeInTheDocument()
    unmount()
    state.loading = false
    state.loadError = 'x'
    render(<App />)
    expect(screen.queryByText('Nenhum projeto ainda.')).not.toBeInTheDocument()
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

  it('kanban com filtros padrão mostra concluídos na coluna Concluído', async () => {
    state.projects = [{ ...mk('Feito'), status: 'concluido' }, mk('Rodando')]
    render(<App />)
    expect(screen.queryByText('Feito')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Kanban' }))
    expect(within(screen.getByRole('region', { name: 'Concluído' })).getByText('Feito')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Em execução' })).getByText('Rodando')).toBeInTheDocument()
  })

  it('kanban ignora o filtro de status salvo, mas aplica Meus steps', () => {
    localStorage.setItem('gp.view', '"kanban"')
    localStorage.setItem('gp.filters', '{"showDone":false,"statuses":["planejado"],"mine":true}')
    state.projects = [
      { ...mk('FeitoMeu', [step('a', 'u1')]), status: 'concluido' },
      mk('RodandoMeu', [step('b', 'u1')]),
      mk('RodandoOutro', [step('c', 'u2')]),
    ]
    render(<App />)
    expect(within(screen.getByRole('region', { name: 'Concluído' })).getByText('FeitoMeu')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Em execução' })).getByText('RodandoMeu')).toBeInTheDocument()
    expect(screen.queryByText('RodandoOutro')).not.toBeInTheDocument()
  })

  it('mantém o detalhe aberto durante uma recarga em segundo plano', async () => {
    state.projects = [mk('Aberto')]
    const { rerender } = render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Aberto/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    state.loading = true
    rerender(<App />)
    state.loading = false
    rerender(<App />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Novo projeto abre o detalhe de criação', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Novo projeto' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
