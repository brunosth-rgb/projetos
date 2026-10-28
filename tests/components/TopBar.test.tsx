import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from '../../src/components/TopBar'
import { ThemeProvider } from '../../src/ui/theme'

function setup(userLabel = 'Bruno') {
  const onSignOut = vi.fn()
  render(
    <ThemeProvider>
      <TopBar userLabel={userLabel} onSignOut={onSignOut} />
    </ThemeProvider>,
  )
  return onSignOut
}

describe('TopBar', () => {
  it('mostra o produto, o tema e o usuário', () => {
    setup()
    expect(screen.getByText('Gerenciador de Projetos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Tema: / })).toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
  })

  it('Sair chama onSignOut', async () => {
    const onSignOut = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('sem rótulo de usuário mantém Sair', () => {
    setup('')
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })
})
