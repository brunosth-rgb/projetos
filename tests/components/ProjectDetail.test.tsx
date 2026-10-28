import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectDetail } from '../../src/components/ProjectDetail'
import type { Actions } from '../../src/state/useProjects'
import type { Profile, Project, Step } from '../../src/domain/types'

function step(over: Partial<Step> & { id: string }): Step {
  return { project_id: 'p1', title: over.id, done: false, position: 1000, assignee_id: null, created_at: '', ...over }
}

function mk(over: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    title: 'Projeto A',
    description: 'desc',
    status: 'planejado',
    urgency: 'media',
    due_date: null,
    position: 1,
    created_by: 'u1',
    created_at: '',
    updated_at: '',
    completed_at: null,
    steps: [],
    ...over,
  }
}

const profiles: Profile[] = [
  { id: 'u1', display_name: 'Ana', email: 'ana@x.com' },
  { id: 'u2', display_name: '', email: 'bob@x.com' },
]

function mkActions(): Actions {
  return {
    addProject: vi.fn().mockResolvedValue(undefined),
    editProject: vi.fn().mockResolvedValue(undefined),
    moveProject: vi.fn().mockResolvedValue(undefined),
    removeProject: vi.fn().mockResolvedValue(undefined),
    addStep: vi.fn().mockResolvedValue(undefined),
    editStep: vi.fn().mockResolvedValue(undefined),
    removeStep: vi.fn().mockResolvedValue(undefined),
  }
}

function setup(project: Project | null, actions = mkActions(), onClose = vi.fn()) {
  render(<ProjectDetail project={project} profiles={profiles} actions={actions} onClose={onClose} />)
  return { actions, onClose }
}

