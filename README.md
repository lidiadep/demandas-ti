# Demandas TI

Plataforma para registro, acompanhamento e análise das demandas de TI.

O produto possui dois perfis principais:

- `COLABORADOR`: registra e acompanha suas próprias demandas.
- `GESTOR`: acompanha dashboards, projetos, carteira de demandas e visão gerencial.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth e Database
- React Router
- Vercel

## Configuração local

1. Instale as dependências:

```bash
npm install
```

2. Crie um arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

3. Preencha as variáveis do Supabase no `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

O arquivo `.env` não deve ser versionado.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Rotas principais

- `/login`: autenticação.
- `/minhas-demandas`: acompanhamento do colaborador.
- `/nova-demanda`: cadastro de demanda pelo colaborador.
- `/dashboard`: visão gerencial.
- `/projetos/:id`: detalhes do projeto acessado pela carteira do dashboard.
- `/kanban`: quadro de demandas.

## Estrutura do banco esperada

O frontend consome as tabelas:

- `profiles`
- `clientes`
- `areas`
- `tipos_trabalho`
- `prioridades`
- `projetos`
- `demandas`
- `profile_clientes`
- `projeto_membros`
- `demanda_atualizacoes_semanais`

O schema da V2 esta versionado em `supabase/migrations`.

Antes de desenvolver fluxos novos como Kanban operacional, atualização semanal ou cadastro completo de demandas, aplique a migration `supabase/migrations/20260630113000_v2_operational_schema.sql` no SQL Editor do Supabase.
