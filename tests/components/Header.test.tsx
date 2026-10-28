import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Header, type Filters, type View } from '../../src/components/Header'

const filters: Filters = { showDone: false, statuses: null, mine: false }

function renderHeader(view: View) {
  render(
    <Header
      view={view}
      onViewChange={() => {}}
      filters={filters}
      onFiltersChange={() => {}}
    />,
  )
}

describe('Header', () => {
  it('na lista mostra Mostrar concluídos, Status e Meus steps', () => {
    renderHeader('lista')
    expect(screen.getByRole('checkbox', { name: 'Mostrar concluídos' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Meus steps' })).toBeInTheDocument()
  })

  it('no kanban esconde Mostrar concluídos e Status, mantém Meus steps', () => {
    renderHeader('kanban')
    expect(screen.queryByRole('checkbox', { name: 'Mostrar concluídos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Status' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Meus steps' })).toBeInTheDocument()
  })

  it('Novo projeto e Sair não ficam mais na barra de ferramentas', () => {
    renderHeader('lista')
    expect(screen.queryByRole('button', { name: 'Novo projeto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })
})
