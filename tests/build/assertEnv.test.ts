import { describe, it, expect } from 'vitest'
import { assertSupabaseEnv } from '../../build/assertEnv'

describe('assertSupabaseEnv', () => {
  it('passa quando as duas variáveis estão definidas', () => {
    expect(() =>
      assertSupabaseEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }),
    ).not.toThrow()
  })

  it('falha nomeando a variável ausente', () => {
    expect(() => assertSupabaseEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toThrow(
      /VITE_SUPABASE_ANON_KEY/,
    )
  })

  it('trata valor vazio ou só espaços como ausente e lista todas', () => {
    expect(() => assertSupabaseEnv({ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_ANON_KEY: '' })).toThrow(
      /VITE_SUPABASE_URL.*VITE_SUPABASE_ANON_KEY/s,
    )
  })
})
