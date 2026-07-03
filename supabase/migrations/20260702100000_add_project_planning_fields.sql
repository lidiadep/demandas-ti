alter table public.projetos
  add column if not exists horas_estimadas numeric(10, 2) not null default 0,
  add column if not exists prioridade_id uuid references public.prioridades(id);

create index if not exists idx_projetos_prioridade_id
  on public.projetos(prioridade_id);

update public.projetos p
set horas_estimadas = demand_totals.horas_estimadas
from (
  select
    projeto_id,
    coalesce(sum(horas_estimadas), 0)::numeric(10, 2) as horas_estimadas
  from public.demandas
  group by projeto_id
) demand_totals
where p.id = demand_totals.projeto_id
  and coalesce(p.horas_estimadas, 0) = 0;

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
  case
    when coalesce(p.horas_estimadas, 0) > 0
      then p.horas_estimadas::numeric(10, 2)
    else coalesce(sum(d.horas_estimadas), 0)::numeric(10, 2)
  end as horas_estimadas,
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
