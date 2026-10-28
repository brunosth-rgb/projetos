import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeadlineStrip } from '../../src/components/DeadlineStrip'
import type { Project, Status, Urgency } from '../../src/domain/types'

const today = '2026-10-28' // quarta-feira

function mk(id: string, due_date: string | null, over: { status?: Status; urgency?: Urgency } = {}): Project {
  return {
    id, title: id, description: '', status: over.status ?? 'em_execucao', urgency: over.urgency ?? 'media', due_date,
    position: 1, created_by: 'u1', created_at: '', updated_at: '', completed_at: null, steps: [],
  }
}

function setup(projects: Project[]) {
  const onOpen = vi.fn()
  const r = render(<DeadlineStrip projects={projects} today={today} onOpen={onOpen} />)
  return { onOpen, ...r }
}

describe('DeadlineStrip', () => {
  it('some numa conta sem projetos', () => {
    const { container } = setup([])
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra Atrasados e 7 dias com contagens e nomes acessíveis', () => {
    setup([
      mk('A1', '2026-10-01'),
      mk('A2', '2026-10-27'),
      mk('Hoje', '2026-10-28'),
      mk('Sab', '2026-10-31'),
      mk('Feito', '2026-10-28', { status: 'concluido' }),
      mk('Sem', null),
    ])
    expect(screen.getByRole('button', { name: 'Atrasados: 2 projetos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'hoje, 28/10: 1 projeto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'amanhã, 29/10: nenhum projeto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'sáb 31, 31/10: 1 projeto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ter 3, 03/11: nenhum projeto' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(8)
  })

  it('a contagem de atrasados só fica vermelha acima de zero', () => {
    const { unmount } = setup([mk('Futuro', '2026-12-01')])
    expect(within(screen.getByRole('button', { name: /^Atrasados/ })).getByText('0')).toHaveClass('text-muted')
    unmount()
    setup([mk('Velho', '2026-10-01')])
    expect(within(screen.getByRole('button', { name: /^Atrasados/ })).getByText('1')).toHaveClass('text-negative')
  })

  it('célula com um projeto abre o projeto', async () => {
    const { onOpen } = setup([mk('p-hoje', '2026-10-28')])
    await userEvent.click(screen.getByRole('button', { name: /^hoje/ }))
    expect(onOpen).toHaveBeenCalledWith('p-hoje')
  })

  it('célula vazia não faz nada', async () => {
    const { onOpen } = setup([mk('p-hoje', '2026-10-28')])
    const cell = screen.getByRole('button', { name: /^amanhã/ })
    expect(cell).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(cell)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('célula com vários abre uma lista de títulos; Escape fecha e devolve o foco', async () => {
    const { onOpen } = setup([mk('Beta', '2026-10-01'), mk('Alfa', '2026-10-02', { urgency: 'critica' })])
    const cell = screen.getByRole('button', { name: /^Atrasados/ })
    expect(cell).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(cell)
    expect(cell).toHaveAttribute('aria-expanded', 'true')
    const list = screen.getByRole('group', { name: 'Projetos: Atrasados' })
    expect(cell).toHaveAttribute('aria-controls', list.id)
    const items = within(list).getAllByRole('button').map(b => b.textContent)
    expect(items).toEqual(['Alfa', 'Beta'])
    expect(document.activeElement).toBe(within(list).getByRole('button', { name: 'Alfa' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Projetos: Atrasados' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(cell)

    await userEvent.click(cell)
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }))
    expect(onOpen).toHaveBeenCalledWith('Beta')
    expect(screen.queryByRole('group', { name: 'Projetos: Atrasados' })).not.toBeInTheDocument()
  })

  it('clicar fora fecha a lista', async () => {
    setup([mk('Beta', '2026-10-01'), mk('Alfa', '2026-10-02')])
    await userEvent.click(screen.getByRole('button', { name: /^Atrasados/ }))
    expect(screen.getByRole('group')).toBeInTheDocument()
    await userEvent.click(document.body)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })
})
