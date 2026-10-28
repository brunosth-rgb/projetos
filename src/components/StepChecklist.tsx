import { useState } from 'react'
import { positionBetween, profileLabel } from '../domain/projects'
import type { Profile, Step } from '../domain/types'
import type { Actions } from '../state/useProjects'

interface Props {
  projectId: string
  steps: Step[]
  profiles: Profile[]
  actions: Actions
}

const iconBtn =
  'min-h-9 min-w-9 rounded border border-slate-300 px-2 text-sm disabled:opacity-30 hover:bg-slate-100'

export function StepChecklist({ projectId, steps, profiles, actions }: Props) {
  const [draft, setDraft] = useState('')
  const sorted = [...steps].sort((a, b) => a.position - b.position)

  const moveUp = (i: number) => {
    const position = positionBetween(sorted[i - 2]?.position ?? null, sorted[i - 1].position)
    void actions.editStep(sorted[i].id, { position })
  }
  const moveDown = (i: number) => {
    const position = positionBetween(sorted[i + 1].position, sorted[i + 2]?.position ?? null)
    void actions.editStep(sorted[i].id, { position })
  }

  const add = () => {
    const title = draft.trim()
    if (!title) return
    void actions.addStep(projectId, title)
    setDraft('')
  }

  return (
    <section aria-label="Steps" className="space-y-2">
      <h3 className="text-sm font-semibold">Steps</h3>
      <ul className="space-y-2">
        {sorted.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              aria-label={s.title}
              checked={s.done}
              onChange={e => void actions.editStep(s.id, { done: e.target.checked })}
              className="h-5 w-5"
            />
            <span className={`min-w-0 flex-1 break-words ${s.done ? 'text-slate-400 line-through' : ''}`}>
              {s.title}
            </span>
            <select
              aria-label={`Responsável por ${s.title}`}
              value={s.assignee_id ?? ''}
              onChange={e => void actions.editStep(s.id, { assignee_id: e.target.value || null })}
              className="max-w-40 rounded border border-slate-300 px-1 py-1 text-sm"
            >
              <option value="">Sem responsável</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {profileLabel(p)}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={`Subir step ${s.title}`}
              disabled={i === 0}
              onClick={() => moveUp(i)}
              className={iconBtn}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Descer step ${s.title}`}
              disabled={i === sorted.length - 1}
              onClick={() => moveDown(i)}
              className={iconBtn}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`Remover step ${s.title}`}
              onClick={() => void actions.removeStep(s.id)}
              className={iconBtn}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <input
        aria-label="Novo step"
        placeholder="Novo step"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        className="w-full rounded border border-slate-300 px-2 py-2"
      />
    </section>
  )
}
