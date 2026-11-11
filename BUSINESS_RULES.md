# Business Rules

## BR-001 - Autenticação obrigatória

Descrição:
O sistema exige sessão autenticada no Supabase para acessar qualquer área interna. Usuários sem sessão são redirecionados para login.

Onde aparece no sistema:
`src/routes/ProtectedRoute.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/Login.tsx`, `src/App.tsx`.

Quando acontece:
Ao acessar rotas protegidas ou quando o estado de autenticação muda.

Validações:
O sistema verifica se existe `user` carregado pelo Supabase Auth e se o carregamento da sessão terminou.

Resultado esperado:
Usuário autenticado segue para a rota solicitada. Usuário não autenticado é enviado para `/login`.

Observações:
A proteção no frontend complementa, mas não substitui, as políticas RLS do Supabase.

## BR-002 - Profile ativo é obrigatório

Descrição:
Além de autenticar pelo Supabase Auth, o usuário precisa ter registro em `profiles` e esse profile precisa estar ativo.

Onde aparece no sistema:
`src/pages/Login.tsx`, `src/contexts/AuthContext.tsx`, `src/routes/ProtectedRoute.tsx`, tabela `profiles`.

Quando acontece:
Após login, ao carregar sessão existente ou ao acessar rota protegida.

Validações:
O sistema busca `profiles` por `user_id`. Se não encontrar profile ou se `ativo` for falso, bloqueia o acesso.

Resultado esperado:
Profile ativo acessa o sistema. Profile ausente ou inativo recebe mensagem de acesso indisponível ou perfil não encontrado/inativo.

Observações:
Precisa validação humana: o processo administrativo para criar/ativar profiles não está implementado no frontend atual.

## BR-003 - Redirecionamento inicial por perfil

Descrição:
O destino inicial do usuário depende da role do profile.

Onde aparece no sistema:
`src/routes/home.ts`, `src/pages/Login.tsx`, `src/routes/ProtectedRoute.tsx`.

Quando acontece:
Após login bem-sucedido, ao acessar uma rota não permitida para a role ou quando um usuário já autenticado abre `/login`.

Validações:
O sistema verifica `profile.role`.

Resultado esperado:
`GESTOR` vai para `/dashboard`. `COLABORADOR` vai para `/minhas-demandas`.

Observações:
Precisa validação humana para futuras roles. Hoje o tipo `Role` aceita apenas `GESTOR` e `COLABORADOR`.

## BR-004 - Restrição de rotas por role

Descrição:
As rotas internas são separadas por perfil operacional.

Onde aparece no sistema:
`src/App.tsx`, `src/routes/ProtectedRoute.tsx`, `src/layouts/AppLayout.tsx`.

Quando acontece:
Ao navegar para páginas internas.

Validações:
O sistema compara `profile.role` com `allowedRoles` da rota.

Resultado esperado:
`GESTOR` acessa `/dashboard`, `/kanban`, `/novo-projeto` e `/projetos/:id`. `COLABORADOR` acessa `/minhas-demandas` e `/nova-demanda`. Se acessar rota não permitida, o usuário volta para sua home.

Observações:
O menu lateral também muda conforme `isGestor` ou `isColaborador`.

## BR-005 - Configuração do Supabase é obrigatória

Descrição:
O app só inicia a experiência normal quando as variáveis do Supabase estão configuradas.

Onde aparece no sistema:
`src/lib/supabase.ts`, `src/App.tsx`, `.env.example`.

Quando acontece:
Na inicialização da aplicação.

