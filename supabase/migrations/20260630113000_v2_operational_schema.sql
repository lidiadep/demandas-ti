create extension if not exists pgcrypto;

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  cor text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tipos_trabalho (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  cor text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.prioridades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  peso integer not null default 2,
  cor text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  segmento text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  role text not null default 'COLABORADOR',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  nome text not null,
  descricao text,
  status text not null default 'ATIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demandas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references public.projetos(id) on delete cascade,
  colaborador_id uuid references public.profiles(id),
  titulo text not null,
  descricao text,
  area text,
  prioridade text,
  status text not null default 'em andamento',
  prazo_finalizacao date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists cargo text,
  add column if not exists avatar_url text,
  add column if not exists cliente_id uuid references public.clientes(id),
  add column if not exists area_id uuid references public.areas(id),
  add column if not exists updated_at timestamptz not null default now();

alter table public.clientes
  add column if not exists documento text,
  add column if not exists segmento text,
  add column if not exists ativo boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.projetos
  add column if not exists codigo text,
  add column if not exists area_id uuid references public.areas(id),
  add column if not exists responsavel_id uuid references public.profiles(id),
  add column if not exists data_inicio date,
  add column if not exists prazo_final date,
  add column if not exists updated_at timestamptz not null default now();

alter table public.demandas
  add column if not exists area_id uuid references public.areas(id),
  add column if not exists tipo_trabalho_id uuid references public.tipos_trabalho(id),
  add column if not exists prioridade_id uuid references public.prioridades(id),
  add column if not exists bloqueio_motivo text,
  add column if not exists horas_estimadas numeric(8, 2) not null default 0,
  add column if not exists horas_realizadas numeric(8, 2) not null default 0,
  add column if not exists data_inicio date,
  add column if not exists ultima_atualizacao_em timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.projeto_membros (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  papel text not null default 'Desenvolvedor',
  alocacao_percentual integer not null default 100,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (projeto_id, profile_id)
);

create table if not exists public.profile_clientes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  papel text not null default 'Consultor',
  cliente_principal boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, cliente_id)
);

create table if not exists public.demanda_atualizacoes_semanais (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  status text not null,
  horas_trabalhadas numeric(8, 2) not null default 0,
  comentario text not null,
  semana_inicio date not null,
  semana_fim date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demanda_atualizacoes_semanais_comentario_minimo
    check (char_length(trim(comentario)) >= 10),
  constraint demanda_atualizacoes_semanais_periodo_valido
    check (semana_fim >= semana_inicio)
);

create table if not exists public.projeto_entregas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  demanda_id uuid references public.demandas(id) on delete set null,
  titulo text not null,
  data_prevista date,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projeto_documentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  nome text not null,
  url text not null,
  tipo text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.projeto_status_historico (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  status_anterior text,
  status_novo text not null,
  comentario text,
  created_at timestamptz not null default now()
);

insert into public.areas (nome, slug, cor)
values
  ('Desenvolvimento', 'desenvolvimento', '#2563eb'),
  ('Suporte', 'suporte', '#f97316'),
  ('Produto', 'produto', '#7c3aed'),
  ('QA', 'qa', '#22c55e'),
  ('Marketing', 'marketing', '#f59e0b'),
  ('Negocio', 'negocio', '#0f766e'),
  ('Manutencao', 'manutencao', '#64748b')
on conflict (slug) do update
set nome = excluded.nome,
    cor = excluded.cor,
    ativo = true;

insert into public.tipos_trabalho (nome, slug, cor)
values
  ('Projeto', 'projeto', '#2563eb'),
  ('Suporte', 'suporte', '#f97316'),
  ('Interno', 'interno', '#64748b'),
  ('Terceirizado', 'terceirizado', '#7c3aed'),
  ('Manutencao', 'manutencao', '#f59e0b')
on conflict (slug) do update
set nome = excluded.nome,
    cor = excluded.cor,
    ativo = true;

insert into public.prioridades (nome, slug, peso, cor, ordem)
values
  ('Baixa', 'baixa', 1, '#22c55e', 1),
  ('Media', 'media', 2, '#f59e0b', 2),
  ('Alta', 'alta', 3, '#ef4444', 3)
on conflict (slug) do update
set nome = excluded.nome,
    peso = excluded.peso,
    cor = excluded.cor,
    ordem = excluded.ordem,
    ativo = true;

