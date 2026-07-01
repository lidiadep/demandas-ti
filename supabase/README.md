# Supabase schema

Este diretorio versiona a estrutura esperada do banco para a V2.

## Migration principal

- `migrations/20260630113000_v2_operational_schema.sql`
- `migrations/20260630124500_v2_multiclient_rls.sql`

Ela cria ou ajusta:

- cadastros de apoio: `areas`, `tipos_trabalho`, `prioridades`;
- entidades principais: `clientes`, `profiles`, `projetos`, `demandas`;
- vinculos e operacao: `profile_clientes`, `projeto_membros`, `demanda_atualizacoes_semanais`;
- suporte ao detalhe de projeto: `projeto_entregas`, `projeto_documentos`, `projeto_status_historico`;
- views de leitura: `vw_demandas_detalhadas`, `vw_projetos_metricas`;
- triggers de `updated_at` e acumulacao de horas realizadas;
- politicas RLS iniciais para gestor e colaborador.

## Como aplicar

Use o SQL Editor do Supabase e execute a migration completa.

Antes de aplicar em producao, confirme que existe backup recente do projeto Supabase. A migration foi escrita com `if not exists` e `add column if not exists` para ser segura em cima do MVP atual, mas ainda assim altera tabelas existentes.

Depois de aplicar, reinicie o servidor local do Vite para validar as consultas com os campos novos.

Se a primeira migration ja foi executada, rode tambem a migration `20260630124500_v2_multiclient_rls.sql`. Ela fecha as politicas de leitura de clientes/projetos para o cenario multi-cliente e cria vinculos iniciais de consultores com clientes a partir das demandas existentes.
