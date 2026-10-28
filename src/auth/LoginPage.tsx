import { useState, type FormEvent } from 'react'
import { ProductMark } from '../components/ProductMark'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email, password)
    } catch {
      setError('E-mail ou senha inválidos')
    } finally {
      setBusy(false)
    }
  }

  const field =
    'h-10 rounded-control border border-control bg-surface px-3 text-sm text-ink transition-colors hover:border-faint focus-visible:border-ink'
  const labelCls = 'flex flex-col gap-1.5 text-sm font-medium'

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-4 py-10 text-ink">
      <div className="w-full max-w-[360px] rounded-card border border-border bg-surface p-8 max-sm:p-6">
        <div className="mb-6 flex items-center gap-2 text-sm font-medium">
          <ProductMark />
          <span>Gerenciador de Projetos</span>
        </div>
        <h1 className="mb-5 text-2xl leading-8 font-semibold tracking-[-0.01em]">Entrar</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className={labelCls}>
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </label>
          <label className={labelCls}>
            Senha
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-negative">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-10 rounded-control bg-primary px-3 text-sm font-medium text-primary-ink transition-opacity hover:opacity-85 active:opacity-75 disabled:opacity-60"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  )
}
