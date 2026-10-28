import { describe, expect, it } from 'vitest'
import { initials, personHues } from '../../src/domain/people'
import type { Profile } from '../../src/domain/types'

const p = (id: string): Profile => ({ id, display_name: id, email: `${id}@x.com` })

function gap(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

describe('personHues', () => {
  it('é estável e independe da ordem da lista', () => {
    const a = personHues([p('u1'), p('u2'), p('u3')])
    const b = personHues([p('u3'), p('u1'), p('u2')])
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort())
  })

  it('até 6 pessoas ficam a pelo menos 60 graus umas das outras', () => {
    const ids = ['6f1c2a3e', '0c9e8d7b', 'a7b6c5d4', 'x', 'y', 'z']
    const hues = [...personHues(ids.map(p)).values()]
    for (let i = 0; i < hues.length; i++)
      for (let j = i + 1; j < hues.length; j++) expect(gap(hues[i], hues[j])).toBeGreaterThanOrEqual(60)
  })
})

describe('initials', () => {
  it('nome, nome composto e e-mail', () => {
    expect(initials('Bruno')).toBe('B')
    expect(initials('Ana Maria Souza')).toBe('AS')
    expect(initials('bia@x.com')).toBe('B')
    expect(initials('')).toBe('?')
  })
})
