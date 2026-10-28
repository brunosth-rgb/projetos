import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState, type KeyboardEvent } from 'react'
import type { Profile, Project, Status } from '../domain/types'
import { compareCreatedAt, isDueSoon, isOverdue } from '../domain/projects'
import { STATUS_LABEL } from '../ui/labels'
import { ProjectMeta } from './ProjectMeta'

const STATUSES: Status[] = ['planejado', 'em_execucao', 'concluido']
const COLUMN_PREFIX = 'column:'

export interface DropResult {
  status: Status
  beforeId: string | null
  afterId: string | null
}

export function groupByStatus(projects: Project[]): Record<Status, Project[]> {
  const cols: Record<Status, Project[]> = { planejado: [], em_execucao: [], concluido: [] }
  for (const p of projects) cols[p.status].push(p)
  for (const s of STATUSES) cols[s].sort((a, b) => a.position - b.position || compareCreatedAt(a, b))
  return cols
}

function findColumn(columns: Record<Status, Project[]>, id: string): Status | null {
  return STATUSES.find(s => columns[s].some(p => p.id === id)) ?? null
}

/**
 * Where the active card lands. `overId` is either a column id (`column:<status>`)
 * or a card id. Neighbours are computed after removing the active card.
 * beforeId = card above (lower position), afterId = card below.
 */
export function resolveDrop(
  columns: Record<Status, Project[]>,
  activeId: string,
  overId: string | null,
): DropResult {
  const from = findColumn(columns, activeId)
  const fromIndex = from ? columns[from].findIndex(p => p.id === activeId) : -1
  const current = (): DropResult => {
    if (!from) return { status: 'planejado', beforeId: null, afterId: null }
    const col = columns[from]
    return {
      status: from,
      beforeId: col[fromIndex - 1]?.id ?? null,
      afterId: col[fromIndex + 1]?.id ?? null,
    }
  }

  if (overId === null || overId === activeId) return current()

  if (overId.startsWith(COLUMN_PREFIX)) {
    const status = overId.slice(COLUMN_PREFIX.length) as Status
    if (!STATUSES.includes(status)) return current()
    const rest = columns[status].filter(p => p.id !== activeId)
    return { status, beforeId: rest[rest.length - 1]?.id ?? null, afterId: null }
  }

  const status = findColumn(columns, overId)
  if (!status) return current()
  const overIndexOriginal = columns[status].findIndex(p => p.id === overId)
  const movingDown = status === from && fromIndex < overIndexOriginal
  const rest = columns[status].filter(p => p.id !== activeId)
  const i = rest.findIndex(p => p.id === overId)
  return movingDown
    ? { status, beforeId: overId, afterId: rest[i + 1]?.id ?? null }
    : { status, beforeId: rest[i - 1]?.id ?? null, afterId: overId }
}

/** resolveDrop, or null when the card would stay where it is. */
export function computeMove(
  columns: Record<Status, Project[]>,
  activeId: string,
  overId: string | null,
): DropResult | null {
  const next = resolveDrop(columns, activeId, overId)
  const cur = resolveDrop(columns, activeId, null)
  const same = next.status === cur.status && next.beforeId === cur.beforeId && next.afterId === cur.afterId
  return same ? null : next
}

const isColumnId = (id: UniqueIdentifier) => String(id).startsWith(COLUMN_PREFIX)

/**
 * Multiple-containers collision: the droppable under the pointer wins. A card under
 * the pointer beats its (enclosing) column; empty space inside a column resolves to
 * the column. Without pointer coordinates (keyboard) or in a gap, fall back to
 * closestCorners.
 */
export const kanbanCollision: CollisionDetection = args => {
  const hits = pointerWithin(args)
  if (hits.length > 0) {
    const card = hits.find(c => !isColumnId(c.id))
    return [card ?? hits[0]]
  }
  return closestCorners(args)
}

function dueState(p: Project, today: string) {
  return isOverdue(p, today) ? 'overdue' : isDueSoon(p, today) ? 'due-soon' : undefined
}

