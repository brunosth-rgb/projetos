const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

export function assertSupabaseEnv(env: Record<string, string | undefined>): void {
  const missing = REQUIRED.filter((name) => !env[name]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Build de produção abortado: variável(is) de ambiente ausente(s) ou vazia(s): ${missing.join(', ')}. ` +
        'Defina-as (no GitHub: Settings → Secrets and variables → Actions) para não publicar um site sem conexão com o Supabase.',
    )
  }
}
