import { describe, expect, it } from 'vitest'
import { upcomingDeadlines } from '../../src/domain/deadlines'
import type { Project, Status, Urgency } from '../../src/domain/types'

function mk(id: string, due_date: string | null, over: { status?: Status; urgency?: Urgency } = {}): Project {
  return {
    id, title: id, description: '', status: over.status ?? 'em_execucao', urgency: over.urgency ?? 'media', due_date,
    position: 1, created_by: 'u1', created_at: '', updated_at: '', completed_at: null, steps: [],
  }
}

const ids = (ps: Project[]) => ps.map(p => p.id)

describe('upcomingDeadlines', () => {
  it('exatamente 7 dias a partir de hoje, atravessando o mês', () => {
    const r = upcomingDeadlines([], '2026-10-28')
    expect(r.days.map(d => d.date)).toEqual([
      '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03',
    ])
    expect(r.overdue).toEqual([])
  })

  it('distribui por dia e deixa de fora o 8º dia', () => {
    const r = upcomingDeadlines(
      [mk('hoje', '2026-10-28'), mk('nov1', '2026-11-01'), mk('ultimo', '2026-11-03'), mk('fora', '2026-11-04')],
      '2026-10-28',
    )
    expect(ids(r.days[0].projects)).toEqual(['hoje'])
    expect(ids(r.days[4].projects)).toEqual(['nov1'])
    expect(ids(r.days[6].projects)).toEqual(['ultimo'])
    expect(r.days.flatMap(d => ids(d.projects))).not.toContain('fora')
  })

  it('atrasados são os de antes de hoje; hoje não é atrasado', () => {
    const r = upcomingDeadlines([mk('ontem', '2026-10-27'), mk('hoje', '2026-10-28'), mk('velho', '2025-01-01')], '2026-10-28')
    expect(ids(r.overdue).sort()).toEqual(['ontem', 'velho'])
    expect(ids(r.days[0].projects)).toEqual(['hoje'])
  })

  it('exclui concluídos e sem prazo', () => {
    const r = upcomingDeadlines(
      [mk('feito', '2026-10-28', { status: 'concluido' }), mk('feitoAtrasado', '2026-10-01', { status: 'concluido' }), mk('semPrazo', null)],
      '2026-10-28',
    )
    expect(r.overdue).toEqual([])
    expect(r.days.every(d => d.projects.length === 0)).toBe(true)
  })

  it('ordena por urgência e depois título dentro do dia e nos atrasados', () => {
    const d = '2026-10-29'
    const r = upcomingDeadlines(
      [
        mk('Beta', d, { urgency: 'baixa' }),
        mk('Alfa', d, { urgency: 'baixa' }),
        mk('Zeta', d, { urgency: 'critica' }),
        mk('Meio', d, { urgency: 'alta' }),
        mk('B', '2026-10-01', { urgency: 'media' }),
        mk('A', '2026-10-02', { urgency: 'media' }),
        mk('C', '2026-10-03', { urgency: 'critica' }),
      ],
      '2026-10-28',
    )
    expect(ids(r.days[1].projects)).toEqual(['Zeta', 'Meio', 'Alfa', 'Beta'])
    expect(ids(r.overdue)).toEqual(['C', 'A', 'B'])
  })
})
