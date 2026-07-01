create or replace function public.current_profile_cliente_ids()
returns table (cliente_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select pc.cliente_id
  from public.profile_clientes pc
  where pc.profile_id = public.current_profile_id()
    and pc.ativo = true

  union

  select p.cliente_id
  from public.profiles p
  where p.id = public.current_profile_id()
    and p.cliente_id is not null
$$;

create or replace function public.current_profile_project_ids()
returns table (projeto_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select pm.projeto_id
  from public.projeto_membros pm
  where pm.profile_id = public.current_profile_id()
    and pm.ativo = true

  union

  select d.projeto_id
  from public.demandas d
  where d.colaborador_id = public.current_profile_id()
    and d.projeto_id is not null
$$;

drop policy if exists clientes_select_by_role on public.clientes;
create policy clientes_select_by_role
on public.clientes
for select
to authenticated
using (
  public.is_gestor()
  or id in (
    select cliente_id
    from public.current_profile_cliente_ids()
  )
);

drop policy if exists projetos_select_by_role on public.projetos;
create policy projetos_select_by_role
on public.projetos
for select
to authenticated
using (
  public.is_gestor()
  or cliente_id in (
    select cliente_id
    from public.current_profile_cliente_ids()
  )
  or id in (
    select projeto_id
    from public.current_profile_project_ids()
  )
);

drop policy if exists projeto_membros_select_by_role on public.projeto_membros;
create policy projeto_membros_select_by_role
on public.projeto_membros
for select
to authenticated
using (
  public.is_gestor()
  or profile_id = public.current_profile_id()
  or projeto_id in (
    select projeto_id
    from public.current_profile_project_ids()
  )
);
