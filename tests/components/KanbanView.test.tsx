import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { KanbanView, computeMove, kanbanCollision, resolveDrop, groupByStatus } from '../../src/components/KanbanView'
import type { ClientRect, DroppableContainer, UniqueIdentifier } from '@dnd-kit/core'
import type { Profile, Project, Status } from '../../src/domain/types'

const today = '2026-10-28'

function mk(over: Partial<Project> & { id: string }): Project {
  return {
    title: over.id,
    description: '',
    status: 'planejado',
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

const profiles: Profile[] = [{ id: 'u1', display_name: 'Ana', email: 'ana@x.com' }]

function cols(ps: Project[]): Record<Status, Project[]> {
  return groupByStatus(ps)
}

// planejado: a(1) b(2) c(3); em_execucao: x(1) y(2); concluido: empty
const board = cols([
  mk({ id: 'c', position: 3 }),
  mk({ id: 'a', position: 1 }),
  mk({ id: 'b', position: 2 }),
  mk({ id: 'y', status: 'em_execucao', position: 2 }),
  mk({ id: 'x', status: 'em_execucao', position: 1 }),
])

describe('KanbanView', () => {
  it('renderiza as três colunas mesmo sem projetos', () => {
    render(<KanbanView projects={[]} profiles={profiles} today={today} onOpen={() => {}} onMove={() => {}} />)
    expect(screen.getByRole('region', { name: 'Planejado' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Em execução' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Concluído' })).toBeInTheDocument()
  })

  it('coloca os cartões na coluna do status, ordenados por position', () => {
    const ps = [
      mk({ id: 'Segundo', position: 2 }),
      mk({ id: 'Primeiro', position: 1 }),
      mk({ id: 'Rodando', status: 'em_execucao', position: 5 }),
      mk({ id: 'Feito', status: 'concluido', position: 1 }),
    ]
    render(<KanbanView projects={ps} profiles={profiles} today={today} onOpen={() => {}} onMove={() => {}} />)
    const plan = screen.getByRole('region', { name: 'Planejado' })
    const titles = within(plan).getAllByRole('button').map(b => b.textContent ?? '')
    expect(titles).toHaveLength(2)
    expect(titles[0]).toContain('Primeiro')
    expect(titles[1]).toContain('Segundo')
    expect(within(screen.getByRole('region', { name: 'Em execução' })).getByText('Rodando')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Concluído' })).getByText('Feito')).toBeInTheDocument()
  })

  it('mostra metadados e marca atrasado com data-state', () => {
    const ps = [mk({ id: 'Atrasado', due_date: '2026-10-01', urgency: 'alta' })]
    render(<KanbanView projects={ps} profiles={profiles} today={today} onOpen={() => {}} onMove={() => {}} />)
    const card = screen.getByRole('button', { name: /Atrasado/ })
    expect(card).toHaveAttribute('data-state', 'overdue')
    expect(within(card).getByText('Alta')).toBeInTheDocument()
    expect(within(card).getByText('01/10/2026')).toBeInTheDocument()
  })

  it('clique e Enter abrem o projeto', async () => {
    const onOpen = vi.fn()
    render(<KanbanView projects={[mk({ id: 'P1' })]} profiles={profiles} today={today} onOpen={onOpen} onMove={() => {}} />)
    const card = screen.getByRole('button', { name: /P1/ })
    await userEvent.click(card)
    expect(onOpen).toHaveBeenCalledWith('P1')
    onOpen.mockClear()
    card.focus()
    await userEvent.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledWith('P1')
  })

  it('não chama onMove ao pegar e soltar no mesmo lugar (teclado)', async () => {
    const onMove = vi.fn()
    const onOpen = vi.fn()
    render(
      <KanbanView projects={[mk({ id: 'P1' }), mk({ id: 'P2', position: 2 })]} profiles={profiles} today={today} onOpen={onOpen} onMove={onMove} />,
    )
    screen.getByRole('button', { name: /P1/ }).focus()
    await userEvent.keyboard(' ')
    expect(await screen.findByText(/Projeto P1 (selecionado|sobre P1)\./)).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(await screen.findByText(/Projeto P1 solto/)).toBeInTheDocument()
    expect(onMove).not.toHaveBeenCalled()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('o contêiner das colunas rola horizontalmente', () => {
    render(<KanbanView projects={[]} profiles={profiles} today={today} onOpen={() => {}} onMove={() => {}} />)
    const region = screen.getByRole('region', { name: 'Planejado' })
    expect(region.parentElement).toHaveClass('overflow-x-auto')
  })
})

describe('groupByStatus', () => {
  it('desempata position igual por created_at crescente', () => {
    const g = groupByStatus([
      mk({ id: 'novo', position: 1000, created_at: '2026-10-02T00:00:00Z' }),
      mk({ id: 'velho', position: 1000, created_at: '2026-10-01T00:00:00Z' }),
      mk({ id: 'primeiro', position: 500, created_at: '2026-10-03T00:00:00Z' }),
    ])
    expect(g.planejado.map(p => p.id)).toEqual(['primeiro', 'velho', 'novo'])
  })
})

describe('resolveDrop', () => {
  it('soltar sobre coluna vazia', () => {
    expect(resolveDrop(board, 'a', 'column:concluido')).toEqual({ status: 'concluido', beforeId: null, afterId: null })
  })

  it('soltar sobre coluna não vazia vai para o fim', () => {
    expect(resolveDrop(board, 'a', 'column:em_execucao')).toEqual({ status: 'em_execucao', beforeId: 'y', afterId: null })
  })

  it('soltar sobre a própria coluna exclui o cartão ativo dos vizinhos', () => {
    expect(resolveDrop(board, 'a', 'column:planejado')).toEqual({ status: 'planejado', beforeId: 'c', afterId: null })
    expect(resolveDrop(board, 'c', 'column:planejado')).toEqual({ status: 'planejado', beforeId: 'b', afterId: null })
  })

  it('mesma coluna, descendo: fica depois do alvo', () => {
    expect(resolveDrop(board, 'a', 'b')).toEqual({ status: 'planejado', beforeId: 'b', afterId: 'c' })
    expect(resolveDrop(board, 'a', 'c')).toEqual({ status: 'planejado', beforeId: 'c', afterId: null })
  })

  it('mesma coluna, subindo: fica antes do alvo', () => {
    expect(resolveDrop(board, 'c', 'a')).toEqual({ status: 'planejado', beforeId: null, afterId: 'a' })
    expect(resolveDrop(board, 'c', 'b')).toEqual({ status: 'planejado', beforeId: 'a', afterId: 'b' })
  })

  it('cartão de outra coluna: assume o status dela e fica antes do alvo', () => {
    expect(resolveDrop(board, 'b', 'x')).toEqual({ status: 'em_execucao', beforeId: null, afterId: 'x' })
    expect(resolveDrop(board, 'b', 'y')).toEqual({ status: 'em_execucao', beforeId: 'x', afterId: 'y' })
  })

  it('soltar sobre si mesmo ou fora: posição atual', () => {
    expect(resolveDrop(board, 'b', 'b')).toEqual({ status: 'planejado', beforeId: 'a', afterId: 'c' })
    expect(resolveDrop(board, 'b', null)).toEqual({ status: 'planejado', beforeId: 'a', afterId: 'c' })
  })
})

describe('computeMove', () => {
  it('retorna null quando nada muda', () => {
    expect(computeMove(board, 'b', 'b')).toBeNull()
    expect(computeMove(board, 'b', null)).toBeNull()
    expect(computeMove(board, 'c', 'column:planejado')).toBeNull()
  })

  it('retorna o destino quando muda', () => {
    expect(computeMove(board, 'a', 'column:concluido')).toEqual({ status: 'concluido', beforeId: null, afterId: null })
  })
})

describe('kanbanCollision', () => {
  const rect = (left: number, top: number, width: number, height: number): ClientRect => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  })
  // Board 1000px tall. planejado (x 0-300) has cards a (top 10) and b (top 80);
  // em_execucao (x 320-620) has card x (top 10); concluido (x 640-940) is empty.
  const rects = new Map<UniqueIdentifier, ClientRect>([
    ['column:planejado', rect(0, 0, 300, 1000)],
    ['column:em_execucao', rect(320, 0, 300, 1000)],
    ['column:concluido', rect(640, 0, 300, 1000)],
    ['a', rect(5, 10, 290, 60)],
    ['b', rect(5, 80, 290, 60)],
    ['x', rect(325, 10, 290, 60)],
  ])
  const containers = [...rects.keys()].map(
    id => ({ id, key: String(id), data: { current: undefined }, disabled: false, node: { current: null }, rect: { current: null } }) as unknown as DroppableContainer,
  )
  const args = (pointer: { x: number; y: number } | null, collisionRect: ClientRect) => ({
    active: { id: 'b', data: { current: undefined }, rect: { current: { initial: null, translated: null } } },
    collisionRect,
    droppableRects: rects,
    droppableContainers: containers,
    pointerCoordinates: pointer,
  }) as unknown as Parameters<typeof kanbanCollision>[0]

  it('ponteiro no espaço vazio abaixo do último cartão de outra coluna → a coluna', () => {
    const r = kanbanCollision(args({ x: 470, y: 100 }, rect(325, 75, 290, 60)))
    expect(r[0]?.id).toBe('column:em_execucao')
  })

  it('ponteiro numa coluna vazia mesmo com o retângulo perto de um cartão vizinho → a coluna vazia', () => {
    const r = kanbanCollision(args({ x: 645, y: 40 }, rect(330, 12, 290, 60)))
    expect(r[0]?.id).toBe('column:concluido')
  })

  it('ponteiro sobre um cartão → o cartão, não a coluna', () => {
    const r = kanbanCollision(args({ x: 470, y: 40 }, rect(325, 10, 290, 60)))
    expect(r[0]?.id).toBe('x')
  })

  it('sem coordenadas de ponteiro (teclado) → recorre a closestCorners', () => {
    const r = kanbanCollision(args(null, rect(325, 12, 290, 60)))
    expect(r.length).toBeGreaterThan(0)
    expect(r[0]?.id).toBe('x')
  })
})
