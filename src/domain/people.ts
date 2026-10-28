import type { Profile } from './types'

/** Hue slots 60 degrees apart, ordered so the first three picked are spread widely. */
const HUES = [210, 30, 150, 270, 90, 330]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/**
 * Stable tint hue per person. Each id prefers the slot its hash points to; on a clash it takes the
 * next free slot, people resolved in id order, so the result is the same on every render and
 * device as long as the set of people is the same. Up to 6 people never share a hue.
 */
export function personHues(profiles: Profile[]): Map<string, number> {
  const out = new Map<string, number>()
  const used = new Set<number>()
  for (const id of [...new Set(profiles.map(p => p.id))].sort()) {
    let slot = hash(id) % HUES.length
    for (let i = 0; i < HUES.length && used.has(slot); i++) slot = (slot + 1) % HUES.length
    used.add(slot) // with more than 6 people the loop ends on the preferred slot and it is shared
    out.set(id, HUES[slot])
  }
  return out
}

/** One or two letters for an initials circle: first and last word of the label, or the e-mail's first letter. */
export function initials(label: string): string {
  const base = label.includes('@') && !label.includes(' ') ? label.split('@')[0] : label
  const words = base.trim().split(/[\s._-]+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1 || label.includes('@')) return words[0][0].toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
