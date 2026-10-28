import { describe, it, expect } from 'vitest'
import type { Project, Step } from '../../src/domain/types'
import {
  todayLocal, isOverdue, isDueSoon, stepProgress, sortProjects,
  filterProjects, positionBetween, profileLabel,
} from '../../src/domain/projects'

function makeProject(o: Partial<Project> = {}): Project {
  return {
    id: 'p', title: 't', description: '', status: 'em_execucao', urgency: 'media',
    due_date: null, position: 0, created_by: 'u0', created_at: '', updated_at: '',
    completed_at: null, steps: [], ...o,
  }
}
function makeStep(o: Partial<Step> = {}): Step {
  return { id: 's', project_id: 'p', title: 's', done: false, position: 0, assignee_id: null, created_at: '', ...o }
}

describe('sortProjects', () => {
  it('orders by urgency then due date', () => {
    const a = makeProject({ id: 'a', urgency: 'alta', due_date: '2026-11-10' })
    const b = makeProject({ id: 'b', urgency: 'critica', due_date: '2026-11-12' })
    const c = makeProject({ id: 'c', urgency: 'alta', due_date: '2026-11-05' })
    const input = [a, b, c]
    expect(sortProjects(input).map(p => p.id)).toEqual(['b', 'c', 'a'])
    expect(input.map(p => p.id)).toEqual(['a', 'b', 'c'])
  })
  it('puts no-due-date last within same urgency', () => {
    const a = makeProject({ id: 'a', urgency: 'alta', due_date: null })
    const b = makeProject({ id: 'b', urgency: 'alta', due_date: '2026-12-01' })
    expect(sortProjects([a, b]).map(p => p.id)).toEqual(['b', 'a'])
  })
  it('empate de urgência e prazo ordena por created_at crescente', () => {
    const a = makeProject({ id: 'a', urgency: 'alta', due_date: null, created_at: '2026-10-02T00:00:00Z' })
    const b = makeProject({ id: 'b', urgency: 'alta', due_date: null, created_at: '2026-10-01T00:00:00Z' })
    const c = makeProject({ id: 'c', urgency: 'alta', due_date: '2026-11-01', created_at: '2026-10-03T00:00:00Z' })
    const d = makeProject({ id: 'd', urgency: 'alta', due_date: '2026-11-01', created_at: '2026-10-01T00:00:00Z' })
    expect(sortProjects([a, b, c, d]).map(p => p.id)).toEqual(['d', 'c', 'b', 'a'])
  })
})

describe('isOverdue', () => {
  it('true when past due and not done', () => {
    expect(isOverdue(makeProject({ due_date: '2026-10-27' }), '2026-10-28')).toBe(true)
  })
  it('false when concluido', () => {
    expect(isOverdue(makeProject({ due_date: '2026-10-27', status: 'concluido' }), '2026-10-28')).toBe(false)
  })
  it('false without due date', () => {
    expect(isOverdue(makeProject({ due_date: null }), '2026-10-28')).toBe(false)
  })
})

describe('isDueSoon', () => {
  const today = '2026-10-28'
  it('today+3 true', () => expect(isDueSoon(makeProject({ due_date: '2026-10-31' }), today)).toBe(true))
  it('today+4 false', () => expect(isDueSoon(makeProject({ due_date: '2026-11-01' }), today)).toBe(false))
  it('today true', () => expect(isDueSoon(makeProject({ due_date: today }), today)).toBe(true))
  it('overdue false', () => expect(isDueSoon(makeProject({ due_date: '2026-10-27' }), today)).toBe(false))
  it('no due date false', () => expect(isDueSoon(makeProject({ due_date: null }), today)).toBe(false))
  it('crosses month boundary', () => expect(isDueSoon(makeProject({ due_date: '2026-11-02' }), '2026-10-30')).toBe(true))
})

describe('todayLocal', () => {
  it('uses local date', () => {
    expect(todayLocal(new Date(2026, 9, 28, 23, 30))).toBe('2026-10-28')
  })
})

describe('stepProgress', () => {
  it('zero steps', () => expect(stepProgress(makeProject())).toEqual({ done: 0, total: 0 }))
  it('3 of 7', () => {
    const steps = Array.from({ length: 7 }, (_, i) => makeStep({ id: String(i), done: i < 3 }))
    expect(stepProgress(makeProject({ steps }))).toEqual({ done: 3, total: 7 })
  })
})

describe('filterProjects', () => {
  const base = { showDone: true, statuses: null, mineUserId: null }
  it('showDone false removes concluido', () => {
    const ps = [makeProject({ id: 'a' }), makeProject({ id: 'b', status: 'concluido' })]
    expect(filterProjects(ps, { ...base, showDone: false }).map(p => p.id)).toEqual(['a'])
  })
  it('statuses filter', () => {
    const ps = [makeProject({ id: 'a', status: 'planejado' }), makeProject({ id: 'b' })]
    expect(filterProjects(ps, { ...base, statuses: ['planejado'] }).map(p => p.id)).toEqual(['a'])
  })
  it('status Concluído explícito vence showDone false', () => {
    const ps = [makeProject({ id: 'a' }), makeProject({ id: 'b', status: 'concluido' })]
    expect(filterProjects(ps, { ...base, showDone: false, statuses: ['concluido'] }).map(p => p.id)).toEqual(['b'])
  })
  it('mine keeps only pending steps of user', () => {
    const ps = [
      makeProject({ id: 'a', steps: [makeStep({ assignee_id: 'u1' })] }),
      makeProject({ id: 'b', steps: [makeStep({ assignee_id: 'u1', done: true })] }),
      makeProject({ id: 'c', steps: [makeStep({ assignee_id: 'u2' })] }),
    ]
    expect(filterProjects(ps, { ...base, mineUserId: 'u1' }).map(p => p.id)).toEqual(['a'])
  })
})

describe('positionBetween', () => {
  it('cases', () => {
    expect(positionBetween(null, null)).toBe(1000)
    expect(positionBetween(1000, null)).toBe(2000)
    expect(positionBetween(null, 1000)).toBe(0)
    expect(positionBetween(1000, 2000)).toBe(1500)
  })
})

describe('profileLabel', () => {
  it('falls back to email', () => expect(profileLabel({ id: '1', display_name: '', email: 'a@b.c' })).toBe('a@b.c'))
  it('uses display_name', () => expect(profileLabel({ id: '1', display_name: 'Ana', email: 'a@b.c' })).toBe('Ana'))
})
