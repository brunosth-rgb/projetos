import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as null | { message: string } },
  order: vi.fn(),
}))

vi.mock('../../src/lib/supabase', () => {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.delete = () => chain
  chain.eq = () => chain
  chain.order = (...a: unknown[]) => {
    h.order(...a)
    return chain
  }
  chain.then = (res: (v: unknown) => unknown) => Promise.resolve(h.result).then(res)
  return { supabase: { from: () => chain } }
})

import { listProjects, deleteProject } from '../../src/data/repo'

describe('repo', () => {
  beforeEach(() => {
    h.order.mockClear()
    h.result = { data: null, error: null }
  })

  it('listProjects devolve linhas e ordena steps por position', async () => {
    h.result = { data: [{ id: 'p1', steps: [] }], error: null }
    const r = await listProjects()
    expect(r).toEqual([{ id: 'p1', steps: [] }])
    expect(h.order).toHaveBeenCalledWith('position', { referencedTable: 'steps' })
    expect(h.order).toHaveBeenCalledWith('position')
    expect(h.order).toHaveBeenCalledWith('created_at')
    const topLevel = h.order.mock.calls.filter(c => c.length === 1).map(c => c[0])
    expect(topLevel).toEqual(['position', 'created_at'])
  })

  it('erro do Supabase vira Error', async () => {
    h.result = { data: null, error: { message: 'boom' } }
    await expect(listProjects()).rejects.toThrow('boom')
    await expect(deleteProject('x')).rejects.toThrow('boom')
  })
})
