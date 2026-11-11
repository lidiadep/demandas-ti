# System Overview

## Objetivo do sistema

O sistema Demandas TI é uma plataforma web para registrar, acompanhar e analisar demandas e projetos de TI. Ele separa a experiência em dois perfis principais:

- `COLABORADOR`: cria demandas, acompanha suas próprias demandas e registra atualizações semanais.
- `GESTOR`: acompanha dashboard, carteira de projetos, kanban/lista de demandas da equipe, cria projetos e consulta detalhes de projetos.

## Stack utilizada

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4 via `@tailwindcss/vite`
- React Router 7
- Supabase JS 2
- Supabase Auth
- Supabase Postgres, views, triggers e RLS
- Lucide React para ícones
- Vercel para hospedagem do frontend

## Estrutura geral do projeto

- `src/App.tsx`: configuração principal de rotas e validação das variáveis de ambiente do Supabase.
- `src/main.tsx`: entrada do React e montagem do `AuthProvider`.
- `src/lib/supabase.ts`: criação do client Supabase usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- `src/contexts/AuthContext.tsx`: carregamento de sessão, profile e estado global de autenticação.
- `src/routes/ProtectedRoute.tsx`: proteção de rotas por autenticação e por perfil.
- `src/routes/home.ts`: regra de redirecionamento inicial por role.
- `src/layouts/AppLayout.tsx`: layout autenticado com menu lateral, logo e logout.
- `src/pages`: telas principais do sistema.
- `src/types/domain.ts`: tipos TypeScript das entidades de domínio.
- `src/assets`: logos e imagens utilizadas no frontend.
- `public`: assets públicos e favicon.
- `supabase/migrations`: SQL versionado do schema, views, triggers e políticas RLS.
- `supabase/seeds`: massa opcional de demonstração.
- `vercel.json`: rewrite para SPA em produção.

## Principais módulos

### Autenticação e autorização

Arquivos principais:

- `src/pages/Login.tsx`
- `src/contexts/AuthContext.tsx`
- `src/routes/ProtectedRoute.tsx`
- `src/routes/home.ts`
- `src/lib/supabase.ts`

Responsabilidades:

- Autenticar usuário com Supabase Auth.
- Buscar o profile relacionado em `profiles` via `user_id`.
- Bloquear acesso de usuário sem sessão, sem profile ou com profile inativo.
- Redirecionar usuário conforme `role`.
- Restringir rotas por `GESTOR` ou `COLABORADOR`.

### Área do colaborador

Arquivos principais:

- `src/pages/MinhasDemandas.tsx`
- `src/pages/NovaDemanda.tsx`

Responsabilidades:

- Criar demandas vinculadas ao colaborador logado.
- Exibir apenas demandas do colaborador.
- Registrar atualização semanal com status, horas e comentário.
- Exibir KPIs pessoais, filtros, prazos e status.

### Área do gestor

Arquivos principais:

- `src/pages/Dashboard.tsx`
- `src/pages/Kanban.tsx`
- `src/pages/NovoProjeto.tsx`
- `src/pages/ProjetoDetalhes.tsx`

Responsabilidades:

- Exibir visão gerencial de projetos, demandas, horas, capacidade e colaboradores.
- Alternar demandas da equipe entre lista e kanban.
- Filtrar demandas por projeto, área, responsável, tipo, status, prioridade e prazo.
- Criar novos projetos.
- Consultar detalhes de um projeto com demandas, equipe, entregas, documentos e histórico.

### Banco e backend Supabase

Arquivos principais:

- `supabase/migrations/20260630113000_v2_operational_schema.sql`
- `supabase/migrations/20260630124500_v2_multiclient_rls.sql`
- `supabase/migrations/20260630161000_fix_project_members_rls_recursion.sql`
- `supabase/migrations/20260702100000_add_project_planning_fields.sql`

Responsabilidades:

- Criar e ajustar tabelas do domínio.
- Criar views de leitura.
- Aplicar RLS.
- Criar funções auxiliares de sessão/profile.
- Atualizar `updated_at`.
- Atualizar demanda quando uma atualização semanal é registrada.
- Controlar visibilidade multi-cliente.

## Principais entidades

### `profiles`

