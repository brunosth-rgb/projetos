-- 0001_schema.sql
-- Esquema do gerenciador de projetos: profiles, projects, steps.
-- Fronteira de segurança: RLS ligada nas 3 tabelas; policies apenas para o
-- papel `authenticated`. Nenhuma policy para `anon` (anon não vê nem grava nada).
-- Depende do que o Supabase já fornece: schema auth, auth.users, auth.uid() e
-- os papéis anon/authenticated/service_role.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  email        text not null
);

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  status       text not null default 'planejado'
               check (status in ('planejado', 'em_execucao', 'concluido')),
  urgency      text not null default 'media'
               check (urgency in ('baixa', 'media', 'alta', 'critica')),
  due_date     date null,
  position     double precision not null default 0,
  created_by   uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz null
);

create table public.steps (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  position    double precision not null default 0,
  assignee_id uuid null references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index steps_project_id_idx on public.steps (project_id);
create index steps_assignee_id_idx on public.steps (assignee_id);
create index projects_created_by_idx on public.projects (created_by);

-- ---------------------------------------------------------------------------
-- Gatilho: cria o profile quando um usuário é criado em auth.users
-- security definer + search_path vazio: roda com o dono da função e só usa
-- nomes totalmente qualificados.
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

-- A função só deve ser chamada pelo gatilho, nunca via API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Gatilho: updated_at em projects
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: ligada nas 3 tabelas, acesso total apenas para `authenticated`
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.steps    enable row level security;

create policy "authenticated full access" on public.profiles
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.projects
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.steps
  for all to authenticated using (true) with check (true);