Validações:
O sistema verifica `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Resultado esperado:
Com variáveis configuradas, o app carrega as rotas. Sem variáveis, exibe uma tela de configuração pendente.

Observações:
O `.env` não é versionado. Em produção, essas variáveis precisam existir na Vercel.

## BR-006 - Cadastro de demanda pelo colaborador

Descrição:
O colaborador pode criar uma demanda vinculada a um projeto ativo. A demanda criada fica sob responsabilidade do colaborador logado.

Onde aparece no sistema:
`src/pages/NovaDemanda.tsx`, tabela `demandas`, políticas `demandas_insert_own`.

Quando acontece:
Ao enviar o formulário de `/nova-demanda`.

Validações:
O formulário exige projeto, área, tipo de trabalho, prioridade, título e profile autenticado. Descrição é opcional e limitada a 1000 caracteres no frontend. Horas estimadas são convertidas para número; se inválidas, são gravadas como 0.

Resultado esperado:
É criado um registro em `demandas` com `colaborador_id = profile.id`, status `em andamento`, `horas_realizadas = 0`, área, tipo e prioridade selecionados.

Observações:
O texto da tela informa que toda demanda criada inicia como "Em andamento". A regra de permitir somente projetos ativos vem do filtro `.eq("status", "ATIVO")`.

## BR-007 - Formulários usam apenas cadastros ativos

Descrição:
Os formulários e filtros principais carregam opções ativas para cadastros de apoio.

Onde aparece no sistema:
`src/pages/NovaDemanda.tsx`, `src/pages/NovoProjeto.tsx`, `src/pages/Kanban.tsx`, tabelas `areas`, `tipos_trabalho`, `prioridades`, `clientes`, `profiles`.

Quando acontece:
Ao carregar formulários e filtros.

Validações:
As consultas usam `ativo = true` para áreas, tipos, prioridades, clientes e profiles em telas específicas.

Resultado esperado:
Usuário escolhe apenas opções ativas nos fluxos de cadastro.

Observações:
No kanban, algumas listas são carregadas completas e filtradas por `ativo` na montagem das opções. Precisa validação humana se cadastros inativos devem aparecer em demandas históricas.

## BR-008 - Demanda nova começa com status "em andamento"

Descrição:
Toda demanda criada pelo formulário do colaborador recebe status inicial `em andamento`.

Onde aparece no sistema:
`src/pages/NovaDemanda.tsx`, tabela `demandas`.

Quando acontece:
Ao criar demanda em `/nova-demanda`.

Validações:
O formulário precisa estar apto para envio e o usuário precisa ter profile.

Resultado esperado:
O campo `status` da demanda é gravado como `em andamento`.

Observações:
O banco também define default `em andamento` na migration principal. No fluxo atual, o frontend envia o status explicitamente.

## BR-009 - Colaborador visualiza apenas suas demandas

Descrição:
A tela do colaborador lista demandas associadas ao próprio profile.

Onde aparece no sistema:
`src/pages/MinhasDemandas.tsx`, tabela `demandas`, política `demandas_select_by_role`.

Quando acontece:
Ao carregar `/minhas-demandas`.

Validações:
O frontend consulta `demandas` com `.eq("colaborador_id", profile.id)`. A RLS também restringe leitura para colaborador, permitindo gestor ou dono da demanda.

Resultado esperado:
Colaborador vê apenas demandas onde `colaborador_id` corresponde ao seu profile.

Observações:
Gestores não usam essa tela por rota. A proteção real de dados depende da RLS estar aplicada no Supabase.

## BR-010 - Atualização semanal registra status, horas e comentário

Descrição:
O colaborador registra o avanço semanal de uma demanda informando status, horas trabalhadas, comentário e período da semana.

Onde aparece no sistema:
`src/pages/MinhasDemandas.tsx`, tabela `demanda_atualizacoes_semanais`, trigger `demanda_atualizacoes_semanais_apply`, função `apply_demanda_weekly_update`.

Quando acontece:
Ao clicar em "Atualizar Semana" e salvar o modal.

Validações:
Horas precisam ser número finito maior ou igual a 0. Comentário precisa ter pelo menos 10 caracteres. Semana inicial e final são obrigatórias no formulário. No banco existe constraint para comentário mínimo e para `semana_fim >= semana_inicio`.

Resultado esperado:
Cria registro em `demanda_atualizacoes_semanais`.

Observações:
O frontend não valida explicitamente se `semana_fim` é maior ou igual a `semana_inicio`; essa validação está no banco.

## BR-011 - Atualização semanal altera a demanda

Descrição:
Ao inserir ou atualizar uma atualização semanal, o banco atualiza automaticamente a demanda relacionada.

Onde aparece no sistema:
`supabase/migrations/20260630113000_v2_operational_schema.sql`, função `apply_demanda_weekly_update`, trigger `demanda_atualizacoes_semanais_apply`.

Quando acontece:
Após insert ou update em `demanda_atualizacoes_semanais`.

Validações:
O trigger usa `new.demanda_id` e soma todas as `horas_trabalhadas` da demanda.

Resultado esperado:
A demanda recebe o novo `status`, `horas_realizadas` igual à soma das horas trabalhadas, `ultima_atualizacao_em = now()` e `updated_at = now()`.

Observações:
Regra no banco. Se updates diretos forem feitos fora da aplicação, o trigger continua valendo.

## BR-012 - Status operacionais de demanda

Descrição:
O sistema trabalha com os status de demanda `pendente`, `em andamento`, `bloqueado`, `concluido` e `cancelado`.

Onde aparece no sistema:
`src/types/domain.ts`, `src/pages/MinhasDemandas.tsx`, `src/pages/Kanban.tsx`, `src/pages/ProjetoDetalhes.tsx`, migrations de normalização de status.

Quando acontece:
Ao exibir, filtrar, agrupar ou atualizar demandas.

Validações:
O frontend normaliza texto com `normalizeStatus`. A migration principal normaliza alguns valores antigos, como `em_andamento`, `andamento`, `ATIVO`, `concluida`, `CONCLUIDO`, `bloqueada` e `cancelado`.

Resultado esperado:
Status são exibidos com labels amigáveis e usados em KPIs, filtros, badges e colunas.

Observações:
Inferido: como os status são texto, manter consistência é responsabilidade de cadastro/código. Precisa validação humana se `cancelado` deve ser tratado como status separado ou sempre como bloqueado em métricas.

## BR-013 - Agrupamento do kanban por status

Descrição:
Na visualização kanban, as demandas são agrupadas em quatro colunas: Em andamento, Pendentes, Bloqueadas e Concluídas.

Onde aparece no sistema:
`src/pages/Kanban.tsx`, função `getBoardColumnId`, constante `boardColumns`.

Quando acontece:
Ao alternar a página de demandas da equipe para visualização kanban.

Validações:
`concluido` vai para Concluídas. `bloqueado` e `cancelado` vão para Bloqueadas. `pendente` vai para Pendentes. Qualquer outro status cai em Em andamento.

Resultado esperado:
Cada demanda filtrada aparece na coluna correspondente ao status.

Observações:
Inferido: status desconhecidos são tratados como "Em andamento" por fallback.

## BR-014 - Demanda atrasada

Descrição:
Uma demanda é considerada atrasada quando possui prazo anterior à data atual e não está concluída.

Onde aparece no sistema:
`src/pages/Dashboard.tsx`, `src/pages/Kanban.tsx`, `src/pages/MinhasDemandas.tsx`, `src/pages/ProjetoDetalhes.tsx`, view `vw_projetos_metricas`.

Quando acontece:
Ao calcular KPIs, badges, filtros, textos de prazo e métricas de projeto.

Validações:
O sistema verifica `prazo_finalizacao` e status diferente de `concluido`.

Resultado esperado:
A demanda aparece como atrasada em KPIs, filtros e sinalização visual.

Observações:
Precisa validação humana: há implementações diferentes de parsing de data entre telas e SQL. Recomenda-se cuidado antes de usar como métrica formal de SLA.

## BR-015 - Horas estimadas têm fallback por prioridade

Descrição:
Se uma demanda não tiver `horas_estimadas` positiva, o sistema estima horas com base na prioridade.

Onde aparece no sistema:
Funções `getEstimatedHours` em `src/pages/Dashboard.tsx`, `src/pages/Kanban.tsx`, `src/pages/MinhasDemandas.tsx`, `src/pages/ProjetoDetalhes.tsx`; migration principal.

Quando acontece:
Ao exibir métricas, horas, capacidade, gráficos ou progresso.

Validações:
Se `horas_estimadas` for número finito e maior que 0, usa esse valor. Caso contrário: `alta = 16`, `media = 8`, `baixa = 4`.

Resultado esperado:
Demandas sem horas estimadas continuam participando das métricas com uma estimativa padrão.

Observações:
Inferido: a escala por prioridade funciona como fallback operacional, não necessariamente como regra definitiva de esforço.

## BR-016 - Horas realizadas têm fallback para demandas concluídas

Descrição:
Se uma demanda não tiver `horas_realizadas` positiva e estiver concluída, o sistema considera horas realizadas iguais às horas estimadas.

Onde aparece no sistema:
Funções `getWorkedHours` em `src/pages/Dashboard.tsx`, `src/pages/Kanban.tsx`, `src/pages/MinhasDemandas.tsx`, `src/pages/ProjetoDetalhes.tsx`; migration principal.

Quando acontece:
Ao calcular métricas de horas realizadas.

Validações:
Se `horas_realizadas` for número finito e maior que 0, usa esse valor. Caso contrário, se status for `concluido`, usa horas estimadas; se não, usa 0.

Resultado esperado:
Demandas concluídas sem apontamento explícito não aparecem com 0 hora realizada.

Observações:
Inferido pelo código. Precisa validação humana se a regra deve permanecer quando o apontamento semanal estiver plenamente adotado.

## BR-017 - Criação de projeto pelo gestor

Descrição:
Gestores podem criar projetos com dados de cliente, área, responsável, planejamento, prioridade e descrição.

Onde aparece no sistema:
`src/pages/NovoProjeto.tsx`, tabelas `projetos`, `projeto_membros`, `projeto_status_historico`, política `projetos_manage_gestor`.

Quando acontece:
Ao enviar o formulário de `/novo-projeto`.

Validações:
O formulário exige cliente, área, responsável, título, descrição, data de início, prazo final, horas estimadas e prioridade. Código é opcional.

Resultado esperado:
Cria projeto com status `ATIVO`, inclui o responsável em `projeto_membros` com papel `Responsável` e alocação 100%, registra histórico inicial e redireciona para `/projetos/:id`.

Observações:
O frontend não valida explicitamente se prazo final é posterior à data de início. Precisa validação humana se essa regra deve ser obrigatória.

## BR-018 - Falha em dados complementares do projeto não bloqueia criação

Descrição:
Após criar o projeto, o sistema tenta criar membro e histórico. Se essas gravações complementares falharem, a falha é apenas avisada no console em ambiente de desenvolvimento.

Onde aparece no sistema:
`src/pages/NovoProjeto.tsx`.

Quando acontece:
Depois do insert bem-sucedido em `projetos`.

Validações:
O sistema verifica erro em `projeto_membros` e `projeto_status_historico`.

Resultado esperado:
Mesmo se membro ou histórico falharem, o projeto já criado permanece e o usuário é redirecionado para os detalhes.

Observações:
Inferido pelo fluxo do código. Precisa validação humana se criação de membro/histórico deve ser transacional no futuro.

## BR-019 - Progresso de projeto

Descrição:
O progresso de um projeto é calculado pela proporção de demandas concluídas sobre o total de demandas.

Onde aparece no sistema:
`src/pages/Dashboard.tsx`, `src/pages/ProjetoDetalhes.tsx`, view `vw_projetos_metricas`.

Quando acontece:
Ao exibir carteira de projetos, detalhes de projeto e métricas.

Validações:
Se o total de demandas for 0, progresso é 0. Caso contrário, progresso é `demandas_concluidas / demandas_total * 100`, arredondado.

Resultado esperado:
Projeto mostra percentual de progresso e barra proporcional.

Observações:
Inferido: o progresso não considera horas, peso, prioridade ou entregas; considera apenas quantidade de demandas concluídas.

## BR-020 - Status exibido do projeto

Descrição:
O label exibido para status do projeto pode ser derivado do status salvo e da existência de demandas ativas.

Onde aparece no sistema:
`src/pages/Dashboard.tsx`, função `formatProjectStatus`; `src/pages/ProjetoDetalhes.tsx`, função `getProjectStatusLabel`.

Quando acontece:
Ao exibir dashboard e detalhes do projeto.

Validações:
No dashboard, `CONCLUIDO` vira "Concluído", `INATIVO` vira "Inativo", e os demais viram "Em andamento" se houver demandas ativas, senão "Pendentes". Em detalhes, `concluido`, `inativo`, `bloqueado` e `planejado` são tratados explicitamente; `ativo` ou projeto com demandas ativas vira "Em andamento", senão "Planejado".

Resultado esperado:
Usuário vê um label amigável do status do projeto.

Observações:
Precisa validação humana: há diferença entre labels do dashboard e da tela de detalhes para projetos sem demandas ativas.

## BR-021 - Métricas do dashboard de projetos

Descrição:
O dashboard gerencial calcula KPIs de projetos, demandas, horas, atraso e colaboradores.

Onde aparece no sistema:
`src/pages/Dashboard.tsx`.

Quando acontece:
Ao carregar `/dashboard`.

Validações:
Projetos ativos são aqueles com status `ATIVO`, `planejado` ou `em andamento`. Demandas ativas são `pendente` + `em andamento`. Bloqueadas incluem `bloqueado` e `cancelado`. Capacidade utilizada é horas ativas sobre horas estimadas.

Resultado esperado:
Dashboard exibe KPIs, barras de progresso, gráficos por área/status e carteira de projetos.

Observações:
Inferido: "capacidade utilizada" usa horas estimadas de demandas ativas, não agenda real de pessoas.

## BR-022 - Legendas dos gráficos mostram apenas categorias com dados

Descrição:
Os gráficos do dashboard ocultam categorias com valor zero.

Onde aparece no sistema:
`src/pages/Dashboard.tsx`, variáveis `hoursByAreaItems` e `statusChartItems`.

Quando acontece:
Ao montar gráficos de distribuição de horas por área e status das demandas.

Validações:
Itens com valor 0 são filtrados antes da renderização.

Resultado esperado:
Os gráficos exibem apenas áreas/status com demandas ou horas existentes.

Observações:
Regra de apresentação, não regra de banco.

## BR-023 - Filtros da página de demandas da equipe

Descrição:
Gestores podem filtrar demandas da equipe por busca textual, projeto, área, responsável, tipo, status, prioridade, prazo e presença de projeto.

Onde aparece no sistema:
`src/pages/Kanban.tsx`.

Quando acontece:
Ao interagir com os filtros em `/kanban`.

Validações:
Busca compara título, descrição, projeto, código, cliente, área, tipo e responsável. Status `atrasada` usa cálculo de atraso em vez de status salvo. O checkbox "Mostrar demandas sem projeto" controla se demandas sem `projeto_id` aparecem.

Resultado esperado:
Lista, kanban, KPIs e exportação usam o mesmo conjunto filtrado.

Observações:
Inferido: a tela chama-se Kanban, mas a visualização padrão é lista.

## BR-024 - Exportação CSV usa o recorte filtrado

Descrição:
As exportações geram CSV apenas com os dados visíveis no recorte atual.

Onde aparece no sistema:
`src/pages/Dashboard.tsx`, função `exportarRelatorio`; `src/pages/Kanban.tsx`, função `exportarDemandas`.

Quando acontece:
Ao clicar em "Exportar Relatório" no dashboard ou "Exportar" em demandas da equipe.

Validações:
O sistema usa `projetosFiltrados` no dashboard e `demandasFiltradas` no kanban/lista.

Resultado esperado:
Download de `carteira-projetos.csv` ou `demandas-equipe.csv`.

Observações:
Exportação é feita no browser. Não há endpoint backend específico.

## BR-025 - Visibilidade multi-cliente

Descrição:
O banco restringe acesso a clientes, projetos e membros conforme role, vínculos com cliente, participação em projeto ou demandas próprias.

Onde aparece no sistema:
`supabase/migrations/20260630124500_v2_multiclient_rls.sql`, `supabase/migrations/20260630161000_fix_project_members_rls_recursion.sql`, funções `current_profile_cliente_ids` e `current_profile_project_ids`.

Quando acontece:
Em consultas ao Supabase com RLS habilitado.

Validações:
Gestor pode ver dados de forma ampla. Outros perfis acessam clientes vinculados em `profile_clientes` ou `profiles.cliente_id`; projetos vinculados a esses clientes, a seus membros ou a demandas próprias.

Resultado esperado:
Usuário sem papel de gestor não deve enxergar dados de clientes/projetos fora do seu vínculo permitido.

Observações:
Precisa validação humana no ambiente de produção: a regra depende das migrations estarem aplicadas no Supabase correto.

## BR-026 - Views de leitura agregam dados para telas gerenciais

Descrição:
As telas de detalhes usam views para reduzir joins e centralizar métricas.

Onde aparece no sistema:
`vw_demandas_detalhadas`, `vw_projetos_metricas`, `src/pages/ProjetoDetalhes.tsx`.

Quando acontece:
Ao carregar `/projetos/:id`.

Validações:
As views unem demandas com projeto, cliente, responsável, área, tipo e prioridade; e agregam métricas do projeto.

Resultado esperado:
A tela de detalhes recebe dados completos para abas de visão geral e demandas.

Observações:
As views usam `security_invoker = true`, então respeitam o contexto/RLS do usuário chamador.

## BR-027 - Cadastro de referência inicial

Descrição:
As migrations criam ou atualizam cadastros iniciais de áreas, tipos de trabalho e prioridades.

Onde aparece no sistema:
`supabase/migrations/20260630113000_v2_operational_schema.sql`.

Quando acontece:
Ao aplicar a migration principal.

Validações:
`areas.slug`, `tipos_trabalho.slug` e `prioridades.slug` usam `on conflict` para atualizar registros existentes e reativá-los.

Resultado esperado:
O banco passa a ter cadastros mínimos para operação dos formulários.

Observações:
Se áreas como marketing ou negócio forem removidas manualmente do banco, os tipos TypeScript e fallbacks visuais podem ainda conter referências antigas. Precisa validação humana para alinhar cadastro final e tipos do frontend.

## BR-028 - Dados opcionais do projeto não impedem abertura do detalhe

Descrição:
Na tela de detalhes, falhas ao carregar membros, entregas, documentos ou histórico não bloqueiam a página se projeto e demandas carregarem corretamente.

Onde aparece no sistema:
`src/pages/ProjetoDetalhes.tsx`.

Quando acontece:
Ao abrir `/projetos/:id`.

Validações:
Erro em `vw_projetos_metricas` ou `vw_demandas_detalhadas` bloqueia a tela. Erros em tabelas opcionais são apenas avisados no console em desenvolvimento.

Resultado esperado:
A página abre com dados principais, mesmo que algum bloco opcional não carregue.

Observações:
Inferido pelo tratamento de erro do código.
