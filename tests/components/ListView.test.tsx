import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListView } from '../../src/components/ListView'
import { Header, type Filters } from '../../src/components/Header'
import type { Profile, Project, Step } from '../../src/domain/types'

const today = '2026-10-28'

function mk(over: Partial<Project> & { id: string }): Project {
  return {
    title: over.id,
    description: '',
    status: 'em_execucao',
    urgency: 'media',
    due_date: null,
    position: 1,
    created_by: 'u1',
    created_at: '',
    updated_at: '',
    completed_at: null,
    steps: [],
    ...over,
  }
}

function step(over: Partial<Step> & { id: string }): Step {
  return { project_id: 'p', title: 's', done: false, position: 1, assignee_id: null, created_at: '', ...over }
}

const profiles: Profile[] = [
  { id: 'u1', display_name: 'Ana', email: 'ana@x.com' },
  { id: 'u2', display_name: '', email: 'bia@x.com' },
]

describe('ListView', () => {
  it('ordena por urgência e prazo', () => {
    const ps = [
      mk({ id: 'Alta tarde', urgency: 'alta', due_date: '2026-12-01' }),
      mk({ id: 'Critica', urgency: 'critica', due_date: '2026-12-30' }),
      mk({ id: 'Alta cedo', urgency: 'alta', due_date: '2026-11-10' }),
    ]
    render(<ListView projects={ps} profiles={profiles} today={today} onOpen={() => {}} />)
    const names = screen.getAllByRole('button').map(b => b.textContent ?? '')
    expect(names[0]).toContain('Critica')
    expect(names[1]).toContain('Alta cedo')
    expect(names[2]).toContain('Alta tarde')
  })

  it('marca atrasado e vencimento próximo', () => {
    const ps = [
      mk({ id: 'Atrasado', due_date: '2026-10-01' }),
      mk({ id: 'Proximo', due_date: '2026-10-30' }),
      mk({ id: 'Longe', due_date: '2026-12-30' }),
    ]
    render(<ListView projects={ps} profiles={profiles} today={today} onOpen={() => {}} />)
    const row = (n: string) => screen.getByRole('button', { name: new RegExp(n) }).closest('[data-state], li')!
    expect(row('Atrasado').getAttribute('data-state')).toBe('overdue')
    expect(row('Proximo').getAttribute('data-state')).toBe('due-soon')
    expect(row('Longe').getAttribute('data-state')).toBeNull()
  })

  it('mostra 0/0, Sem prazo, data formatada e urgência com texto', () => {
    render(
      <ListView
        projects={[mk({ id: 'A' }), mk({ id: 'B', due_date: '2026-11-05', urgency: 'critica' })]}
        profiles={profiles}
        today={today}
        onOpen={() => {}}
      />,
    )
    expect(screen.getAllByText('0/0')).toHaveLength(2)
    expect(screen.getByText('Sem prazo')).toBeTruthy()
    expect(screen.getByText('05/11/2026')).toBeTruthy()
    expect(screen.getByText('Crítica')).toBeTruthy()
  })

  it('progresso tem rótulo para leitor de tela sem esconder o texto visível', () => {
    render(<ListView projects={[mk({ id: 'A' })]} profiles={profiles} today={today} onOpen={() => {}} />)
    const visible = screen.getByText('0/0')
    expect(visible).not.toHaveAttribute('aria-label')
    expect(visible).toHaveTextContent('Progresso dos steps: 0/0')
    expect(screen.getByText('Progresso dos steps:')).toHaveClass('sr-only')
  })

  it('mostra e-mail quando responsável não tem nome e deduplica', () => {
    const ps = [
      mk({
        id: 'P',
        steps: [
          step({ id: 's1', assignee_id: 'u2' }),
          step({ id: 's2', assignee_id: 'u2' }),
          step({ id: 's3', assignee_id: 'u1', done: true }),
        ],
      }),
    ]
    render(<ListView projects={ps} profiles={profiles} today={today} onOpen={() => {}} />)
    expect(screen.getAllByText(/bia@x\.com/)).toHaveLength(1)
    expect(screen.queryByText(/Ana/)).toBeNull()
    expect(screen.getByText('1/3')).toBeTruthy()
  })

  it('clicar chama onOpen e lista vazia mostra mensagem', async () => {
    const onOpen = vi.fn()
    const { rerender } = render(<ListView projects={[mk({ id: 'X1' })]} profiles={profiles} today={today} onOpen={onOpen} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith('X1')
    rerender(<ListView projects={[]} profiles={profiles} today={today} onOpen={onOpen} />)
    expect(screen.getByText('Nenhum projeto encontrado.')).toBeTruthy()
  })
})

describe('Header', () => {
  const filters: Filters = { showDone: false, statuses: null, mine: false }
  const setup = (over: Partial<React.ComponentProps<typeof Header>> = {}) => {
    const props = {
      view: 'lista' as const,
      onViewChange: vi.fn(),
      filters,
      onFiltersChange: vi.fn(),
      onNew: vi.fn(),
      onSignOut: vi.fn(),
      ...over,
    }
    render(<Header {...props} />)
    return props
  }

  it('marcar Mostrar concluídos envia showDone:true', async () => {
    const p = setup()
    await userEvent.click(screen.getByLabelText('Mostrar concluídos'))
    expect(p.onFiltersChange).toHaveBeenCalledWith({ ...filters, showDone: true })
  })

  it('alterna visão, meus steps, status, novo e sair', async () => {
    const p = setup()
    expect(screen.getByRole('button', { name: 'Lista' }).getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(screen.getByRole('button', { name: 'Kanban' }))
    expect(p.onViewChange).toHaveBeenCalledWith('kanban')
    await userEvent.click(screen.getByRole('button', { name: 'Meus steps' }))
    expect(p.onFiltersChange).toHaveBeenCalledWith({ ...filters, mine: true })
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'planejado')
    expect(p.onFiltersChange).toHaveBeenCalledWith({ ...filters, statuses: ['planejado'] })
    await userEvent.selectOptions(screen.getByLabelText('Status'), '')
    expect(p.onFiltersChange).toHaveBeenLastCalledWith({ ...filters, statuses: null })
    await userEvent.click(screen.getByRole('button', { name: 'Novo projeto' }))
    expect(p.onNew).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(p.onSignOut).toHaveBeenCalled()
  })
})
