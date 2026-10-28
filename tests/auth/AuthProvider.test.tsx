import { render, screen, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Cb = (event: string, session: unknown) => void
const h = vi.hoisted(() => ({
  session: null as unknown,
  cb: null as null | ((event: string, session: unknown) => void),
}))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: h.session } })),
      onAuthStateChange: vi.fn((cb: Cb) => {
        h.cb = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}))

import { AuthProvider } from '../../src/auth/AuthProvider'

const session = { user: { id: 'u1', email: 'a@b.com' } }

describe('AuthProvider', () => {
  beforeEach(() => {
    h.session = null
    h.cb = null
  })

  it('sem sessão mostra a tela de login', async () => {
    render(<AuthProvider><p>conteúdo</p></AuthProvider>)
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByText('conteúdo')).toBeNull()
  })

  it('com sessão mostra os filhos', async () => {
    h.session = session
    render(<AuthProvider><p>conteúdo</p></AuthProvider>)
    expect(await screen.findByText('conteúdo')).toBeInTheDocument()
  })

  it('SIGNED_OUT volta para o login', async () => {
    h.session = session
    render(<AuthProvider><p>conteúdo</p></AuthProvider>)
    await screen.findByText('conteúdo')
    act(() => h.cb!('SIGNED_OUT', null))
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByText('conteúdo')).toBeNull()
  })
})
