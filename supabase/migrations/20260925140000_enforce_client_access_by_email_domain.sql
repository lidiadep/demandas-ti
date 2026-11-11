-- Restringe a visibilidade por cliente conforme o dominio do e-mail autenticado.
-- @parceirojaera.com.br -> JaEra
-- @thcm.com.br -> THCM

create or replace function public.is_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_profile_role() in ('GESTOR', 'DIRETOR', 'ADMIN', 'SUPERADMIN'),
    false
  )
$$;

create or replace function public.is_admin_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_profile_role() in ('ADMIN', 'SUPERADMIN'),
    false
  )
$$;

create or replace function public.current_profile_cliente_ids()
returns table(cliente_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with identidade as (
    select lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2)) as dominio
  ),
  clientes_por_dominio as (
    select c.id
    from public.clientes c
    cross join identidade i
    where c.ativo = true
      and (
        (
          i.dominio = 'parceirojaera.com.br'
          and lower(c.nome) in ('jaera', 'jáera', 'já era', 'ja era')
        )
        or (
          i.dominio = 'thcm.com.br'
          and lower(c.nome) = 'thcm'
        )
      )
  ),
  dominio_reconhecido as (
    select dominio
    from identidade
    where dominio in ('parceirojaera.com.br', 'thcm.com.br')
  )
  select id
  from clientes_por_dominio

  union

  select pc.cliente_id
  from public.profile_clientes pc
  where pc.profile_id = public.current_profile_id()
    and pc.ativo = true
    and not exists (select 1 from dominio_reconhecido)

  union

  select p.cliente_id
  from public.profiles p
  where p.id = public.current_profile_id()
    and p.cliente_id is not null
    and not exists (select 1 from dominio_reconhecido)
$$;

drop policy if exists clientes_select_authenticated on public.clientes;
drop policy if exists clientes_select_by_role on public.clientes;
create policy clientes_select_by_domain
on public.clientes
for select
to authenticated
using (
  public.is_admin_master()
  or id in (select cliente_id from public.current_profile_cliente_ids())
);

drop policy if exists clientes_manage_gestor on public.clientes;
create policy clientes_manage_by_domain
on public.clientes
for all
to authenticated
using (
  public.is_admin_master()
  or (
    public.is_gestor()
    and id in (select cliente_id from public.current_profile_cliente_ids())
  )
)
with check (
  public.is_admin_master()
  or (
    public.is_gestor()
    and id in (select cliente_id from public.current_profile_cliente_ids())
  )
);

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_by_domain
on public.profiles
for select
to authenticated
using (
  public.is_admin_master()
  or id = public.current_profile_id()
  or cliente_id in (select cliente_id from public.current_profile_cliente_ids())
);