update public.demandas d
set area_id = a.id
from public.areas a
where d.area_id is null
  and lower(coalesce(d.area, '')) = a.slug;

update public.demandas d
set prioridade_id = p.id
from public.prioridades p
where d.prioridade_id is null
  and lower(coalesce(d.prioridade, '')) = p.slug;

update public.demandas
set status = 'em andamento'
where status in ('em_andamento', 'andamento', 'ATIVO');

update public.demandas
set status = 'concluido'
where status in ('concluida', 'concluido', 'CONCLUIDO');

update public.demandas
set status = 'bloqueado'
where status in ('cancelado', 'bloqueada', 'bloqueado');

update public.demandas
set horas_estimadas = case lower(coalesce(prioridade, 'media'))
  when 'alta' then 16
  when 'baixa' then 4
  else 8
end
where horas_estimadas = 0;

update public.demandas
set horas_realizadas = horas_estimadas
where horas_realizadas = 0
  and status = 'concluido';

update public.projetos p
set codigo = 'PRJ' || lpad(row_number::text, 3, '0')
from (
  select id, row_number() over (order by created_at, nome)
  from public.projetos
) numbered
where p.id = numbered.id
  and p.codigo is null;

update public.projetos p
set area_id = ranked.area_id
from (
  select projeto_id, area_id
  from (
    select
      projeto_id,
      area_id,
      count(*) as total,
      row_number() over (
        partition by projeto_id
        order by count(*) desc
      ) as rn
    from public.demandas
    where area_id is not null
    group by projeto_id, area_id
  ) area_rank
  where rn = 1
) ranked
where p.id = ranked.projeto_id
  and p.area_id is null;

update public.projetos p
set responsavel_id = first_demand.colaborador_id
from (
  select distinct on (projeto_id)
    projeto_id,
    colaborador_id
  from public.demandas
  where colaborador_id is not null
  order by projeto_id, created_at
) first_demand
where p.id = first_demand.projeto_id
  and p.responsavel_id is null;

update public.projetos p
set prazo_final = deadlines.prazo_final
from (
  select projeto_id, min(prazo_finalizacao) as prazo_final
  from public.demandas
  where prazo_finalizacao is not null
  group by projeto_id
) deadlines
where p.id = deadlines.projeto_id
  and p.prazo_final is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where user_id = auth.uid()
    and ativo = true
  limit 1
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
    and ativo = true
  limit 1
$$;

create or replace function public.is_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'GESTOR', false)
$$;

create or replace function public.apply_demanda_weekly_update()
returns trigger
language plpgsql
as $$
begin
  update public.demandas
  set status = new.status,
      horas_realizadas = coalesce((
        select sum(horas_trabalhadas)
        from public.demanda_atualizacoes_semanais
        where demanda_id = new.demanda_id
      ), 0),
      ultima_atualizacao_em = now(),
      updated_at = now()
  where id = new.demanda_id;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clientes',
    'profiles',
    'projetos',
    'demandas',
    'projeto_membros',
    'profile_clientes',
    'demanda_atualizacoes_semanais',
    'projeto_entregas'
  ]
  loop
    if not exists (
      select 1
      from pg_trigger
      where tgname = table_name || '_set_updated_at'
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        table_name || '_set_updated_at',
        table_name
      );
    end if;
  end loop;
end $$;

drop trigger if exists demanda_atualizacoes_semanais_apply on public.demanda_atualizacoes_semanais;
create trigger demanda_atualizacoes_semanais_apply
after insert or update on public.demanda_atualizacoes_semanais
for each row execute function public.apply_demanda_weekly_update();

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_cliente_id on public.profiles(cliente_id);
create index if not exists idx_projetos_cliente_id on public.projetos(cliente_id);
create index if not exists idx_projetos_responsavel_id on public.projetos(responsavel_id);
create index if not exists idx_projetos_status on public.projetos(status);
create index if not exists idx_demandas_projeto_id on public.demandas(projeto_id);
create index if not exists idx_demandas_colaborador_id on public.demandas(colaborador_id);
create index if not exists idx_demandas_area_id on public.demandas(area_id);
create index if not exists idx_demandas_tipo_trabalho_id on public.demandas(tipo_trabalho_id);
create index if not exists idx_demandas_prioridade_id on public.demandas(prioridade_id);
create index if not exists idx_demandas_status on public.demandas(status);
create index if not exists idx_demandas_prazo on public.demandas(prazo_finalizacao);
create index if not exists idx_profile_clientes_profile_id on public.profile_clientes(profile_id);
create index if not exists idx_profile_clientes_cliente_id on public.profile_clientes(cliente_id);
create index if not exists idx_atualizacoes_demanda_id on public.demanda_atualizacoes_semanais(demanda_id);
create index if not exists idx_atualizacoes_periodo on public.demanda_atualizacoes_semanais(semana_inicio, semana_fim);

