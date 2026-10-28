import { describe, expect, it } from 'vitest'
import { projectFinding } from '../../src/domain/summary'
import type { Project, Status } from '../../src/domain/types'

const today = '2026-10-28'
let n = 0

function mk(due_date: string | null, status: Status = 'em_execucao'): Project {
  n += 1
  return {
    id: `p${n}`, title: `p${n}`, description: '', status, urgency: 'media', due_date,
    position: n, created_by: 'u1', created_at: '', updated_at: '', completed_at: null, steps: [],
  }
}

describe('projectFinding', () => {
  it('sem projetos', () => {
    expect(projectFinding([], today)).toBe('Nenhum projeto ainda.')
  })

  it('só concluídos ainda conta como conta com projetos', () => {
    expect(projectFinding([mk('2026-10-01', 'concluido')], today)).toBe(
      'Nada atrasado e nada vence nos próximos 3 dias.',
    )
  })

  it('nada atrasado e nada vencendo', () => {
    expect(projectFinding([mk(null), mk('2026-11-30')], today)).toBe(
      'Nada atrasado e nada vence nos próximos 3 dias.',
    )
  })

  it('1 atrasado, nada vencendo', () => {
    expect(projectFinding([mk('2026-10-27')], today)).toBe('1 atrasado')
  })

  it('2 atrasados, nada vencendo', () => {
    expect(projectFinding([mk('2026-10-27'), mk('2026-09-01', 'planejado')], today)).toBe('2 atrasados')
  })

  it('nada atrasado, 1 vence', () => {
    expect(projectFinding([mk('2026-10-28')], today)).toBe('Nada atrasado. 1 vence em até 3 dias.')
  })

  it('nada atrasado, 3 vencem', () => {
    expect(projectFinding([mk('2026-10-28'), mk('2026-10-30'), mk('2026-10-31')], today)).toBe(
      'Nada atrasado. 3 vencem em até 3 dias.',
    )
  })

  it('ambos', () => {
    const ps = [mk('2026-10-27'), mk('2026-10-20'), mk('2026-10-28'), mk('2026-10-29'), mk('2026-10-31')]
    expect(projectFinding(ps, today)).toBe('2 atrasados · 3 vencem em até 3 dias')
  })

  it('1 atrasado · 1 vence', () => {
    expect(projectFinding([mk('2026-10-27'), mk('2026-10-29')], today)).toBe(
      '1 atrasado · 1 vence em até 3 dias',
    )
  })

  it('ignora concluídos nas contagens', () => {
    const ps = [mk('2026-10-27', 'concluido'), mk('2026-10-29', 'concluido'), mk('2026-10-29')]
    expect(projectFinding(ps, today)).toBe('Nada atrasado. 1 vence em até 3 dias.')
  })

  it('o 4º dia já não conta', () => {
    expect(projectFinding([mk('2026-11-01')], today)).toBe('Nada atrasado e nada vence nos próximos 3 dias.')
  })
})
