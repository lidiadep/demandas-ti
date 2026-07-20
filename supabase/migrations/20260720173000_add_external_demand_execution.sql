create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text,
  contato text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.demandas
  add column if not exists execucao_tipo text not null default 'interna',
  add column if not exists fornecedor_id uuid references public.fornecedores(id);

update public.demandas
set execucao_tipo = coalesce(execucao_tipo, 'interna')
where execucao_tipo is null;

create index if not exists idx_fornecedores_ativo
  on public.fornecedores(ativo);

create index if not exists idx_demandas_execucao_tipo
  on public.demandas(execucao_tipo);

create index if not exists idx_demandas_fornecedor_id
  on public.demandas(fornecedor_id);

alter table public.fornecedores enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'fornecedores' and policyname = 'fornecedores_select_authenticated') then
    create policy fornecedores_select_authenticated on public.fornecedores for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'fornecedores' and policyname = 'fornecedores_manage_gestor') then
    create policy fornecedores_manage_gestor on public.fornecedores for all to authenticated using (public.is_gestor()) with check (public.is_gestor());
  end if;
end $$;

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
  py.peso as prioridade_peso,
  d.execucao_tipo,
  d.fornecedor_id,
  f.nome as fornecedor_nome
from public.demandas d
left join public.projetos p on p.id = d.projeto_id
left join public.clientes c on c.id = p.cliente_id
left join public.profiles pr on pr.id = d.colaborador_id
left join public.areas a on a.id = d.area_id
left join public.tipos_trabalho tw on tw.id = d.tipo_trabalho_id
left join public.prioridades py on py.id = d.prioridade_id
left join public.fornecedores f on f.id = d.fornecedor_id;