create or replace view public.vw_demandas_detalhadas
with (security_invoker = true)
as
select
  d.id,
  d.titulo,
  d.descricao,
  d.status,
  d.bloqueio_motivo,
  d.horas_estimadas,
  d.horas_realizadas,
  d.data_inicio,
  d.prazo_finalizacao,
  d.ultima_atualizacao_em,
  d.created_at,
  d.updated_at,
  d.projeto_id,
  p.codigo as projeto_codigo,
  p.nome as projeto_nome,
  p.status as projeto_status,
  p.cliente_id,
  c.nome as cliente_nome,
  d.colaborador_id,
  pr.nome as responsavel_nome,
  pr.email as responsavel_email,
  pr.cliente_id as responsavel_cliente_principal_id,
  d.area_id,
  coalesce(a.nome, initcap(d.area)) as area_nome,
  coalesce(a.slug, d.area) as area_slug,
  d.tipo_trabalho_id,
  tw.nome as tipo_trabalho_nome,
  tw.slug as tipo_trabalho_slug,
  d.prioridade_id,
  coalesce(py.nome, initcap(d.prioridade)) as prioridade_nome,
  coalesce(py.slug, d.prioridade) as prioridade_slug,
  py.peso as prioridade_peso
from public.demandas d
left join public.projetos p on p.id = d.projeto_id
left join public.clientes c on c.id = p.cliente_id
left join public.profiles pr on pr.id = d.colaborador_id
left join public.areas a on a.id = d.area_id
left join public.tipos_trabalho tw on tw.id = d.tipo_trabalho_id
left join public.prioridades py on py.id = d.prioridade_id;

create or replace view public.vw_projetos_metricas
with (security_invoker = true)
as
select
  p.id,
  p.codigo,
  p.nome,
  p.descricao,
  p.status,
  p.data_inicio,
  p.prazo_final,
  p.created_at,
  p.updated_at,
  p.cliente_id,
  c.nome as cliente_nome,
  p.area_id,
  a.nome as area_nome,
  a.slug as area_slug,
  p.responsavel_id,
  r.nome as responsavel_nome,
  count(d.id)::integer as demandas_total,
  count(d.id) filter (where d.status in ('pendente', 'em andamento'))::integer as demandas_ativas,
  count(d.id) filter (where d.status = 'bloqueado')::integer as demandas_bloqueadas,
  count(d.id) filter (where d.status = 'concluido')::integer as demandas_concluidas,
  count(d.id) filter (
    where d.prazo_finalizacao < current_date
      and d.status <> 'concluido'
  )::integer as demandas_atrasadas,
  coalesce(sum(d.horas_estimadas), 0)::numeric(10, 2) as horas_estimadas,
  coalesce(sum(d.horas_realizadas), 0)::numeric(10, 2) as horas_realizadas,
  case
    when count(d.id) = 0 then 0
    else round(
      count(d.id) filter (where d.status = 'concluido')::numeric
      / count(d.id)::numeric
      * 100
    )::integer
  end as progresso_percentual
from public.projetos p
left join public.clientes c on c.id = p.cliente_id
left join public.areas a on a.id = p.area_id
left join public.profiles r on r.id = p.responsavel_id
left join public.demandas d on d.projeto_id = p.id
group by p.id, c.nome, a.nome, a.slug, r.nome;