describe('ProjectDetail', () => {
  it('is an accessible dialog and closes on Escape', async () => {
    const { onClose } = setup(mk())
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('saves the title on blur', async () => {
    const { actions } = setup(mk())
    const input = screen.getByLabelText('Título')
    await userEvent.clear(input)
    await userEvent.type(input, 'Novo nome')
    await userEvent.tab()
    expect(actions.editProject).toHaveBeenCalledWith('p1', { title: 'Novo nome' })
  })

  it('does not save an empty title and restores the previous one', async () => {
    const { actions } = setup(mk())
    const input = screen.getByLabelText('Título')
    await userEvent.clear(input)
    await userEvent.type(input, '   ')
    await userEvent.tab()
    expect(actions.editProject).not.toHaveBeenCalled()
    expect(input).toHaveValue('Projeto A')
  })

  it('saves status and urgency on change', async () => {
    const { actions } = setup(mk())
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'concluido')
    expect(actions.editProject).toHaveBeenCalledWith('p1', { status: 'concluido' })
    await userEvent.selectOptions(screen.getByLabelText('Urgência'), 'alta')
    expect(actions.editProject).toHaveBeenCalledWith('p1', { urgency: 'alta' })
  })

  it('saves the description on blur', async () => {
    const { actions } = setup(mk())
    const input = screen.getByLabelText('Descrição')
    await userEvent.type(input, ' mais')
    await userEvent.tab()
    expect(actions.editProject).toHaveBeenCalledWith('p1', { description: 'desc mais' })
  })

  it('only removes the project after confirming', async () => {
    const { actions, onClose } = setup(mk())
    await userEvent.click(screen.getByRole('button', { name: 'Apagar projeto' }))
    expect(screen.getByText('Apagar este projeto e seus steps?')).toBeInTheDocument()
    expect(actions.removeProject).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(actions.removeProject).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Apagar projeto' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(actions.removeProject).toHaveBeenCalledWith('p1')
    expect(onClose).toHaveBeenCalled()
  })

  it('creation mode blocks an empty title and creates with defaults', async () => {
    const { actions, onClose } = setup(null)
    await userEvent.click(screen.getByRole('button', { name: 'Criar projeto' }))
    expect(actions.addProject).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um título')
    await userEvent.type(screen.getByLabelText('Título'), 'Meu projeto')
    await userEvent.click(screen.getByRole('button', { name: 'Criar projeto' }))
    expect(actions.addProject).toHaveBeenCalledWith({
      title: 'Meu projeto',
      description: '',
      urgency: 'media',
      due_date: null,
      status: 'planejado',
    })
    expect(onClose).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Apagar projeto' })).not.toBeInTheDocument()
  })
})

describe('StepChecklist', () => {
  const steps = [
    step({ id: 'b', title: 'Segundo', position: 2000 }),
    step({ id: 'a', title: 'Primeiro', position: 1000 }),
    step({ id: 'c', title: 'Terceiro', position: 3000 }),
  ]

  it('adds a step on Enter, trimmed, ignoring empty', async () => {
    const { actions } = setup(mk({ steps }))
    const input = screen.getByLabelText('Novo step')
    await userEvent.type(input, '   {Enter}')
    expect(actions.addStep).not.toHaveBeenCalled()
    await userEvent.clear(input)
    await userEvent.type(input, '  Fazer isso  {Enter}')
    expect(actions.addStep).toHaveBeenCalledWith('p1', 'Fazer isso')
    expect(input).toHaveValue('')
  })

  it('toggles done', async () => {
    const { actions } = setup(mk({ steps }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Primeiro' }))
    expect(actions.editStep).toHaveBeenCalledWith('a', { done: true })
  })

  it('the checkbox label is a hit area that toggles without renaming the checkbox', async () => {
    const { actions } = setup(mk({ steps }))
    const box = screen.getByRole('checkbox', { name: 'Primeiro' })
    const hit = box.closest('label') as HTMLElement
    expect(hit).toHaveClass('max-sm:p-2.5')
    await userEvent.click(hit)
    expect(actions.editStep).toHaveBeenCalledWith('a', { done: true })
    expect(box).toHaveClass('border-control-strong')
  })

  it('sets and clears the assignee', async () => {
    const { actions } = setup(mk({ steps: [step({ id: 'a', title: 'Primeiro', assignee_id: 'u1' })] }))
    const sel = screen.getByLabelText('Responsável por Primeiro')
    expect(sel).toHaveValue('u1')
    await userEvent.selectOptions(sel, 'u2')
    expect(actions.editStep).toHaveBeenCalledWith('a', { assignee_id: 'u2' })
    await userEvent.selectOptions(sel, 'Sem responsável')
    expect(actions.editStep).toHaveBeenCalledWith('a', { assignee_id: null })
    expect(screen.getByRole('option', { name: 'bob@x.com' })).toBeInTheDocument()
  })

  it('removes a step', async () => {
    const { actions } = setup(mk({ steps }))
    await userEvent.click(screen.getByRole('button', { name: 'Remover step Segundo' }))
    expect(actions.removeStep).toHaveBeenCalledWith('b')
  })

  it('sorts by position and reorders with up/down', async () => {
    const { actions } = setup(mk({ steps }))
    const boxes = screen.getAllByRole('checkbox').map(c => c.getAttribute('aria-label'))
    expect(boxes).toEqual(['Primeiro', 'Segundo', 'Terceiro'])
    expect(screen.getByRole('button', { name: 'Subir step Primeiro' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer step Terceiro' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Subir step Terceiro' }))
    expect(actions.editStep).toHaveBeenCalledWith('c', { position: 1500 })
    await userEvent.click(screen.getByRole('button', { name: 'Descer step Primeiro' }))
    expect(actions.editStep).toHaveBeenCalledWith('a', { position: 2500 })
  })
})

describe('ProjectDetail closing', () => {
  it('flushes an unblurred title edit on Escape', async () => {
    const { actions, onClose } = setup(mk())
    const input = screen.getByLabelText('Título')
    await userEvent.clear(input)
    await userEvent.type(input, 'Digitado')
    await userEvent.keyboard('{Escape}')
    expect(actions.editProject).toHaveBeenCalledTimes(1)
    expect(actions.editProject).toHaveBeenCalledWith('p1', { title: 'Digitado' })
    expect(onClose).toHaveBeenCalled()
  })

  it('flushes an unblurred title edit on backdrop mousedown', async () => {
    const { actions, onClose } = setup(mk())
    const input = screen.getByLabelText('Título')
    await userEvent.clear(input)
    await userEvent.type(input, 'Digitado')
    await userEvent.pointer({ keys: '[MouseLeft>]', target: screen.getByRole('dialog').parentElement as HTMLElement })
    expect(actions.editProject).toHaveBeenCalledTimes(1)
    expect(actions.editProject).toHaveBeenCalledWith('p1', { title: 'Digitado' })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not save an empty title on Escape but still closes', async () => {
    const { actions, onClose } = setup(mk())
    await userEvent.clear(screen.getByLabelText('Título'))
    await userEvent.keyboard('{Escape}')
    expect(actions.editProject).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('create mode: dirty form ignores backdrop but closes on Escape', async () => {
    const { onClose } = setup(null)
    await userEvent.type(screen.getByLabelText('Título'), 'Algo')
    await userEvent.pointer({ keys: '[MouseLeft>]', target: screen.getByRole('dialog').parentElement as HTMLElement })
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('create mode: pristine form closes on backdrop', async () => {
    const { onClose } = setup(null)
    await userEvent.pointer({ keys: '[MouseLeft>]', target: screen.getByRole('dialog').parentElement as HTMLElement })
    expect(onClose).toHaveBeenCalled()
  })
})