function Card({
  project,
  profiles,
  today,
  onOpen,
}: {
  project: Project
  profiles: Profile[]
  today: string
  onOpen: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
  const state = dueState(project, today)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    listeners?.onKeyDown?.(e)
    if (!isDragging && e.key === 'Enter') {
      e.preventDefault()
      onOpen(project.id)
    }
  }
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={() => onOpen(project.id)}
      data-state={state}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
      // Flat at rest; only the card being dragged floats (shadow + raised stacking).
      className={`flex cursor-grab flex-col gap-3 rounded-card border bg-surface p-3 text-left transition-[border-color,box-shadow] duration-150 ${
        isDragging ? 'relative z-10 cursor-grabbing border-control shadow-float' : 'border-border hover:border-control'
      }`}
    >
      <span className="min-w-0">
        <span className="block font-medium break-words">{project.title}</span>
        {project.description && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{project.description}</span>}
      </span>
      <ProjectMeta project={project} profiles={profiles} today={today} />
    </div>
  )
}

function Column({
  status,
  projects,
  profiles,
  today,
  onOpen,
}: {
  status: Status
  projects: Project[]
  profiles: Profile[]
  today: string
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${status}` })
  return (
    // Columns are not boxed: a bare header over the card stack, on the ground.
    // Desktop: 3 equal columns in the 1152px canvas, 3 x 376 + 2 x 12 (gap-3) = 1152.
    // Phone: 85% wide so the next column peeks in, snapping column by column.
    <section
      aria-label={STATUS_LABEL[status]}
      className="flex min-w-0 shrink-0 snap-start flex-col max-sm:w-[85%] sm:min-w-[232px] sm:flex-1 sm:basis-0"
    >
      <h2 className="mb-2 flex h-8 items-center gap-2 text-sm font-medium">
        {STATUS_LABEL[status]}
        <span className="num font-normal text-muted">{projects.length}</span>
      </h2>
      <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`-mx-1 flex min-h-24 flex-1 flex-col gap-2 rounded-card p-1 transition-colors ${isOver ? 'bg-active' : ''}`}
        >
          {projects.map(p => (
            <Card key={p.id} project={p} profiles={profiles} today={today} onOpen={onOpen} />
          ))}
          {projects.length === 0 && (
            <div className="flex h-20 items-center justify-center rounded-card border border-dashed border-control text-sm text-muted">
              Nenhum projeto
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  )
}

export function KanbanView({
  projects,
  profiles,
  today,
  onOpen,
  onMove,
}: {
  projects: Project[]
  profiles: Profile[]
  today: string
  onOpen: (id: string) => void
  onMove: (id: string, status: Status, beforeId: string | null, afterId: string | null) => void
}) {
  const columns = groupByStatus(projects)
  // Scroll-snap fights dnd-kit's auto-scroll (each step snaps back), so it is off during a drag.
  const [dragging, setDragging] = useState(false)
  const sensors = useSensors(
    // Mouse: small distance so a plain click still opens the card.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: press-and-hold so swiping still scrolls the board on phones.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter is reserved for opening the card; Space picks up / drops.
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter', 'Tab'] },
    }),
  )

  const titleOf = (id: UniqueIdentifier) => projects.find(p => p.id === id)?.title ?? String(id)
  const targetName = (id: UniqueIdentifier) => {
    const s = String(id)
    return isColumnId(s) ? STATUS_LABEL[s.slice(COLUMN_PREFIX.length) as Status] : titleOf(id)
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Projeto ${titleOf(active.id)} selecionado.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Projeto ${titleOf(active.id)} sobre ${targetName(over.id)}.`
        : `Projeto ${titleOf(active.id)} fora de uma coluna.`,
    onDragEnd: ({ active, over }) =>
      over ? `Projeto ${titleOf(active.id)} solto em ${targetName(over.id)}.` : `Projeto ${titleOf(active.id)} solto.`,
    onDragCancel: ({ active }) => `Movimento do projeto ${titleOf(active.id)} cancelado.`,
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id)
    const move = computeMove(columns, id, over ? String(over.id) : null)
    if (move) onMove(id, move.status, move.beforeId, move.afterId)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={() => setDragging(true)}
      onDragEnd={e => {
        setDragging(false)
        handleDragEnd(e)
      }}
      onDragCancel={() => setDragging(false)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Para mover o projeto, pressione espaço. Use as setas para escolher o destino e espaço de novo para soltar, ou Esc para cancelar. Enter abre o projeto.',
        },
      }}
    >
      <div
        className={`flex gap-3 overflow-x-auto pb-2 max-sm:-mx-4 max-sm:scroll-px-4 max-sm:px-4 sm:snap-none ${
          dragging ? 'snap-none' : 'snap-x snap-mandatory'
        }`}
      >
        {STATUSES.map(s => (
          <Column key={s} status={s} projects={columns[s]} profiles={profiles} today={today} onOpen={onOpen} />
        ))}
      </div>
    </DndContext>
  )
}