alter table public.areas enable row level security;
alter table public.tipos_trabalho enable row level security;
alter table public.prioridades enable row level security;
alter table public.clientes enable row level security;
alter table public.profiles enable row level security;
alter table public.projetos enable row level security;
alter table public.demandas enable row level security;
alter table public.profile_clientes enable row level security;
alter table public.projeto_membros enable row level security;
alter table public.demanda_atualizacoes_semanais enable row level security;
alter table public.projeto_entregas enable row level security;
alter table public.projeto_documentos enable row level security;
alter table public.projeto_status_historico enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'areas' and policyname = 'areas_select_authenticated') then
    create policy areas_select_authenticated on public.areas for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tipos_trabalho' and policyname = 'tipos_trabalho_select_authenticated') then
    create policy tipos_trabalho_select_authenticated on public.tipos_trabalho for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prioridades' and policyname = 'prioridades_select_authenticated') then
    create policy prioridades_select_authenticated on public.prioridades for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_authenticated') then
    create policy profiles_select_authenticated on public.profiles for select to authenticated using (
      id = public.current_profile_id() or public.is_gestor()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'clientes' and policyname = 'clientes_select_authenticated') then
    create policy clientes_select_authenticated on public.clientes for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projetos' and policyname = 'projetos_select_authenticated') then
    create policy projetos_select_authenticated on public.projetos for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'demandas' and policyname = 'demandas_select_by_role') then
    create policy demandas_select_by_role on public.demandas for select to authenticated using (
      public.is_gestor() or colaborador_id = public.current_profile_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'demandas' and policyname = 'demandas_insert_own') then
    create policy demandas_insert_own on public.demandas for insert to authenticated with check (
      public.is_gestor() or colaborador_id = public.current_profile_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'demandas' and policyname = 'demandas_update_by_role') then
    create policy demandas_update_by_role on public.demandas for update to authenticated using (
      public.is_gestor() or colaborador_id = public.current_profile_id()
    ) with check (
      public.is_gestor() or colaborador_id = public.current_profile_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projeto_membros' and policyname = 'projeto_membros_select_authenticated') then
    create policy projeto_membros_select_authenticated on public.projeto_membros for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profile_clientes' and policyname = 'profile_clientes_select_by_role') then
    create policy profile_clientes_select_by_role on public.profile_clientes for select to authenticated using (
      public.is_gestor() or profile_id = public.current_profile_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'demanda_atualizacoes_semanais' and policyname = 'atualizacoes_select_by_role') then
    create policy atualizacoes_select_by_role on public.demanda_atualizacoes_semanais for select to authenticated using (
      public.is_gestor() or profile_id = public.current_profile_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'demanda_atualizacoes_semanais' and policyname = 'atualizacoes_insert_own') then
    create policy atualizacoes_insert_own on public.demanda_atualizacoes_semanais for insert to authenticated with check (
      public.is_gestor() or profile_id = public.current_profile_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projeto_entregas' and policyname = 'projeto_entregas_select_authenticated') then
    create policy projeto_entregas_select_authenticated on public.projeto_entregas for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projeto_documentos' and policyname = 'projeto_documentos_select_authenticated') then
    create policy projeto_documentos_select_authenticated on public.projeto_documentos for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projeto_status_historico' and policyname = 'projeto_status_historico_select_authenticated') then
    create policy projeto_status_historico_select_authenticated on public.projeto_status_historico for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'areas' and policyname = 'areas_manage_gestor') then
    create policy areas_manage_gestor on public.areas for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tipos_trabalho' and policyname = 'tipos_trabalho_manage_gestor') then
    create policy tipos_trabalho_manage_gestor on public.tipos_trabalho for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prioridades' and policyname = 'prioridades_manage_gestor') then
    create policy prioridades_manage_gestor on public.prioridades for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'clientes' and policyname = 'clientes_manage_gestor') then
    create policy clientes_manage_gestor on public.clientes for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_by_role') then
    create policy profiles_update_by_role on public.profiles for update to authenticated using (
      public.is_gestor() or id = public.current_profile_id()
    ) with check (
      public.is_gestor() or id = public.current_profile_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projetos' and policyname = 'projetos_manage_gestor') then
    create policy projetos_manage_gestor on public.projetos for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projeto_membros' and policyname = 'projeto_membros_manage_gestor') then
    create policy projeto_membros_manage_gestor on public.projeto_membros for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profile_clientes' and policyname = 'profile_clientes_manage_gestor') then
    create policy profile_clientes_manage_gestor on public.profile_clientes for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projeto_entregas' and policyname = 'projeto_entregas_manage_gestor') then
    create policy projeto_entregas_manage_gestor on public.projeto_entregas for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projeto_documentos' and policyname = 'projeto_documentos_manage_gestor') then
    create policy projeto_documentos_manage_gestor on public.projeto_documentos for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projeto_status_historico' and policyname = 'projeto_status_historico_manage_gestor') then
    create policy projeto_status_historico_manage_gestor on public.projeto_status_historico for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;
end $$;
