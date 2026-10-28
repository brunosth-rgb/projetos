import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, ThemeToggle, useTheme } from '../../src/ui/theme'

type Listener = (e: { matches: boolean }) => void

function mockMatchMedia(initialDark: boolean) {
  const mq = {
    matches: initialDark,
    listeners: new Set<Listener>(),
    addEventListener: (_: string, l: Listener) => mq.listeners.add(l),
    removeEventListener: (_: string, l: Listener) => mq.listeners.delete(l),
    set(dark: boolean) {
      mq.matches = dark
      mq.listeners.forEach(l => l({ matches: dark }))
    },
  }
  vi.stubGlobal('matchMedia', vi.fn(() => mq))
  return mq
}

function Probe() {
  const { preference, resolved, setPreference } = useTheme()
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      <button type="button" onClick={() => setPreference('dark')}>escuro</button>
      <button type="button" onClick={() => setPreference('system')}>sistema</button>
    </div>
  )
}

function setup() {
  return render(
    <ThemeProvider>
      <Probe />
      <ThemeToggle />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('theme', () => {
  it('padrão é system e resolve pelo matchMedia', () => {
    mockMatchMedia(true)
    setup()
    expect(screen.getByTestId('pref')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('valor salvo válido vence', () => {
    mockMatchMedia(true)
    localStorage.setItem('gp-theme', 'light')
    setup()
    expect(screen.getByTestId('pref')).toHaveTextContent('light')
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
  })

  it('valor corrompido cai em system', () => {
    mockMatchMedia(false)
    localStorage.setItem('gp-theme', '{oops')
    setup()
    expect(screen.getByTestId('pref')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
  })

  it('localStorage bloqueado não quebra', async () => {
    mockMatchMedia(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    setup()
    expect(screen.getByTestId('pref')).toHaveTextContent('system')
    await userEvent.click(screen.getByText('escuro'))
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })

  it('sem matchMedia resolve light', () => {
    vi.stubGlobal('matchMedia', undefined)
    setup()
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
  })

  it('setPreference persiste e aplica data-theme', async () => {
    mockMatchMedia(false)
    setup()
    await userEvent.click(screen.getByText('escuro'))
    expect(localStorage.getItem('gp-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('mudança do sistema atualiza quando a preferência é system', async () => {
    const mq = mockMatchMedia(false)
    setup()
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
    act(() => mq.set(true))
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    await userEvent.click(screen.getByText('escuro'))
    act(() => mq.set(false))
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })

  it('ThemeToggle alterna Sistema → Claro → Escuro com nomes acessíveis', async () => {
    mockMatchMedia(false)
    setup()
    const btn = () => screen.getByRole('button', { name: /^Tema: / })
    expect(btn()).toHaveAccessibleName('Tema: Sistema')
    await userEvent.click(btn())
    expect(btn()).toHaveAccessibleName('Tema: Claro')
    expect(localStorage.getItem('gp-theme')).toBe('light')
    await userEvent.click(btn())
    expect(btn()).toHaveAccessibleName('Tema: Escuro')
    await userEvent.click(btn())
    expect(btn()).toHaveAccessibleName('Tema: Sistema')
  })
})
