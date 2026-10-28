import { describe, expect, it } from 'vitest'
import { daysBetween, dueLabel, shortDate, weekdayShort } from '../../src/domain/dates'

describe('dueLabel', () => {
  const today = '2026-10-28'

  it('sem prazo', () => {
    expect(dueLabel(null, today)).toEqual({ date: '', relative: 'Sem prazo', tone: 'none' })
  })

  it('hoje e amanhã', () => {
    expect(dueLabel('2026-10-28', today)).toEqual({ date: '28/10', relative: 'hoje', tone: 'soon' })
    expect(dueLabel('2026-10-29', today)).toEqual({ date: '29/10', relative: 'amanhã', tone: 'soon' })
  })

  it('ontem e há N dias', () => {
    expect(dueLabel('2026-10-27', today)).toEqual({ date: '27/10', relative: 'ontem', tone: 'overdue' })
    expect(dueLabel('2026-10-26', today)).toEqual({ date: '26/10', relative: 'há 2 dias', tone: 'overdue' })
  })

  it('em N dias: até 3 é próximo, depois neutro', () => {
    expect(dueLabel('2026-10-31', today)).toMatchObject({ relative: 'em 3 dias', tone: 'soon' })
    expect(dueLabel('2026-11-01', today)).toMatchObject({ relative: 'em 4 dias', tone: 'none' })
  })

  it('atravessa o fim do mês e do ano', () => {
    expect(dueLabel('2026-11-02', '2026-10-30')).toEqual({ date: '02/11', relative: 'em 3 dias', tone: 'soon' })
    expect(dueLabel('2026-12-31', '2027-01-01')).toMatchObject({ date: '31/12', relative: 'ontem' })
    expect(dueLabel('2026-03-01', '2026-02-28')).toMatchObject({ relative: 'amanhã' })
  })
})

describe('date helpers', () => {
  it('daysBetween ignora horário de verão', () => {
    // Brazilian DST and the European switch dates: still whole days.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-11-01', '2026-10-25')).toBe(-7)
  })

  it('shortDate e weekdayShort', () => {
    expect(shortDate('2026-01-05')).toBe('05/01')
    expect(weekdayShort('2026-10-28')).toBe('qua')
    expect(weekdayShort('2026-11-01')).toBe('dom')
    expect(weekdayShort('2026-10-31')).toBe('sáb')
  })
})
