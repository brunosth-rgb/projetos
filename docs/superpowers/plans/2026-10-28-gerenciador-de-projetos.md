# Gerenciador de Projetos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SPA em React que gerencia projetos (lista e kanban), steps com responsável, prazo e urgência, publicada no GitHub Pages com dados protegidos por login no Supabase.

**Architecture:** O front-end estático fala direto com o Supabase (`supabase-js`). A segurança está nas regras RLS (somente usuários autenticados) e no cadastro público desativado. A lógica de ordenação, prazos e filtros fica em funções puras, testadas isoladamente. Um hook central (`useProjects`) faz atualização otimista com rollback.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), dnd-kit, `@supabase/supabase-js`, Vitest + Testing Library, Supabase CLI (banco local para testes RLS), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-28-gerenciador-de-projetos-design.md`

## Global Constraints

- Status (valores exatos): `planejado` | `em_execucao` | `concluido`. Rótulos: "Planejado", "Em execução", "Concluído".
- Urgência (valores exatos, da mais para a menos urgente): `critica` > `alta` > `media` > `baixa`. Rótulos: "Crítica", "Alta", "Média", "Baixa".
- Vencimento próximo = prazo em até 3 dias (inclusive hoje); atrasado = prazo anterior a hoje e status diferente de `concluido`.
- Lista: ordena por urgência (crítica primeiro), depois prazo (mais próximo primeiro). Concluídos ficam ocultos por padrão.
- Um responsável por step, opcional. Cadastro público desativado (`enable_signup = false`). RLS: só `authenticated` lê e escreve em `projects`, `steps` e `profiles`; `anon` não pode nada.
- Vite `base` = `/<nome-do-repo>/` (variável `VITE_BASE`). A chave `anon` e a URL entram como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nunca usar a `service_role` no front-end.
- Todo texto da interface em português. Sem modo offline, sem tempo real.

## Review Focus

1. Projeto sem prazo (`due_date` nulo): vai para o fim da ordenação por prazo, nunca é atrasado, a interface mostra "Sem prazo". (`due_date` é opcional; a spec não fixa isso.)
2. Projeto sem steps: progresso "0/0" (sem NaN), sem barra quebrada.
3. Prazo é só data (`YYYY-MM-DD`): comparar com a data local de hoje, não com UTC (evita erro de um dia).
4. Perfil com `display_name` vazio: a interface usa o e-mail como rótulo.
5. Mover um projeto para fora de `concluido` zera `completed_at`; soltar em coluna vazia do kanban funciona.

---

## File Structure

```
package.json, vite.config.ts, tsconfig*.json, index.html, .env.example
.github/workflows/deploy.yml
supabase/config.toml, supabase/migrations/0001_schema.sql
src/main.tsx, src/App.tsx, src/index.css
src/domain/types.ts        # tipos compartilhados
src/domain/projects.ts     # funções puras: ordenação, prazos, progresso, filtros, posição
src/lib/supabase.ts        # cliente
src/data/repo.ts           # acesso ao Supabase (única camada que o conhece)
src/auth/AuthProvider.tsx, src/auth/LoginPage.tsx
src/state/useProjects.ts   # estado + atualização otimista + rollback
src/ui/Toast.tsx, src/ui/labels.ts
src/components/Header.tsx, ListView.tsx, KanbanView.tsx, ProjectDetail.tsx, StepChecklist.tsx, ProjectMeta.tsx
tests/ (espelha src/), tests/rls/rls.test.ts
```

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `tests/setup.ts`, `tests/App.test.tsx`, `.env.example`, `.gitignore`

**Interfaces:**
- Produces: scripts `dev`, `build`, `test` (`vitest run`); alias de teste com jsdom e `@testing-library/jest-dom`.

- [ ] **Step 1: Escrever o teste que falha** em `tests/App.test.tsx`: renderiza `<App />` e espera `screen.getByText('Gerenciador de Projetos')`.
- [ ] **Step 2: Rodar** `npx vitest run tests/App.test.tsx`. Esperado: FAIL (App não existe).
- [ ] **Step 3: Montar o scaffold.** `npm create vite@latest . -- --template react-ts`, instalar `tailwindcss @tailwindcss/vite @supabase/supabase-js @dnd-kit/core @dnd-kit/sortable` e (dev) `vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`. `vite.config.ts`: plugins react + tailwind, `base: process.env.VITE_BASE ?? '/'`, bloco `test` com `environment: 'jsdom'`, `setupFiles: ['tests/setup.ts']`, `exclude` incluindo `tests/rls/**`. `src/index.css` com `@import "tailwindcss";`. `App` renderiza o título. `.env.example` lista as 3 variáveis; `.gitignore` inclui `.env*` (menos o exemplo) e `node_modules`, `dist`.
- [ ] **Step 4: Rodar** `npx vitest run` e `npm run build`. Esperado: PASS e build sem erros.
- [ ] **Step 5: Commit** `chore: scaffold vite react ts tailwind vitest`.

---

### Task 2: Domínio (tipos e funções puras)

**Files:**
- Create: `src/domain/types.ts`, `src/domain/projects.ts`, `src/ui/labels.ts`
- Test: `tests/domain/projects.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  `type Status = 'planejado'|'em_execucao'|'concluido'`; `type Urgency = 'baixa'|'media'|'alta'|'critica'`;
  `interface Step { id: string; project_id: string; title: string; done: boolean; position: number; assignee_id: string|null; created_at: string }`;
  `interface Project { id: string; title: string; description: string; status: Status; urgency: Urgency; due_date: string|null; position: number; created_by: string; created_at: string; updated_at: string; completed_at: string|null; steps: Step[] }`;
  `interface Profile { id: string; display_name: string; email: string }`.
- Produces (`projects.ts`):
  `todayLocal(now?: Date): string` (YYYY-MM-DD local);
  `isOverdue(p: Project, today: string): boolean`;
  `isDueSoon(p: Project, today: string): boolean`;
  `stepProgress(p: Project): { done: number; total: number }`;
  `sortProjects(ps: Project[]): Project[]` (não muta);
  `filterProjects(ps: Project[], f: { showDone: boolean; statuses: Status[] | null; mineUserId: string | null }): Project[]`; `mineUserId` mantém só projetos com ao menos um step `!done` e `assignee_id === mineUserId`;
  `positionBetween(before: number|null, after: number|null): number` (ambos nulos → 1000; só `before` → `before+1000`; só `after` → `after-1000`; ambos → ponto médio);
  `profileLabel(p: Profile): string` (`display_name` se não vazio, senão `email`).
- Produces (`labels.ts`): `STATUS_LABEL`, `URGENCY_LABEL` (`Record`s com os rótulos das Global Constraints) e `URGENCY_RANK: Record<Urgency, number>`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/domain/projects.test.ts` (com um helper `makeProject(overrides)`). Asserções:
  - `sortProjects`: `[alta 10/11, critica 12/11, alta 05/11]` → ordem `critica`, `alta 05/11`, `alta 10/11`; projeto sem prazo fica depois dos com prazo de mesma urgência.
  - `isOverdue`: prazo `2026-10-27`, hoje `2026-10-28`, status `em_execucao` → true; mesmo com `concluido` → false; `due_date: null` → false.
  - `isDueSoon`: hoje+3 → true; hoje+4 → false; hoje → true; atrasado → false.
  - `todayLocal(new Date(2026, 9, 28, 23, 30))` → `'2026-10-28'` (não deslocar por UTC).
  - `stepProgress`: sem steps → `{done:0,total:0}`; 3 de 7 → `{done:3,total:7}`.
  - `filterProjects`: `showDone:false` remove `concluido`; `mineUserId:'u1'` só retorna projetos com step pendente de `u1`; step já `done` de `u1` não conta.
  - `positionBetween(null,null)=1000`, `(1000,null)=2000`, `(null,1000)=0`, `(1000,2000)=1500`.
  - `profileLabel({display_name:'',email:'a@b.c'})='a@b.c'`.
- [ ] **Step 2: Rodar** `npx vitest run tests/domain`. Esperado: FAIL.
- [ ] **Step 3: Implementar** os módulos acima. Comparar datas como strings `YYYY-MM-DD` (ordem lexicográfica serve); para "hoje+3" somar dias com `new Date(y, m-1, d + n)` local, nunca `Date.parse` de ISO.
- [ ] **Step 4: Rodar** `npx vitest run tests/domain`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(domain): tipos e funções puras de projetos`.

---

### Task 3: Banco, RLS e testes de segurança

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/0001_schema.sql`, `tests/rls/rls.test.ts`, script `test:rls` no `package.json`

**Interfaces:**
- Produces (tabelas): `profiles(id uuid pk references auth.users on delete cascade, display_name text not null default '', email text not null)`; `projects(id uuid pk default gen_random_uuid(), title text not null, description text not null default '', status text not null default 'planejado' check in os 3 valores, urgency text not null default 'media' check in os 4 valores, due_date date null, position double precision not null default 0, created_by uuid not null default auth.uid() references profiles(id), created_at, updated_at, completed_at timestamptz null)`; `steps(id uuid pk, project_id uuid not null references projects on delete cascade, title text not null, done boolean not null default false, position double precision not null default 0, assignee_id uuid null references profiles(id) on delete set null, created_at timestamptz not null default now())`.
- Produces: gatilho `on auth.users insert` que cria o `profiles` (com `email`); gatilho `updated_at` em `projects`; RLS ligada nas 3 tabelas com policies `for all to authenticated using (true) with check (true)`; `enable_signup = false` em `[auth]` no `config.toml`.

- [ ] **Step 1: Escrever os testes RLS que falham** em `tests/rls/rls.test.ts` (env `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` do banco local). Cenários:
  - cliente anônimo: `select` em cada tabela retorna lista vazia (RLS filtra) e `insert` em `projects` retorna erro;
  - usuário criado pela API admin (service key) com e-mail/senha faz login, cria projeto, cria step com `assignee_id` = o próprio id, edita e apaga; um segundo usuário autenticado lê esse projeto e o edita;
  - `profiles` do usuário novo existe com o e-mail correto (gatilho);
  - `signUp` pelo cliente anônimo falha (cadastro desativado);
  - apagar o projeto apaga os steps.
- [ ] **Step 2: Rodar** `npx supabase start` e depois `npm run test:rls` (`vitest run --config vitest.rls.config.ts` com `environment: 'node'`, `include: tests/rls/**`). Esperado: FAIL (tabelas não existem).
- [ ] **Step 3: Escrever a migração** `0001_schema.sql` conforme as Interfaces e aplicar com `npx supabase db reset`.
- [ ] **Step 4: Rodar** `npm run test:rls`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(db): esquema, RLS e testes de segurança`.

---

### Task 4: Cliente Supabase, repositório e autenticação

**Files:**
- Create: `src/lib/supabase.ts`, `src/data/repo.ts`, `src/auth/AuthProvider.tsx`, `src/auth/LoginPage.tsx`
- Test: `tests/auth/LoginPage.test.tsx`, `tests/auth/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: tipos da Task 2.
- Produces (`supabase.ts`): `export const supabase: SupabaseClient` (lê as variáveis `VITE_*`).
- Produces (`repo.ts`, todas lançam `Error` se o Supabase devolver erro):
  `listProjects(): Promise<Project[]>` (`select('*, steps(*)')`, steps ordenados por `position`);
  `listProfiles(): Promise<Profile[]>`;
  `createProject(input: { title: string; description?: string; urgency: Urgency; due_date: string|null; status: Status; position: number }): Promise<Project>`;
  `updateProject(id: string, patch: Partial<Pick<Project,'title'|'description'|'status'|'urgency'|'due_date'|'position'|'completed_at'>>): Promise<void>`;
  `deleteProject(id: string): Promise<void>`;
  `createStep(projectId: string, title: string, position: number): Promise<Step>`;
  `updateStep(id: string, patch: Partial<Pick<Step,'title'|'done'|'position'|'assignee_id'>>): Promise<void>`;
  `deleteStep(id: string): Promise<void>`.
- Produces (`AuthProvider.tsx`): `AuthProvider({ children })` e hook `useAuth(): { user: User | null; loading: boolean; signIn(email: string, password: string): Promise<void>; signOut(): Promise<void> }`. Sem sessão, renderiza `<LoginPage />` em vez de `children`. Escuta `onAuthStateChange`, então sessão expirada volta ao login.

- [ ] **Step 1: Escrever os testes que falham.** `LoginPage`: renderiza campos "E-mail" e "Senha" e botão "Entrar"; sem link de criar conta (`queryByText(/criar conta/i)` nulo); quando `signIn` rejeita, exibe "E-mail ou senha inválidos". `AuthProvider` (com `supabase` mockado via `vi.mock`): sem sessão mostra a tela de login; com sessão mostra os filhos; evento `SIGNED_OUT` do `onAuthStateChange` volta para a tela de login.
- [ ] **Step 2: Rodar** `npx vitest run tests/auth`. Esperado: FAIL.
- [ ] **Step 3: Implementar** os quatro arquivos. `repo.ts` é a única camada que importa `supabase`.
- [ ] **Step 4: Rodar** `npx vitest run tests/auth`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(auth): login, sessão e repositório de dados`.

---

### Task 5: Estado com atualização otimista e toasts

**Files:**
- Create: `src/state/useProjects.ts`, `src/ui/Toast.tsx`
- Test: `tests/state/useProjects.test.tsx`

**Interfaces:**
- Consumes: `repo.ts` (Task 4) e `positionBetween` (Task 2).
- Produces: `useProjects(): { projects: Project[]; profiles: Profile[]; loading: boolean; loadError: string|null; reload(): Promise<void>; actions: Actions }` com
  `Actions = { addProject(input: NewProjectInput): Promise<void>; editProject(id, patch): Promise<void>; moveProject(id: string, status: Status, beforeId: string|null, afterId: string|null): Promise<void>; removeProject(id): Promise<void>; addStep(projectId, title): Promise<void>; editStep(stepId, patch): Promise<void>; removeStep(stepId): Promise<void> }`.
  Toda ação altera o estado local primeiro e chama o `repo`; se o `repo` rejeitar, restaura o estado anterior e chama `pushToast({ message, retry })`. `moveProject` define `completed_at = agora` ao entrar em `concluido` e `null` ao sair dele; calcula `position` com `positionBetween` usando as posições dos vizinhos.
- Produces (`Toast.tsx`): `ToastProvider`, `useToast(): { pushToast(t: { message: string; retry?: () => void }): void }`; renderiza o aviso com botão "Tentar de novo" quando há `retry`.

- [ ] **Step 1: Escrever os testes que falham** (com `repo` mockado): 
  - o carregamento inicial popula `projects` e `profiles`; falha no `listProjects` define `loadError` e deixa `projects` vazio;
  - `editProject` com `repo.updateProject` rejeitando: o estado volta ao valor anterior e `pushToast` é chamado com `retry`;
  - `moveProject(id, 'concluido', …)` chama `updateProject` com `status:'concluido'` e `completed_at` não nulo; mover de `concluido` para `em_execucao` envia `completed_at: null`;
  - `moveProject` para coluna vazia (`beforeId` e `afterId` nulos) usa `position` 1000;
  - `addStep` anexa o step ao projeto certo.
- [ ] **Step 2: Rodar** `npx vitest run tests/state`. Esperado: FAIL.
- [ ] **Step 3: Implementar** hook e toast. Uma função interna `optimistic(apply, persist, errorMessage)` evita repetir o padrão de rollback nas ações.
- [ ] **Step 4: Rodar** `npx vitest run tests/state`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(state): useProjects com rollback e toasts`.

---

### Task 6: Visão em lista e filtros

**Files:**
- Create: `src/components/ListView.tsx`, `src/components/ProjectMeta.tsx`, `src/components/Header.tsx`
- Test: `tests/components/ListView.test.tsx`

**Interfaces:**
- Consumes: `sortProjects`, `filterProjects`, `isOverdue`, `isDueSoon`, `stepProgress`, `profileLabel`, rótulos.
- Produces: `ProjectMeta({ project, profiles, today })` (urgência com cor, prazo ou "Sem prazo", progresso `3/7`, responsáveis dos steps pendentes; reutilizado pelo kanban);
  `ListView({ projects, profiles, today, onOpen(id: string): void })` (recebe a lista já filtrada e a ordena);
  `Header({ view: 'lista'|'kanban'; onViewChange(v): void; filters: Filters; onFiltersChange(f): void; onNew(): void; onSignOut(): void })` com `Filters = { showDone: boolean; statuses: Status[] | null; mine: boolean }`, os botões "Lista"/"Kanban", checkbox "Mostrar concluídos", seletor de status, toggle "Meus steps", "Novo projeto" e "Sair".

- [ ] **Step 1: Escrever os testes que falham:** ordem das linhas segue a regra (crítica antes de alta; prazo mais próximo antes); linha de projeto atrasado tem `data-state="overdue"`, a de vencimento próximo tem `data-state="due-soon"`; projeto sem steps mostra "0/0"; projeto sem prazo mostra "Sem prazo"; step pendente com responsável sem `display_name` mostra o e-mail; clicar na linha chama `onOpen(id)`; no `Header`, marcar "Mostrar concluídos" chama `onFiltersChange` com `showDone:true`.
- [ ] **Step 2: Rodar** `npx vitest run tests/components/ListView.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar** os três componentes.
- [ ] **Step 4: Rodar** o mesmo comando. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(ui): visão em lista, metadados e cabeçalho com filtros`.

---

### Task 7: Detalhe do projeto e checklist de steps

**Files:**
- Create: `src/components/ProjectDetail.tsx`, `src/components/StepChecklist.tsx`
- Test: `tests/components/ProjectDetail.test.tsx`

**Interfaces:**
- Consumes: `Actions` (Task 5), `Profile`, `profileLabel`.
- Produces: `ProjectDetail({ project: Project | null; profiles: Profile[]; actions: Actions; onClose(): void })` (modal; com `project: null` abre em modo de criação, com os mesmos campos, e salva via `actions.addProject`); campos título, descrição, status, urgência, prazo; botão "Apagar projeto" abre confirmação "Apagar este projeto e seus steps?";
  `StepChecklist({ projectId, steps, profiles, actions })`: adicionar step (campo "Novo step" + Enter), marcar feito, seletor de responsável (opção "Sem responsável" + perfis), remover e reordenar (botões subir/descer que usam `positionBetween` via `actions.editStep`).

- [ ] **Step 1: Escrever os testes que falham:** editar o título e sair do campo chama `actions.editProject(id, { title })`; digitar em "Novo step" + Enter chama `actions.addStep(id, texto)`; marcar um step chama `actions.editStep(stepId, { done: true })`; escolher um perfil no seletor chama `editStep(stepId, { assignee_id })`; "Sem responsável" envia `assignee_id: null`; "Apagar projeto" só chama `removeProject` depois de confirmar; título vazio não é salvo.
- [ ] **Step 2: Rodar** `npx vitest run tests/components/ProjectDetail.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar** os dois componentes.
- [ ] **Step 4: Rodar** o mesmo comando. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(ui): detalhe do projeto e checklist com responsável`.

---

### Task 8: Visão kanban

**Files:**
- Create: `src/components/KanbanView.tsx`
- Test: `tests/components/KanbanView.test.tsx`

**Interfaces:**
- Consumes: `ProjectMeta` (Task 6), `Actions.moveProject` (Task 5), dnd-kit.
- Produces: `KanbanView({ projects, profiles, today, onOpen(id): void, onMove(id: string, status: Status, beforeId: string|null, afterId: string|null): void })`: três colunas (rótulos das Global Constraints) ordenadas por `position`; cada coluna é um `useDroppable` (aceita soltar mesmo vazia); os cartões são `useSortable`; ao soltar, calcula `status`, `beforeId` e `afterId` a partir do alvo e chama `onMove`. Extrair o cálculo em `resolveDrop(columns, activeId, overId): { status; beforeId; afterId }` (exportada, pura).

- [ ] **Step 1: Escrever os testes que falham** (sem simular o arrasto de pointer; testar `resolveDrop` e a renderização): cartões aparecem na coluna do seu status e ordenados por `position`; as três colunas existem mesmo sem projetos; `resolveDrop` soltando sobre uma coluna vazia → `{ status:'concluido', beforeId:null, afterId:null }`; soltando sobre um cartão da mesma coluna → vizinhos corretos; soltando sobre cartão de outra coluna → `status` dessa coluna.
- [ ] **Step 2: Rodar** `npx vitest run tests/components/KanbanView.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar** `KanbanView` com `DndContext` e `onDragEnd` chamando `resolveDrop`. Na tela pequena as colunas ficam em contêiner com `overflow-x-auto`.
- [ ] **Step 4: Rodar** o mesmo comando. Esperado: PASS. Depois, verificação manual no navegador (Task 10, passo 4).
- [ ] **Step 5: Commit** `feat(ui): visão kanban com arrastar e soltar`.

---

### Task 9: Integração do App e comportamentos gerais

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `tests/App.test.tsx` (substituir o teste do scaffold)

**Interfaces:**
- Consumes: tudo das Tasks 2 a 8.
- Produces: `App` envolvido por `ToastProvider` e `AuthProvider`; estado de interface (view, filtros, id do projeto aberto) mantido em `App`, com `view` e `filters` persistidos em `localStorage` dentro de `try/catch`, para sobreviver à volta do login; aviso fixo "Sem conexão: alterações não estão sendo salvas" quando `navigator.onLine` é falso (eventos `online`/`offline`); `reload()` no evento `visibilitychange` quando a aba volta a ficar visível; tela de erro "Não foi possível carregar os projetos" com botão "Recarregar" quando `loadError`; filtro "Meus steps" passa `mineUserId = user.id` para `filterProjects`.

- [ ] **Step 1: Escrever os testes que falham** (com `useProjects` e `useAuth` mockados): `loadError` mostra a mensagem e o botão "Recarregar" (chama `reload`) e não mostra lista vazia; alternar para "Kanban" renderiza as três colunas; evento `offline` mostra o aviso e `online` o remove; marcar "Meus steps" filtra por `user.id`; a view escolhida é restaurada após remontar o `App`.
- [ ] **Step 2: Rodar** `npx vitest run tests/App.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar** a integração.
- [ ] **Step 4: Rodar** `npx vitest run` (suíte inteira) e `npm run build`. Esperado: tudo PASS, build sem erros.
- [ ] **Step 5: Commit** `feat(app): integração, erros, offline e recarga ao voltar à aba`.

---

### Task 10: Publicação e documentação de configuração

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: scripts `build` e `test`.
- Produces: workflow em push na `main`: instala dependências, roda `npm test`, roda `npm run build` com `VITE_BASE=/${{ github.event.repository.name }}/`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` vindos de `secrets`, e publica `dist` no Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`, permissões `pages: write` e `id-token: write`).

- [ ] **Step 1: Escrever o workflow** conforme as Interfaces.
- [ ] **Step 2: Escrever o `README.md`** com o passo a passo manual: criar o projeto no Supabase, aplicar a migração (`supabase db push`), **desativar "Allow new users to sign up"** em Authentication, criar os 2 ou 3 usuários pelo painel, ajustar o `display_name` de cada um em `profiles`, cadastrar os secrets `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no GitHub, ativar Pages com fonte "GitHub Actions" e adicionar a URL do Pages em Authentication → URL Configuration.
- [ ] **Step 3: Verificar localmente** `VITE_BASE=/gerenciador/ npm run build` e abrir `dist` com `npx vite preview --base /gerenciador/`. Esperado: tela de login carrega sem erros 404 de assets.
- [ ] **Step 4: Verificação manual no navegador** com o Supabase local: login, criar projeto, steps com responsável, alternar lista/kanban, arrastar um cartão entre colunas e dentro da coluna, soltar em coluna vazia, confirmar que `completed_at` é gravado ao concluir, e que sem login nenhuma tela mostra dados. Registrar o resultado no PR/commit.
- [ ] **Step 5: Commit** `ci: deploy no GitHub Pages e README de configuração`.

---

## Self-Review (spec × plano)

- Autenticação, cadastro desativado: Tasks 3, 4, 10. Modelo de dados e RLS: Task 3. Lista, filtros, destaques: Tasks 2 e 6. Kanban e `completed_at`: Tasks 5 e 8. Detalhe, steps e responsável, `profiles`: Tasks 3 e 7. Erros (sessão, salvar, carregar, offline, foco): Tasks 4, 5 e 9. Testes: Tasks 2 a 9 e RLS na 3; arrastar manual na 10. Publicação: Task 10. Fora de escopo respeitado.
- Consistência de tipos: `Actions`, `Filters`, `Project`, `Step`, `Profile` e `positionBetween` têm uma só definição e os usos seguem as assinaturas.
- Review Focus: item 1 (Tasks 2 e 6), 2 (2 e 6), 3 (2), 4 (2 e 6), 5 (5 e 8).