drop policy if exists profiles_update_by_role on public.profiles;
create policy profiles_update_by_domain
on public.profiles
for update
to authenticated
using (
  public.is_admin_master()
  or id = public.current_profile_id()
  or (
    public.is_gestor()
    and cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
)
with check (
  public.is_admin_master()
  or id = public.current_profile_id()
  or (
    public.is_gestor()
    and cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
);

drop policy if exists projetos_select_authenticated on public.projetos;
drop policy if exists projetos_select_by_role on public.projetos;
create policy projetos_select_by_domain
on public.projetos
for select
to authenticated
using (
  public.is_admin_master()
  or cliente_id in (select cliente_id from public.current_profile_cliente_ids())
);

drop policy if exists projetos_manage_gestor on public.projetos;
create policy projetos_manage_by_domain
on public.projetos
for all
to authenticated
using (
  public.is_admin_master()
  or (
    public.is_gestor()
    and cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
)
with check (
  public.is_admin_master()
  or (
    public.is_gestor()
    and cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
);

drop policy if exists demandas_select_by_role on public.demandas;
create policy demandas_select_by_domain
on public.demandas
for select
to authenticated
using (
  public.is_admin_master()
  or colaborador_id = public.current_profile_id()
  or (
    projeto_id is not null
    and exists (
      select 1
      from public.projetos p
      where p.id = demandas.projeto_id
        and p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
  or (
    projeto_id is null
    and (
      criada_por_profile_id = public.current_profile_id()
      or exists (
        select 1
        from public.profiles p
        where p.id = demandas.colaborador_id
          and p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
      )
    )
  )
);

drop policy if exists demandas_insert_own on public.demandas;
create policy demandas_insert_by_domain
on public.demandas
for insert
to authenticated
with check (
  public.is_admin_master()
  or colaborador_id = public.current_profile_id()
  or (
    public.is_gestor()
    and (
      (
        projeto_id is not null
        and exists (
          select 1
          from public.projetos p
          where p.id = demandas.projeto_id
            and p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
        )
      )
      or projeto_id is null
    )
  )
);

drop policy if exists demandas_update_by_role on public.demandas;
create policy demandas_update_by_domain
on public.demandas
for update
to authenticated
using (
  public.is_admin_master()
  or colaborador_id = public.current_profile_id()
  or (
    public.is_gestor()
    and (
      projeto_id is null
      or exists (
        select 1
        from public.projetos p
        where p.id = demandas.projeto_id
          and p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
      )
    )
  )
)
with check (
  public.is_admin_master()
  or colaborador_id = public.current_profile_id()
  or (
    public.is_gestor()
    and (
      projeto_id is null
      or exists (
        select 1
        from public.projetos p
        where p.id = demandas.projeto_id
          and p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
      )
    )
  )
);

drop policy if exists profile_clientes_select_authenticated on public.profile_clientes;
drop policy if exists profile_clientes_select_by_role on public.profile_clientes;
create policy profile_clientes_select_by_domain
on public.profile_clientes
for select
to authenticated
using (
  public.is_admin_master()
  or profile_id = public.current_profile_id()
  or cliente_id in (select cliente_id from public.current_profile_cliente_ids())
);

drop policy if exists profile_clientes_manage_gestor on public.profile_clientes;
create policy profile_clientes_manage_by_domain
on public.profile_clientes
for all
to authenticated
using (
  public.is_admin_master()
  or (
    public.is_gestor()
    and cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
)
with check (
  public.is_admin_master()
  or (
    public.is_gestor()
    and cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
);

drop policy if exists projeto_membros_select_authenticated on public.projeto_membros;
drop policy if exists projeto_membros_select_by_role on public.projeto_membros;
create policy projeto_membros_select_by_domain
on public.projeto_membros
for select
to authenticated
using (
  public.is_admin_master()
  or profile_id = public.current_profile_id()
  or projeto_id in (
    select p.id
    from public.projetos p
    where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
);

drop policy if exists projeto_membros_manage_gestor on public.projeto_membros;
create policy projeto_membros_manage_by_domain
on public.projeto_membros
for all
to authenticated
using (
  public.is_admin_master()
  or (
    public.is_gestor()
    and projeto_id in (
      select p.id
      from public.projetos p
      where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
)
with check (
  public.is_admin_master()
  or (
    public.is_gestor()
    and projeto_id in (
      select p.id
      from public.projetos p
      where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
);

drop policy if exists atualizacoes_select_by_role on public.demanda_atualizacoes_semanais;
create policy atualizacoes_select_by_domain
on public.demanda_atualizacoes_semanais
for select
to authenticated
using (
  public.is_admin_master()
  or profile_id = public.current_profile_id()
  or demanda_id in (select id from public.demandas)
);

drop policy if exists atualizacoes_insert_own on public.demanda_atualizacoes_semanais;
create policy atualizacoes_insert_by_domain
on public.demanda_atualizacoes_semanais
for insert
to authenticated
with check (
  public.is_admin_master()
  or profile_id = public.current_profile_id()
  or demanda_id in (select id from public.demandas)
);

drop policy if exists projeto_entregas_select_authenticated on public.projeto_entregas;
create policy projeto_entregas_select_by_domain
on public.projeto_entregas
for select
to authenticated
using (
  public.is_admin_master()
  or projeto_id in (
    select p.id
    from public.projetos p
    where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
);

drop policy if exists projeto_entregas_manage_gestor on public.projeto_entregas;
create policy projeto_entregas_manage_by_domain
on public.projeto_entregas
for all
to authenticated
using (
  public.is_admin_master()
  or (
    public.is_gestor()
    and projeto_id in (
      select p.id
      from public.projetos p
      where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
)
with check (
  public.is_admin_master()
  or (
    public.is_gestor()
    and projeto_id in (
      select p.id
      from public.projetos p
      where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
);

drop policy if exists projeto_documentos_select_authenticated on public.projeto_documentos;
create policy projeto_documentos_select_by_domain
on public.projeto_documentos
for select
to authenticated
using (
  public.is_admin_master()
  or projeto_id in (
    select p.id
    from public.projetos p
    where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
);

drop policy if exists projeto_documentos_manage_gestor on public.projeto_documentos;
create policy projeto_documentos_manage_by_domain
on public.projeto_documentos
for all
to authenticated
using (
  public.is_admin_master()
  or (
    public.is_gestor()
    and projeto_id in (
      select p.id
      from public.projetos p
      where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
)
with check (
  public.is_admin_master()
  or (
    public.is_gestor()
    and projeto_id in (
      select p.id
      from public.projetos p
      where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
);

drop policy if exists projeto_status_historico_select_authenticated on public.projeto_status_historico;
create policy projeto_status_historico_select_by_domain
on public.projeto_status_historico
for select
to authenticated
using (
  public.is_admin_master()
  or projeto_id in (
    select p.id
    from public.projetos p
    where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
  )
);

drop policy if exists projeto_status_historico_manage_gestor on public.projeto_status_historico;
create policy projeto_status_historico_manage_by_domain
on public.projeto_status_historico
for all
to authenticated
using (
  public.is_admin_master()
  or (
    public.is_gestor()
    and projeto_id in (
      select p.id
      from public.projetos p
      where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
)
with check (
  public.is_admin_master()
  or (
    public.is_gestor()
    and projeto_id in (
      select p.id
      from public.projetos p
      where p.cliente_id in (select cliente_id from public.current_profile_cliente_ids())
    )
  )
);
