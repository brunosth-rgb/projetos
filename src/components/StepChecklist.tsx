import { useState } from 'react'
import { positionBetween, profileLabel } from '../domain/projects'
import { personHues } from '../domain/people'
import type { Profile, Step } from '../domain/types'
import type { Actions } from '../state/useProjects'
import { Initials } from './ProjectMeta'

interface Props {
  projectId: string
  steps: Step[]
  profiles: Profile[]
  actions: Actions
}

// Quiet 28px ghost buttons (44px on phones); the glyphs are text, the names come from aria-label.
const ghostBtn =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-control text-sm text-muted transition-colors hover:bg-active hover:text-ink disabled:pointer-events-none disabled:opacity-30 max-sm:size-11'

function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    // The label is an invisible padded hit area: 44px on phones (24 + 2 x 10), no layout shift.
    <label className="relative inline-flex shrink-0 cursor-pointer max-sm:-m-2.5 max-sm:p-2.5">
      <span className="relative inline-flex size-[18px] max-sm:size-6">
        <input
          type="checkbox"
          aria-label={label}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="peer size-full cursor-pointer appearance-none rounded-[4px] border border-control-strong bg-surface transition-colors checked:border-primary checked:bg-primary hover:border-ink"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-primary-ink peer-checked:block"
        >
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  )
}

export function StepChecklist({ projectId, steps, profiles, actions }: Props) {
  const [draft, setDraft] = useState('')
  const sorted = [...steps].sort((a, b) => a.position - b.position)
  const done = sorted.filter(s => s.done).length
  const hues = personHues(profiles)

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
    <section aria-label="Steps">
      <div className="mb-2 flex items-baseline justify-between border-b border-border pb-2">
        <h3 className="text-base font-medium">Steps</h3>
        <span className="num text-sm text-muted">
          <span className="sr-only">Concluídos: </span>
          {`${done}/${sorted.length}`}
        </span>
      </div>
      <ul>
        {sorted.map((s, i) => {
          const who = profiles.find(p => p.id === s.assignee_id)
          return (
            <li
              key={s.id}
              className="group flex min-h-11 items-center gap-3 border-b border-rule py-1 max-sm:flex-wrap max-sm:py-2"
            >
              <Check
                checked={s.done}
                label={s.title}
                onChange={v => void actions.editStep(s.id, { done: v })}
              />
              <span className={`min-w-0 flex-1 text-sm break-words ${s.done ? 'text-muted line-through' : 'text-ink'}`}>
                {s.title}
              </span>
              <span className="flex items-center gap-0.5 max-sm:ml-[30px] max-sm:w-full">
                <label className="relative inline-flex h-7 max-w-[148px] items-center gap-1.5 rounded-control border border-transparent pr-1 pl-1 transition-colors hover:border-border focus-within:border-control max-sm:mr-auto max-sm:h-11">
                  {who ? (
                    <Initials profile={who} hue={hues.get(who.id)} size={20} />
                  ) : (
                    <span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-dashed border-control" />
                  )}
                  <select
                    aria-label={`Responsável por ${s.title}`}
                    value={s.assignee_id ?? ''}
                    onChange={e => void actions.editStep(s.id, { assignee_id: e.target.value || null })}
                    className={`min-w-0 cursor-pointer truncate bg-transparent text-sm outline-offset-2 ${who ? 'text-ink' : 'text-muted'}`}
                  >
                    <option value="">Sem responsável</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {profileLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label={`Subir step ${s.title}`}
                  disabled={i === 0}
                  onClick={() => moveUp(i)}
                  className={ghostBtn}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Descer step ${s.title}`}
                  disabled={i === sorted.length - 1}
                  onClick={() => moveDown(i)}
                  className={ghostBtn}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remover step ${s.title}`}
                  onClick={() => void actions.removeStep(s.id)}
                  className={`${ghostBtn} hover:text-negative`}
                >
                  ×
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      {sorted.length === 0 && <p className="py-3 text-sm text-muted">Nenhum step ainda.</p>}
      <div className="mt-2 flex items-center gap-3">
        <span aria-hidden="true" className="flex size-[18px] shrink-0 items-center justify-center text-muted max-sm:size-6">
          +
        </span>
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
          className="h-9 min-w-0 flex-1 rounded-control border border-transparent bg-transparent px-2 text-sm text-ink transition-colors hover:border-border focus:border-control max-sm:h-11"
        />
      </div>
    </section>
  )
}
