# Gerenciador de Projetos: Design

Data: 2026-10-28

## Objetivo

Aplicação web para organizar projetos em andamento, o que precisa ser feito e o que já foi concluído, com datas, urgência e steps. O sucesso é abrir a aplicação e saber o que fazer agora, sem reorganizar tudo de cabeça.

## Contexto e restrições

- Uso por 2 a 3 pessoas autorizadas, em espaço compartilhado: todos veem e editam todos os projetos.
- Hospedagem no GitHub Pages (somente arquivos estáticos), acessível de vários computadores.
- O código no navegador é público, então a restrição de acesso é feita nos dados, por meio do Supabase.

## Arquitetura

- SPA em React + Vite + TypeScript + Tailwind, publicada no GitHub Pages pelo GitHub Actions a cada push na branch principal.
- O navegador fala direto com o Supabase via `supabase-js`. Não há servidor próprio.
- A chave `anon` fica no código (pública por natureza). A proteção real vem das regras RLS do banco.
- Kanban com arrastar e soltar via dnd-kit.

## Autenticação e acesso

- Login com e-mail e senha.
- Cadastro público desativado no Supabase. Os usuários são criados manualmente pelo painel.
- Sem sessão, o app mostra apenas a tela de login.

## Modelo de dados

### `projects`
- `id`, `title`, `description`
- `status`: `planejado` | `em_execucao` | `concluido`
- `urgency`: `baixa` | `media` | `alta` | `critica`
- `due_date` (data)
- `position` (ordem dentro da coluna do kanban)
- `created_by`, `created_at`, `updated_at`, `completed_at`

### `steps`
- `id`, `project_id` (apagar o projeto apaga os steps), `title`
- `done` (booleano)
- `position` (ordem no checklist)
- `assignee_id` (opcional, referência a `profiles`; um responsável por step)
- `created_at`

### `profiles`
- `id` (igual ao id do usuário em `auth.users`), `display_name`, `email`
- Criada automaticamente por gatilho quando um usuário é cadastrado. O nome de exibição é ajustado uma vez.
- Necessária porque o navegador não lê a tabela interna de usuários do Supabase.

### Regras RLS
Nas três tabelas, qualquer usuário autenticado pode ler, criar, editar e apagar. Anônimos não podem nada.

## Telas e comportamento

### Login
E-mail e senha, com mensagem simples em caso de erro. Não existe link de criar conta.

### Tela principal
Cabeçalho com alternância Lista/Kanban, filtros, botão "Novo projeto" e botão de sair.

### Visão em lista (padrão)
- Ordenação: urgência (crítica primeiro), depois prazo (mais próximo primeiro).
- Cada linha mostra título, status, urgência (com cor), prazo e progresso dos steps (por exemplo, 3/7) e os responsáveis dos steps pendentes.
- Destaque para projetos atrasados (prazo passado e não concluídos) e para os que vencem em até 3 dias.
- Filtro por status. Por padrão, projetos concluídos ficam ocultos.
- Filtro "Meus steps": mostra projetos com steps pendentes atribuídos ao usuário logado.

### Visão kanban
- Colunas: Planejado, Em execução, Concluído.
- Os cartões têm o mesmo conteúdo das linhas da lista.
- Arrastar entre colunas muda o status. Arrastar dentro da coluna muda a ordem.
- Mover para Concluído registra `completed_at`.

### Detalhe do projeto (painel lateral ou modal)
- Edição de título, descrição, status, urgência e prazo.
- Checklist de steps: adicionar, marcar como feito, reordenar, remover e escolher o responsável.
- Apagar o projeto pede confirmação.

### Comportamento geral
- As alterações são salvas na hora, com atualização otimista. Se o salvamento falhar, a mudança é desfeita e aparece um aviso.
- Layout responsivo. O kanban rola na horizontal em telas pequenas.

## Tratamento de erros

- Sessão expirada: volta ao login sem perder a tela em que o usuário estava.
- Falha ao salvar: desfaz a mudança otimista e mostra toast com opção de tentar de novo.
- Falha ao carregar: mensagem de erro com botão "Recarregar", sem mostrar lista vazia enganosa.
- Sem internet: aviso discreto de que as alterações não estão sendo salvas. Não há modo offline.
- Edições simultâneas: vale a última gravação. Mudanças de outros usuários aparecem ao recarregar ou ao voltar o foco para a aba.

## Testes

- Vitest para a lógica pura: ordenação por urgência e prazo, atraso e vencimento próximo, progresso dos steps e filtros (incluindo "Meus steps").
- Testing Library para componentes: login, formulário de projeto, checklist com responsável e alternância lista/kanban.
- Testes de RLS contra o banco local do Supabase: anônimos não leem nem escrevem nada, usuários logados têm acesso completo.
- O arrastar e soltar do kanban é verificado manualmente no navegador.

## Publicação

- Repositório no GitHub. O GitHub Actions faz o build do Vite e publica no GitHub Pages a cada push na branch principal.
- O Vite usa o caminho-base do repositório.
- URL do Supabase e chave `anon` entram como variáveis do build.
- O esquema do banco (tabelas, RLS, gatilho de `profiles`) fica em migrações SQL no repositório.

## Fora da primeira versão

Modo offline, tempo real, notificações, anexos, comentários, categorias, calendário e múltiplos responsáveis por step.