Representa o perfil interno associado ao usuário do Supabase Auth.

Campos relevantes:

- `user_id`
- `nome`
- `email`
- `role`
- `ativo`
- `cargo`
- `avatar_url`
- `cliente_id`
- `area_id`

### `clientes`

Representa empresas/clientes atendidos.

Campos relevantes:

- `nome`
- `documento`
- `segmento`
- `ativo`

### `profile_clientes`

Vincula profiles a clientes no cenário multi-cliente.

Campos relevantes:

- `profile_id`
- `cliente_id`
- `papel`
- `cliente_principal`
- `ativo`

### `areas`

Cadastro de áreas utilizadas em demandas e projetos.

Campos relevantes:

- `nome`
- `slug`
- `cor`
- `ativo`

### `tipos_trabalho`

Cadastro de tipos de trabalho usados nas demandas.

Campos relevantes:

- `nome`
- `slug`
- `cor`
- `ativo`

### `prioridades`

Cadastro de prioridades.

Campos relevantes:

- `nome`
- `slug`
- `peso`
- `cor`
- `ordem`
- `ativo`

### `projetos`

Representa um projeto da carteira.

Campos relevantes:

- `cliente_id`
- `nome`
- `descricao`
- `status`
- `codigo`
- `area_id`
- `responsavel_id`
- `prioridade_id`
- `horas_estimadas`
- `data_inicio`
- `prazo_final`

### `demandas`

Representa uma demanda de TI.

Campos relevantes:

- `projeto_id`
- `colaborador_id`
- `titulo`
- `descricao`
- `area`
- `area_id`
- `tipo_trabalho_id`
- `prioridade`
- `prioridade_id`
- `status`
- `prazo_finalizacao`
- `bloqueio_motivo`
- `horas_estimadas`
- `horas_realizadas`
- `data_inicio`
- `ultima_atualizacao_em`

### `demanda_atualizacoes_semanais`

Histórico operacional de atualização semanal das demandas.

Campos relevantes:

- `demanda_id`
- `profile_id`
- `status`
- `horas_trabalhadas`
- `comentario`
- `semana_inicio`
- `semana_fim`

### `projeto_membros`

Equipe vinculada a um projeto.

Campos relevantes:

- `projeto_id`
- `profile_id`
- `papel`
- `alocacao_percentual`
- `ativo`

### `projeto_entregas`

Entregas ou marcos do cronograma de um projeto.

Campos relevantes:

- `projeto_id`
- `demanda_id`
- `titulo`
- `data_prevista`
- `status`

### `projeto_documentos`

Links/documentos associados ao projeto.

Campos relevantes:

- `projeto_id`
- `nome`
- `url`
- `tipo`
- `uploaded_by`

### `projeto_status_historico`

Histórico de alterações de status do projeto.

Campos relevantes:

- `projeto_id`
- `profile_id`
- `status_anterior`
- `status_novo`
- `comentario`

### Views

- `vw_demandas_detalhadas`: reúne demanda, projeto, cliente, responsável, área, tipo e prioridade.
- `vw_projetos_metricas`: calcula métricas agregadas de projetos, como demandas totais, ativas, bloqueadas, concluídas, atrasadas, horas e progresso.

## Como frontend, backend e banco se conectam

O projeto não possui backend próprio em Node/Express. O backend operacional é o Supabase.

Fluxo de conexão:

1. O frontend lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. `src/lib/supabase.ts` cria o client Supabase.
3. O login usa `supabase.auth.signInWithPassword`.
4. Após autenticação, o app busca o registro em `profiles` usando `user_id`.
5. As páginas usam `supabase.from(...).select/insert/update` diretamente.
6. O Supabase aplica RLS conforme usuário autenticado, profile, role e vínculos multi-cliente.
7. Views e triggers no banco complementam cálculos e efeitos de escrita.

## Fluxos principais do sistema

### Login

1. Usuário informa email e senha.
2. Supabase Auth autentica.
3. O app busca o profile em `profiles`.
4. Se o profile estiver ativo:
   - `GESTOR` vai para `/dashboard`.
   - `COLABORADOR` vai para `/minhas-demandas`.
5. Se não houver profile ou ele estiver inativo, o acesso é bloqueado.

### Criação de demanda pelo colaborador

