import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createDb, asAdmin, asAnon, asUser, createAuthUser, CONFIG_PATH } from './harness'

const ALICE = '11111111-1111-4111-8111-111111111111'
const BOB = '22222222-2222-4222-8222-222222222222'
const CAROL = '33333333-3333-4333-8333-333333333333'

type Row = Record<string, unknown>

async function rows<T = Row>(db: PGlite, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows
}

describe('RLS e esquema (PGlite + migração real)', () => {
  let db: PGlite

  beforeAll(async () => {
    db = await createDb()
    await createAuthUser(db, ALICE, 'alice@example.com')
    await createAuthUser(db, BOB, 'bob@example.com')
  })

  afterAll(async () => {
    await db?.close()
  })

  it('RLS está ligada nas 3 tabelas', async () => {
    await asAdmin(db)
    const r = await rows<{ relname: string; relrowsecurity: boolean }>(
      db,
      `select relname, relrowsecurity from pg_class
        where relnamespace = 'public'::regnamespace
          and relname in ('profiles', 'projects', 'steps')
        order by relname`,
    )
    expect(r).toEqual([
      { relname: 'profiles', relrowsecurity: true },
      { relname: 'projects', relrowsecurity: true },
      { relname: 'steps', relrowsecurity: true },
    ])
  })

  it('nenhuma policy é concedida ao anon', async () => {
    await asAdmin(db)
    const r = await rows<{ tablename: string; roles: string }>(
      db,
      `select tablename, roles::text as roles from pg_policies where schemaname = 'public' order by tablename`,
    )
    expect(r.map((p) => p.tablename)).toEqual(['profiles', 'projects', 'steps'])
    for (const p of r) expect(p.roles).toBe('{authenticated}')
  })

  it('gatilho cria o profile com o e-mail do usuário novo', async () => {
    await asAdmin(db)
    const r = await rows(db, 'select id, email, display_name from public.profiles where id = $1', [ALICE])
    expect(r).toEqual([{ id: ALICE, email: 'alice@example.com', display_name: '' }])
  })

  describe('usuário autenticado', () => {
    let projectId: string
    let stepId: string

    it('cria projeto (created_by = auth.uid(), defaults aplicados)', async () => {
      await asUser(db, ALICE)
      const r = await rows<Row>(
        db,
        `insert into public.projects (title) values ('Projeto A') returning *`,
      )
      expect(r).toHaveLength(1)
      const p = r[0]
      projectId = p.id as string
      expect(p.created_by).toBe(ALICE)
      expect(p.status).toBe('planejado')
      expect(p.urgency).toBe('media')
      expect(p.description).toBe('')
      expect(p.position).toBe(0)
      expect(p.due_date).toBeNull()
      expect(p.completed_at).toBeNull()
      expect(p.created_at).toBeInstanceOf(Date)
      expect(p.updated_at).toBeInstanceOf(Date)
    })

    it('cria step com assignee_id = o próprio profile', async () => {
      await asUser(db, ALICE)
      const r = await rows<Row>(
        db,
        `insert into public.steps (project_id, title, assignee_id) values ($1, 'Passo 1', $2) returning *`,
        [projectId, ALICE],
      )
      expect(r).toHaveLength(1)
      stepId = r[0].id as string
      expect(r[0].done).toBe(false)
      expect(r[0].position).toBe(0)
      expect(r[0].assignee_id).toBe(ALICE)
    })

    it('edita projeto e step; updated_at avança no update', async () => {
      await asUser(db, ALICE)
      // Recém-inserido: updated_at = created_at (mesmo now()). Comparação feita
      // no SQL para manter a precisão de microssegundos.
      const [before] = await rows<{ same: boolean }>(
        db, 'select updated_at = created_at as same from public.projects where id = $1', [projectId],
      )
      expect(before.same).toBe(true)
      const upd = await rows<{ title: string; bumped: boolean }>(
        db,
        `update public.projects set title = 'Projeto A2' where id = $1
         returning title, updated_at > created_at as bumped`,
        [projectId],
      )
      expect(upd).toEqual([{ title: 'Projeto A2', bumped: true }])

      const s = await rows(db, 'update public.steps set done = true where id = $1 returning done', [stepId])
      expect(s).toEqual([{ done: true }])
    })

    it('segundo usuário autenticado lê e edita o projeto do primeiro', async () => {
      await asUser(db, BOB)
      const r = await rows(db, 'select title, created_by from public.projects where id = $1', [projectId])
      expect(r).toEqual([{ title: 'Projeto A2', created_by: ALICE }])
      const st = await rows(db, 'select id from public.steps where project_id = $1', [projectId])
      expect(st).toHaveLength(1)
      const upd = await rows(
        db,
        `update public.projects set status = 'em_execucao' where id = $1 returning status`,
        [projectId],
      )
      expect(upd).toEqual([{ status: 'em_execucao' }])
      const profiles = await rows(db, 'select id from public.profiles order by email')
      expect(profiles).toHaveLength(2)
    })

    it('apaga step e projeto', async () => {
      await asUser(db, ALICE)
      const ds = await rows(db, 'delete from public.steps where id = $1 returning id', [stepId])
      expect(ds).toHaveLength(1)
      const dp = await rows(db, 'delete from public.projects where id = $1 returning id', [projectId])
      expect(dp).toHaveLength(1)
      await asAdmin(db)
      expect(await rows(db, 'select 1 from public.projects where id = $1', [projectId])).toHaveLength(0)
    })
  })

  describe('anon', () => {
    beforeAll(async () => {
      await asUser(db, ALICE)
      const [p] = await rows<{ id: string }>(
        db, `insert into public.projects (title) values ('Visível só p/ autenticados') returning id`,
      )
      await db.query(`insert into public.steps (project_id, title) values ($1, 'passo')`, [p.id])
      await asAdmin(db)
      for (const t of ['profiles', 'projects', 'steps']) {
        const [{ n }] = await rows<{ n: number }>(db, `select count(*)::int as n from public.${t}`)
        expect(n).toBeGreaterThan(0)
      }
    })

    for (const table of ['profiles', 'projects', 'steps']) {
      it(`select em ${table} retorna vazio mesmo havendo linhas`, async () => {
        await asAnon(db)
        expect(await rows(db, `select * from public.${table}`)).toEqual([])
      })
    }

    it('insert em projects falha por RLS', async () => {
      await asAnon(db)
      await expect(
        db.query(`insert into public.projects (title, created_by) values ('hack', $1)`, [ALICE]),
      ).rejects.toThrow(/row-level security/)
    })

    it('update/delete em projects não afeta nenhuma linha', async () => {
      await asAnon(db)
      const u = await db.query(`update public.projects set title = 'hack'`)
      expect(u.affectedRows ?? 0).toBe(0)
      const d = await db.query(`delete from public.projects`)
      expect(d.affectedRows ?? 0).toBe(0)
      await asAdmin(db)
      expect(await rows(db, `select 1 from public.projects where title = 'hack'`)).toEqual([])
    })
  })

  describe('integridade referencial e constraints', () => {
    it('apagar projeto apaga os steps (cascade)', async () => {
      await asUser(db, ALICE)
      const [p] = await rows<{ id: string }>(db, `insert into public.projects (title) values ('C') returning id`)
      await db.query(`insert into public.steps (project_id, title) values ($1, 's1'), ($1, 's2')`, [p.id])
      await db.query('delete from public.projects where id = $1', [p.id])
      await asAdmin(db)
      expect(await rows(db, 'select 1 from public.steps where project_id = $1', [p.id])).toEqual([])
    })

    it('apagar profile põe steps.assignee_id = null', async () => {
      await createAuthUser(db, CAROL, 'carol@example.com')
      await asUser(db, ALICE)
      const [p] = await rows<{ id: string }>(db, `insert into public.projects (title) values ('D') returning id`)
      const [s] = await rows<{ id: string }>(
        db,
        `insert into public.steps (project_id, title, assignee_id) values ($1, 's', $2) returning id`,
        [p.id, CAROL],
      )
      await asAdmin(db)
      await db.query('delete from public.profiles where id = $1', [CAROL])
      expect(await rows(db, 'select assignee_id from public.steps where id = $1', [s.id])).toEqual([
        { assignee_id: null },
      ])
    })

    it('apagar auth.users apaga o profile (cascade)', async () => {
      const DAVE = '44444444-4444-4444-8444-444444444444'
      await createAuthUser(db, DAVE, 'dave@example.com')
      await db.query('delete from auth.users where id = $1', [DAVE])
      expect(await rows(db, 'select 1 from public.profiles where id = $1', [DAVE])).toEqual([])
    })

    it('status inválido é rejeitado; os 3 válidos são aceitos', async () => {
      await asUser(db, ALICE)
      await expect(
        db.query(`insert into public.projects (title, status) values ('x', 'invalido')`),
      ).rejects.toThrow(/check constraint/)
      for (const s of ['planejado', 'em_execucao', 'concluido']) {
        await db.query(`insert into public.projects (title, status) values ('x', $1)`, [s])
      }
    })

    it('urgency inválida é rejeitada; as 4 válidas são aceitas', async () => {
      await asUser(db, ALICE)
      await expect(
        db.query(`insert into public.projects (title, urgency) values ('x', 'altissima')`),
      ).rejects.toThrow(/check constraint/)
      for (const u of ['baixa', 'media', 'alta', 'critica']) {
        await db.query(`insert into public.projects (title, urgency) values ('x', $1)`, [u])
      }
    })

    it('created_by sem auth.uid() é rejeitado (not null)', async () => {
      await asAdmin(db)
      await expect(db.query(`insert into public.projects (title) values ('sem dono')`)).rejects.toThrow(
        /null value/,
      )
    })
  })
})

describe('config.toml', () => {
  it('cadastro desativado: enable_signup = false em [auth]', () => {
    const toml = readFileSync(CONFIG_PATH, 'utf8')
    let section = ''
    let value: string | undefined
    for (const raw of toml.split(/\r?\n/)) {
      const line = raw.replace(/#.*$/, '').trim()
      const header = line.match(/^\[([^\]]+)\]$/)
      if (header) {
        section = header[1].trim()
        continue
      }
      const kv = line.match(/^enable_signup\s*=\s*(\S+)$/)
      if (kv && section === 'auth') value = kv[1]
    }
    expect(value).toBe('false')
  })
})
