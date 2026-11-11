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
  select coalesce(public.current_profile_role() in ('ADMIN', 'SUPERADMIN'), false)
$$;

create table if not exists public.convites_acesso (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  role text not null default 'COLABORADOR',
  cargo text,
  cliente_id uuid references public.clientes(id),
  area_id uuid references public.areas(id),
  status text not null default 'pendente',
  invited_by_profile_id uuid references public.profiles(id),
  profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.convites_acesso enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'convites_acesso'
      and policyname = 'convites_acesso_manage_admin'
  ) then
    create policy convites_acesso_manage_admin
    on public.convites_acesso
    for all
    to authenticated
    using (public.is_admin_master())
    with check (public.is_admin_master());
  end if;
end $$;

create or replace function public.handle_access_invite_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_uuid uuid;
  metadata_role text;
  metadata_cliente_id uuid;
  metadata_area_id uuid;
begin
  metadata_role := coalesce(new.raw_user_meta_data ->> 'role', 'COLABORADOR');

  if metadata_role not in ('COLABORADOR', 'GESTOR', 'DIRETOR', 'ADMIN', 'SUPERADMIN') then
    metadata_role := 'COLABORADOR';
  end if;

  metadata_cliente_id := nullif(new.raw_user_meta_data ->> 'cliente_id', '')::uuid;
  metadata_area_id := nullif(new.raw_user_meta_data ->> 'area_id', '')::uuid;

  insert into public.profiles (
    user_id,
    nome,
    email,
    role,
    cargo,
    cliente_id,
    area_id,
    ativo
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    metadata_role,
    nullif(new.raw_user_meta_data ->> 'cargo', ''),
    metadata_cliente_id,
    metadata_area_id,
    true
  )
  on conflict (user_id) do update
  set nome = excluded.nome,
      email = excluded.email,
      role = excluded.role,
      cargo = excluded.cargo,
      cliente_id = excluded.cliente_id,
      area_id = excluded.area_id,
      ativo = true,
      updated_at = now()
  returning id into profile_uuid;

  if metadata_cliente_id is not null then
    insert into public.profile_clientes (
      profile_id,
      cliente_id,
      papel,
      cliente_principal,
      ativo
    )
    values (
      profile_uuid,
      metadata_cliente_id,
      case metadata_role
        when 'DIRETOR' then 'Diretoria'
        when 'GESTOR' then 'Gestor'
        when 'ADMIN' then 'Admin'
        when 'SUPERADMIN' then 'Superadmin'
        else 'Colaborador'
      end,
      true,
      true
    )
    on conflict (profile_id, cliente_id) do update
    set papel = excluded.papel,
        cliente_principal = true,
        ativo = true,
        updated_at = now();
  end if;

  update public.convites_acesso
  set status = 'aceito',
      profile_id = profile_uuid,
      updated_at = now()
  where lower(email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_access_invite on auth.users;

create trigger on_auth_user_access_invite
after insert on auth.users
for each row execute function public.handle_access_invite_user();
