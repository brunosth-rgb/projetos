// Dev-only UI preview: the real app against in-memory sample data (`npm run preview:ui`).
// Swaps the Supabase client and the data repo for the fakes in dev/. Never used by `npm run build`.
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig, type UserConfig } from 'vite'
import baseConfig from './vite.config.ts'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig(async env => {
  const base = typeof baseConfig === 'function' ? await baseConfig(env) : baseConfig
  return mergeConfig(base as UserConfig, {
    resolve: {
      alias: [
        // Both modules are imported by relative specifiers ('../lib/supabase', '../data/repo').
        { find: /^(?:\.\.?\/)+lib\/supabase(?:\.ts)?$/, replacement: here('./dev/fakeSupabase.ts') },
        { find: /^(?:\.\.?\/)+data\/repo(?:\.ts)?$/, replacement: here('./dev/fakeRepo.ts') },
      ],
    },
  } satisfies UserConfig)
})