1. Colaborador acessa `/nova-demanda`.
2. O formulário carrega projetos ativos, áreas ativas, tipos ativos e prioridades ativas.
3. O colaborador preenche os campos obrigatórios.
4. A demanda é criada em `demandas` com `colaborador_id` igual ao profile logado.
5. O status inicial é `em andamento`.
6. A demanda aparece em `/minhas-demandas`.

### Atualização semanal de demanda

1. Colaborador abre uma demanda em `/minhas-demandas`.
2. Registra status, horas trabalhadas, comentário e período da semana.
3. O registro é inserido em `demanda_atualizacoes_semanais`.
4. Trigger no banco atualiza a demanda:
   - `status`
   - soma de `horas_realizadas`
   - `ultima_atualizacao_em`
   - `updated_at`

### Dashboard do gestor

1. Gestor acessa `/dashboard`.
2. O frontend consulta demandas, projetos, clientes e profiles.
3. Métricas são calculadas no frontend para KPIs, gráficos e carteira.
4. A carteira exibe até 8 projetos filtrados e permite navegação para `/projetos/:id`.
5. O dashboard exporta CSV da carteira filtrada.

### Kanban/lista de demandas

1. Gestor acessa `/kanban`.
2. O frontend consulta demandas, projetos, clientes, profiles, áreas e tipos.
3. A página permite alternar entre lista e kanban.
4. Os filtros reduzem o conjunto exibido.
5. A visualização kanban agrupa por status operacional.
6. A página exporta CSV das demandas filtradas.

### Criação de projeto

1. Gestor acessa `/novo-projeto`.
2. O formulário carrega clientes ativos, áreas ativas, responsáveis ativos e prioridades ativas.
3. O gestor preenche os campos obrigatórios.
4. O projeto é criado com status `ATIVO`.
5. O responsável é inserido em `projeto_membros`.
6. Um histórico inicial é inserido em `projeto_status_historico`.
7. O usuário é redirecionado para `/projetos/:id`.

### Detalhes do projeto

1. Gestor acessa `/projetos/:id`.
2. A página consulta:
   - `vw_projetos_metricas`
   - `vw_demandas_detalhadas`
   - `projeto_membros`
   - `projeto_entregas`
   - `projeto_documentos`
   - `projeto_status_historico`
3. A tela apresenta visão geral, demandas, equipe, cronograma, documentos e histórico.

## Pontos importantes para manutenção

- O arquivo `.env` não deve ser versionado; `.env.example` contém apenas as chaves esperadas.
- O deploy na Vercel publica o frontend, mas não aplica migrations no Supabase automaticamente.
- Mudanças de schema precisam ser refletidas em `supabase/migrations` e aplicadas no Supabase usado pelo ambiente.
- As regras de segurança dependem das políticas RLS do Supabase; não confiar apenas na proteção de rotas do frontend.
- O sistema usa status como texto. Manter valores consistentes: `pendente`, `em andamento`, `bloqueado`, `concluido`, `cancelado`, `ATIVO`, `planejado`, `bloqueado`, `concluido`, `INATIVO`.
- Cálculos de atraso dependem de datas e podem variar se houver inconsistência de timezone ou formato. Precisa validação humana antes de usar como regra financeira/SLA formal.
- O fallback de horas por prioridade aparece em várias telas. Se a regra mudar, revisar `Dashboard.tsx`, `Kanban.tsx`, `MinhasDemandas.tsx` e `ProjetoDetalhes.tsx`.
- A página `src/pages/Projetos.tsx` existe, mas a rota `/projetos` redireciona para `/dashboard`. Hoje ela parece legado ou não utilizada.
- Algumas ações de interface parecem placeholders ou ainda não executam operação completa: botão "Filtros" no dashboard, "Ver todos os projetos", "Editar projeto", "Mais opções" e botões de adicionar no kanban. Precisa validação humana antes de tratá-las como funcionalidades concluídas.
- `supabase/seeds/thcm_demo_data.sql` é opcional e serve para massa de demonstração; não é necessário para operação normal se os dados forem cadastrados pela plataforma.
- O menu e a tela de login usam assets em `src/assets`; caminhos externos ao computador da usuária não são usados em runtime.
