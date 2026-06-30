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
- `/projetos`: listagem de projetos.
- `/projetos/:id`: detalhes do projeto.
- `/kanban`: quadro de demandas.

## Estrutura do banco esperada

O frontend consome as tabelas:

- `profiles`
- `clientes`
- `projetos`
- `demandas`

Para a V2, a próxima melhoria recomendada é versionar schema, migrations, seeds e políticas RLS do Supabase dentro do repositório.
