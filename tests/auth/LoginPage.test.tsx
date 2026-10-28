import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const signIn = vi.fn()
vi.mock('../../src/auth/AuthProvider', () => ({
  useAuth: () => ({ user: null, loading: false, signIn, signOut: vi.fn() }),
}))

import { LoginPage } from '../../src/auth/LoginPage'

describe('LoginPage', () => {
  it('renderiza campos e botão, sem link de criar conta', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByText(/criar conta/i)).toBeNull()
  })

  it('exibe erro quando signIn rejeita', async () => {
    signIn.mockRejectedValueOnce(new Error('x'))
    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText('E-mail'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'errada')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument()
    expect(signIn).toHaveBeenCalledWith('a@b.com', 'errada')
  })
})
