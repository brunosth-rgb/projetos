# Gerenciador de projetos

Aplicação pequena para 2 ou 3 pessoas acompanharem projetos e seus steps, em lista ou kanban. Front-end em Vite + React + TypeScript + Tailwind, dados e autenticação no Supabase, publicação no GitHub Pages.

## Configuração (passo a passo)

1. **Criar o projeto no Supabase.** Anote a URL do projeto e a chave `anon` (Project Settings → API).
2. **Aplicar a migração.** Com a Supabase CLI: `supabase link --project-ref <ref>` e depois `supabase db push`. Isso cria as tabelas, as políticas de RLS e o trigger de `profiles` a partir de `supabase/migrations/0001_schema.sql`.
3. **Desativar o cadastro aberto.** `supabase db push` **não** aplica o `supabase/config.toml` (onde está `enable_signup = false`, que vale só para o Supabase local). No projeto hospedado, desligue no painel: Authentication → Sign In / Providers → desmarque **Allow new users to sign up**. Alternativa: `supabase config push`.
4. **Criar os usuários.** Em Authentication → Users, crie os 2 ou 3 usuários (marque "Auto Confirm User" se não quiser depender de e-mail de confirmação).
5. **Ajustar o `display_name`.** No Table Editor, tabela `profiles`, defina uma vez o `display_name` de cada usuário. É o nome mostrado nos responsáveis.
6. **Cadastrar os secrets no GitHub.** Settings → Secrets and variables → Actions → New repository secret: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
7. **Ativar o Pages.** Settings → Pages → Source: **GitHub Actions**.
8. **Fazer o deploy.** O workflow `.github/workflows/deploy.yml` roda a cada push em `main` ou `master` (e manualmente, em Actions → Run workflow). Ele executa `npm ci`, `npm test`, `npm run build` e publica `dist`.
9. **Autorizar a URL do Pages.** Em Authentication → URL Configuration, coloque a URL do site (`https://<usuario>.github.io/<repositorio>/`) em Site URL e em Redirect URLs.

O build de produção falha de propósito se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` estiver ausente ou vazia, para que um deploy mal configurado não publique uma tela de login que sempre responde "E-mail ou senha inválidos".

## Observações sobre os dados

- `profiles` é legível e editável por qualquer usuário autenticado. É proposital: o espaço de trabalho é compartilhado entre poucas pessoas de confiança.
- Apagar um usuário em Authentication que já criou projetos falha, porque `projects.created_by` não tem ação `ON DELETE`. Antes, reatribua ou apague os projetos dele.
- Sem login, nenhuma tela mostra dados: a RLS só libera `authenticated`.

## Rodar localmente

```bash
npm install
# .env.local (não vai para o git)
# VITE_SUPABASE_URL=https://<ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<chave anon>
npm run dev
npm test          # testes unitários e de componentes
npm run test:rls  # testes de RLS no PGlite
```

Para conferir o build como no Pages: `VITE_BASE=/gerenciador/ npm run build` (com as duas variáveis do Supabase definidas) e `npx vite preview --base /gerenciador/`.

## Sobre os testes de RLS

`npm run test:rls` roda as políticas num PGlite (Postgres em WebAssembly), sem Docker, com um schema `auth` simulado (`auth.uid()`, papéis `anon`/`authenticated`). Isso prova a lógica das políticas SQL e do trigger. Não prova o comportamento do Supabase real: GoTrue, PostgREST, grants padrão dos papéis, configuração de signup e e-mails. Por isso a verificação manual abaixo importa.

## Verificação manual (depois do primeiro deploy)

- [ ] Entrar com um usuário convidado.
- [ ] Criar um projeto.
- [ ] Criar steps com responsável.
- [ ] Alternar entre lista e kanban.
- [ ] Arrastar um cartão entre colunas e dentro da mesma coluna.
- [ ] Soltar um cartão numa coluna vazia.
- [ ] Mover um cartão para Concluído e conferir no Table Editor que `completed_at` foi gravado.
- [ ] Abrir o site deslogado numa janela privada: só a tela de login, sem dados.
- [ ] Chamar o endpoint REST (`/rest/v1/projects`) só com a chave anon: deve voltar `[]` ou erro de permissão.
- [ ] Tentar criar uma conta nova (signup) com a chave anon: deve ser recusado.
