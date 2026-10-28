import { createClient } from '@supabase/supabase-js'

// Só a chave anon (pública, protegida por RLS) é usada no navegador.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  console.error(
    'Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local',
  )
}

// Valores placeholder evitam falha na importação; chamadas de rede falham com erro claro do cliente.
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'missing-anon-key',
)
