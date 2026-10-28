// Dev-only stand-in for src/lib/supabase.ts (wired by vite.preview.config.ts; never in the deploy build).
// Implements only what AuthProvider uses. Starts signed in as Bruno unless the URL has ?login.
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { PEOPLE } from './sample-data'

// ?theme=light|dark|system pins the theme for screenshots (written where ThemeProvider reads it,
// before the app renders; this module is imported by AuthProvider, ahead of the first render).
{
  const theme = new URLSearchParams(window.location.search).get('theme')
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    try {
      localStorage.setItem('gp-theme', theme)
    } catch {
      // storage blocked: the inline script's choice stands
    }
    if (theme !== 'system') {
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.style.colorScheme = theme
    }
  }
  // ?view=lista|kanban picks the starting view the same way (App reads 'gp.view').
  const view = new URLSearchParams(window.location.search).get('view')
  if (view === 'lista' || view === 'kanban') {
    try {
      localStorage.setItem('gp.view', JSON.stringify(view))
    } catch {
      // ignore
    }
  }
}

type Listener = (event: AuthChangeEvent, session: Session | null) => void

function userFor(email: string): User {
  const person = PEOPLE.find(p => p.email === email.trim().toLowerCase()) ?? PEOPLE[0]
  return {
    id: person.id,
    email: person.email,
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: { display_name: person.display_name },
    created_at: new Date().toISOString(),
  } as User
}

function sessionFor(user: User): Session {
  return {
    access_token: 'preview',
    refresh_token: 'preview',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session
}

const startLoggedOut = new URLSearchParams(window.location.search).has('login')
let session: Session | null = startLoggedOut ? null : sessionFor(userFor(PEOPLE[0].email))
const listeners = new Set<Listener>()

function emit(event: AuthChangeEvent) {
  listeners.forEach(l => l(event, session))
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export const supabase = {
  auth: {
    async getSession() {
      return { data: { session }, error: null }
    },
    onAuthStateChange(cb: Listener) {
      listeners.add(cb)
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
    },
    async signInWithPassword({ email }: { email: string; password: string }) {
      await delay(300)
      session = sessionFor(userFor(email))
      emit('SIGNED_IN')
      return { data: { user: session.user, session }, error: null }
    },
    async signOut() {
      session = null
      emit('SIGNED_OUT')
      return { error: null }
    },
  },
}
