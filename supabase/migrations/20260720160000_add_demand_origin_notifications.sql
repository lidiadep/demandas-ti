alter table public.demandas
  add column if not exists origem text not null default 'colaborador',
  add column if not exists criada_por_profile_id uuid references public.profiles(id),
  add column if not exists visualizada_em timestamptz;

update public.demandas
set origem = coalesce(origem, 'colaborador'),
    criada_por_profile_id = coalesce(criada_por_profile_id, colaborador_id)
where criada_por_profile_id is null
   or origem is null;

create index if not exists idx_demandas_origem
  on public.demandas(origem);

create index if not exists idx_demandas_visualizada_em
  on public.demandas(visualizada_em);

create index if not exists idx_demandas_criada_por_profile_id
  on public.demandas(criada_por_profile_id);
