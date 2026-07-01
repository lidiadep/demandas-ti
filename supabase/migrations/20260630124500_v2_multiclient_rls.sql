update public.profiles profile
set cliente_id = first_client.cliente_id
from (
  select distinct on (d.colaborador_id)
    d.colaborador_id,
    p.cliente_id
  from public.demandas d
  join public.projetos p on p.id = d.projeto_id
  where d.colaborador_id is not null
    and p.cliente_id is not null
  order by d.colaborador_id, d.created_at
) first_client
where profile.id = first_client.colaborador_id
  and profile.cliente_id is null;

insert into public.profile_clientes (
  profile_id,
  cliente_id,
  papel,
  cliente_principal,
  ativo
)
select distinct
  d.colaborador_id,
  p.cliente_id,
  'Consultor',
  profile.cliente_id = p.cliente_id,
  true
from public.demandas d
join public.projetos p on p.id = d.projeto_id
join public.profiles profile on profile.id = d.colaborador_id
where d.colaborador_id is not null
  and p.cliente_id is not null
on conflict (profile_id, cliente_id) do update
set cliente_principal = excluded.cliente_principal,
    ativo = true,
    updated_at = now();

drop policy if exists clientes_select_authenticated on public.clientes;
create policy clientes_select_by_role
on public.clientes
for select
to authenticated
using (
  public.is_gestor()
  or id in (
    select cliente_id
    from public.profile_clientes
    where profile_id = public.current_profile_id()
      and ativo = true
  )
  or id = (
    select cliente_id
    from public.profiles
    where id = public.current_profile_id()
  )
);

drop policy if exists projetos_select_authenticated on public.projetos;
create policy projetos_select_by_role
on public.projetos
for select
to authenticated
using (
  public.is_gestor()
  or cliente_id in (
    select cliente_id
    from public.profile_clientes
    where profile_id = public.current_profile_id()
      and ativo = true
  )
  or id in (
    select projeto_id
    from public.projeto_membros
    where profile_id = public.current_profile_id()
      and ativo = true
  )
  or id in (
    select projeto_id
    from public.demandas
    where colaborador_id = public.current_profile_id()
  )
);

drop policy if exists projeto_membros_select_authenticated on public.projeto_membros;
create policy projeto_membros_select_by_role
on public.projeto_membros
for select
to authenticated
using (
  public.is_gestor()
  or profile_id = public.current_profile_id()
  or projeto_id in (
    select projeto_id
    from public.projeto_membros
    where profile_id = public.current_profile_id()
      and ativo = true
  )
);

