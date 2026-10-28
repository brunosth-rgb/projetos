import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

// Keep in sync with the inline script in index.html.
export const THEME_KEY = 'gp-theme'
const QUERY = '(prefers-color-scheme: dark)'

interface ThemeValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference(p: ThemePreference): void
}

const ThemeContext = createContext<ThemeValue | null>(null)

function isPreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark'
}

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return isPreference(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

function writePreference(p: ThemePreference) {
  try {
    localStorage.setItem(THEME_KEY, p)
  } catch {
    // storage blocked: the choice lasts for this session only
  }
}

function mediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>(readPreference)
  const [systemDark, setSystemDark] = useState(() => mediaQuery()?.matches ?? false)

  useEffect(() => {
    const mq = mediaQuery()
    if (!mq) return
    const onChange = (e: { matches: boolean }) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved: ResolvedTheme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', resolved)
    root.style.colorScheme = resolved
  }, [resolved])

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p)
    writePreference(p)
  }, [])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}

const LABEL: Record<ThemePreference, string> = { system: 'Sistema', light: 'Claro', dark: 'Escuro' }
const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  const common = {
    width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
  }
  if (preference === 'light') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
      </svg>
    )
  }
  if (preference === 'dark') {
    return (
      <svg {...common}>
        <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.25" />
      <path d="M5.5 14h5M8 11.25V14" />
    </svg>
  )
}

/** Cycles Sistema → Claro → Escuro. The accessible name states the current choice. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const label = `Tema: ${LABEL[preference]}`
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (clique para trocar)`}
      onClick={() => setPreference(NEXT[preference])}
      className={`inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-sm text-muted transition-colors hover:bg-active hover:text-ink max-sm:h-11 max-sm:min-w-11 max-sm:justify-center ${className}`}
    >
      <ThemeIcon preference={preference} />
      <span className="max-sm:hidden">{LABEL[preference]}</span>
    </button>
  )
}
