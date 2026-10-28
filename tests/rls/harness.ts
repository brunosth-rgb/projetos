// Harness RLS sobre PGlite (Postgres em memória). Não há Docker nesta máquina,
// então simulamos o mínimo que o Supabase fornece antes das migrações:
// os papéis anon/authenticated/service_role, o schema auth com auth.users e
// auth.uid(), e os grants padrão do Supabase. A migração real é lida do disco
// e aplicada sem alterações.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

export const ROOT = resolve(import.meta.dirname, '..', '..')
export const MIGRATION_PATH = resolve(ROOT, 'supabase', 'migrations', '0001_schema.sql')
export const CONFIG_PATH = resolve(ROOT, 'supabase', 'config.toml')

const SUPABASE_BOOTSTRAP = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`

// Equivalente aos grants padrão que o Supabase aplica ao schema public
// (default privileges, valem para objetos criados depois, como na migração):
// anon e authenticated têm privilégios de tabela, então quem barra o anon é a RLS.
const SUPABASE_DEFAULT_GRANTS = `
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`

export async function createDb(): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(SUPABASE_BOOTSTRAP)
  await db.exec(SUPABASE_DEFAULT_GRANTS)
  await db.exec(readFileSync(MIGRATION_PATH, 'utf8'))
  return db
}

/** Volta ao superusuário (equivalente ao service role / admin). */
export async function asAdmin(db: PGlite): Promise<void> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
}

export async function asAnon(db: PGlite): Promise<void> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`)
}

export async function asUser(db: PGlite, uid: string): Promise<void> {
  await db.exec('reset role')
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid])
  await db.exec('set role authenticated')
}

/** Cria um usuário em auth.users como admin (o gatilho deve criar o profile). */
export async function createAuthUser(db: PGlite, id: string, email: string): Promise<void> {
  await asAdmin(db)
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email])
}
