-- Garante que projetos nao continuem expostos por policies antigas.
-- O acesso de gestores e diretores fica limitado pelo dominio do e-mail.

alter table public.projetos enable row level security;

do $$
declare
  politica record;
begin
  for politica in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projetos'
  loop
    execute format(
      'drop policy if exists %I on public.projetos',
      politica.policyname
    );
  end loop;
end
$$;

create policy projetos_select_by_domain
on public.projetos
for select
to authenticated
using (
  public.is_admin_master()
  or cliente_id in (select cliente_id from public.current_profile_cliente_ids())
);

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
