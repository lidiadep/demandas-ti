begin;

create extension if not exists pgcrypto;

-- Massa ficticia para demonstracao do cliente THCM.
-- A query e idempotente: remove apenas projetos com codigos THCM-* abaixo
-- e demandas com prefixo [DEMO THCM], depois recria a massa de validacao.
-- Responsaveis e colaboradores sao escolhidos a partir de profiles reais
-- ativos e vinculados a auth.users.

delete from public.demandas
where titulo like '[DEMO THCM]%'
  and (
    projeto_id is null
    or projeto_id in (
      select id
      from public.projetos
      where codigo in ('THCM-MB', 'THCM-BAL1', 'THCM-BMULT')
    )
  );

delete from public.projetos
where codigo in ('THCM-MB', 'THCM-BAL1', 'THCM-BMULT');

insert into public.areas (nome, slug, cor, ativo)
values
  ('Desenvolvimento', 'desenvolvimento', '#2563eb', true),
  ('Suporte', 'suporte', '#f97316', true),
  ('Produto', 'produto', '#7c3aed', true),
  ('QA', 'qa', '#22c55e', true),
  ('Manutencao', 'manutencao', '#64748b', true),
  ('Infraestrutura', 'infraestrutura', '#0891b2', true),
  ('Seguranca', 'seguranca', '#dc2626', true),
  ('Processos', 'processos', '#0f766e', true),
  ('Dados e BI', 'dados-bi', '#4f46e5', true),
  ('Qualidade', 'qualidade', '#16a34a', true)
on conflict (slug) do update
set nome = excluded.nome,
    cor = excluded.cor,
    ativo = true;

insert into public.tipos_trabalho (nome, slug, cor, ativo)
values
  ('Projeto', 'projeto', '#2563eb', true),
  ('Suporte', 'suporte', '#f97316', true),
  ('Interno', 'interno', '#64748b', true),
  ('Terceirizado', 'terceirizado', '#7c3aed', true),
  ('Manutencao', 'manutencao', '#f59e0b', true),
  ('Melhoria', 'melhoria', '#0f766e', true),
  ('Incidente', 'incidente', '#ef4444', true)
on conflict (slug) do update
set nome = excluded.nome,
    cor = excluded.cor,
    ativo = true;

insert into public.prioridades (nome, slug, peso, cor, ordem, ativo)
values
  ('Baixa', 'baixa', 1, '#22c55e', 1, true),
  ('Media', 'media', 2, '#f59e0b', 2, true),
  ('Alta', 'alta', 3, '#ef4444', 3, true)
on conflict (slug) do update
set nome = excluded.nome,
    peso = excluded.peso,
    cor = excluded.cor,
    ordem = excluded.ordem,
    ativo = true;

insert into public.clientes (nome, documento, segmento, ativo)
select 'THCM', '00.000.000/0001-91', 'Servicos compartilhados', true
where not exists (
  select 1
  from public.clientes
  where lower(nome) = 'thcm'
);

update public.clientes
set documento = coalesce(documento, '00.000.000/0001-91'),
    segmento = coalesce(segmento, 'Servicos compartilhados'),
    ativo = true,
    updated_at = now()
where lower(nome) = 'thcm';

do $$
begin
  if not exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.user_id
    where p.ativo = true
  ) then
    raise exception 'Nenhum profile ativo vinculado ao auth.users foi encontrado. Cadastre/crie os profiles dos usuarios reais antes de rodar o seed THCM.';
  end if;
end $$;

drop table if exists pg_temp.thcm_demo_profiles;

create temp table thcm_demo_profiles on commit drop as
with real_profiles as (
  select
    p.id as profile_id,
    p.nome,
    p.email,
    p.role,
    row_number() over (
      order by
        case when p.role = 'GESTOR' then 0 else 1 end,
        p.created_at,
        p.nome
    ) as rn
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.ativo = true
),
area_slots (area_slug, rn) as (
  values
    ('produto', 1),
    ('dados-bi', 2),
    ('qa', 3),
    ('desenvolvimento', 4),
    ('suporte', 5),
    ('infraestrutura', 6),
    ('seguranca', 7),
    ('processos', 8),
    ('manutencao', 9),
    ('qualidade', 10)
)
select
  rp.profile_id,
  rp.nome,
  rp.email,
  rp.role,
  rp.rn,
  coalesce(slot.area_slug, 'desenvolvimento') as area_slug
from real_profiles rp
left join area_slots slot
  on slot.rn = ((rp.rn - 1) % (select count(*) from area_slots)) + 1;

with thcm as (
  select id
  from public.clientes
  where lower(nome) = 'thcm'
  order by created_at
  limit 1
)
insert into public.profile_clientes (
  profile_id,
  cliente_id,
  papel,
  cliente_principal,
  ativo
)
select
  p.profile_id,
  thcm.id,
  case when p.role = 'GESTOR' then 'Gestor' else 'Consultor' end,
  false,
  true
from thcm_demo_profiles p
cross join thcm
on conflict (profile_id, cliente_id) do update
set papel = excluded.papel,
    cliente_principal = excluded.cliente_principal,
    ativo = true,
    updated_at = now();

with thcm as (
  select id
  from public.clientes
  where lower(nome) = 'thcm'
  order by created_at
  limit 1
),
projetos_seed (
  codigo,
  nome,
  descricao,
  status,
  area_slug,
  responsavel_slot,
  prioridade_slug,
  data_inicio,
  prazo_final,
  horas_estimadas
) as (
  values
    (
      'THCM-MB',
      'Monitor de Boletos',
      'Automacao para monitorar boletos, alertar inconsistencias e dar visibilidade ao ciclo de cobranca.',
      'em andamento',
      'desenvolvimento',
      1,
      'alta',
      current_date - 42,
      current_date + 24,
      160.00
    ),
    (
      'THCM-BAL1',
      'Modelo Balancete 1',
      'Modelo de validacao e publicacao de balancetes com visao de dados, qualidade e entregas para negocio.',
      'planejado',
      'dados-bi',
      2,
      'media',
      current_date - 18,
      current_date + 38,
      132.00
    ),
    (
      'THCM-BMULT',
      'Baixas Multiplas',
      'Fluxo para realizar baixas multiplas com controle operacional, auditoria e tratativa de bloqueios.',
      'bloqueado',
      'processos',
      3,
      'alta',
      current_date - 31,
      current_date + 16,
      148.00
    )
)
insert into public.projetos (
  cliente_id,
  codigo,
  nome,
  descricao,
  status,
  area_id,
  responsavel_id,
  prioridade_id,
  data_inicio,
  prazo_final,
  horas_estimadas,
  created_at,
  updated_at
)
select
  thcm.id,
  s.codigo,
  s.nome,
  s.descricao,
  s.status,
  a.id,
  r.id,
  pr.id,
  s.data_inicio,
  s.prazo_final,
  s.horas_estimadas,
  now() - interval '45 days',
  now()
from projetos_seed s
cross join thcm
join public.areas a on a.slug = s.area_slug
join public.prioridades pr on pr.slug = s.prioridade_slug
join lateral (
  select profile_id as id
  from thcm_demo_profiles
  order by
    case
      when rn = (
        ((s.responsavel_slot - 1) % (select count(*) from thcm_demo_profiles)) + 1
      ) then 0
      else 1
    end,
    rn
  limit 1
) r on true;

with membros_seed (codigo, profile_slot, papel, alocacao_percentual) as (
  values
    ('THCM-MB', 1, 'Sponsor', 20),
    ('THCM-MB', 2, 'Product Owner', 50),
    ('THCM-MB', 3, 'Desenvolvedor', 100),
    ('THCM-MB', 4, 'Suporte Operacional', 40),
    ('THCM-BAL1', 1, 'Sponsor', 20),
    ('THCM-BAL1', 2, 'Analista de Dados', 100),
    ('THCM-BAL1', 3, 'QA', 60),
    ('THCM-BAL1', 4, 'Qualidade', 60),
    ('THCM-BMULT', 1, 'Sponsor', 20),
    ('THCM-BMULT', 2, 'Analista de Processos', 100),
    ('THCM-BMULT', 3, 'Infraestrutura', 50),
    ('THCM-BMULT', 4, 'Seguranca', 50),
    ('THCM-BMULT', 5, 'Manutencao', 50)
)
insert into public.projeto_membros (
  projeto_id,
  profile_id,
  papel,
  alocacao_percentual,
  ativo
)
select
  distinct on (projeto.id, profile.id)
  projeto.id,
  profile.id,
  s.papel,
  s.alocacao_percentual,
  true
from membros_seed s
join public.projetos projeto on projeto.codigo = s.codigo
join lateral (
  select profile_id as id
  from thcm_demo_profiles
  order by
    case
      when rn = (
        ((s.profile_slot - 1) % (select count(*) from thcm_demo_profiles)) + 1
      ) then 0
      else 1
    end,
    rn
  limit 1
) profile on true
order by projeto.id, profile.id, s.profile_slot
on conflict (projeto_id, profile_id) do update
set papel = excluded.papel,
    alocacao_percentual = excluded.alocacao_percentual,
    ativo = true,
    updated_at = now();

with area_pool as (
  select
    a.id,
    a.nome,
    a.slug,
    row_number() over (order by a.nome) as rn
  from public.areas a
  where a.ativo = true
    and a.slug not in ('marketing', 'negocio')
),
project_pool as (
  select
    p.id,
    p.nome,
    p.codigo,
    row_number() over (order by p.codigo) as rn
  from public.projetos p
  where p.codigo in ('THCM-MB', 'THCM-BAL1', 'THCM-BMULT')
),
profile_pool as (
  select
    profile_id as id,
    rn,
    area_slug
  from thcm_demo_profiles
),
scenario_pool (
  ordem,
  status,
  titulo,
  tipo_slug,
  prioridade_slug,
  prazo_offset,
  data_inicio_offset,
  ultima_update_offset,
  horas_estimadas,
  horas_realizadas,
  bloqueio_motivo
) as (
  values
    (1, 'pendente', 'triagem pendente', 'projeto', 'media', 14, null, null, 10.00, 0.00, null),
    (2, 'em andamento', 'execucao em andamento', 'manutencao', 'media', 21, 11, 2, 18.00, 7.00, null),
    (3, 'em andamento', 'prazo estourado', 'suporte', 'alta', -6, 19, 1, 14.00, 6.00, null),
    (4, 'concluido', 'entrega concluida', 'interno', 'baixa', -3, 24, 3, 8.00, 8.00, null),
    (5, 'bloqueado', 'bloqueio aguardando terceiro', 'terceirizado', 'alta', 10, 15, 1, 16.00, 5.00, 'Aguardando retorno do fornecedor para liberar ambiente e credenciais.')
)
insert into public.demandas (
  projeto_id,
  colaborador_id,
  titulo,
  descricao,
  area,
  area_id,
  tipo_trabalho_id,
  prioridade,
  prioridade_id,
  status,
  prazo_finalizacao,
  bloqueio_motivo,
  horas_estimadas,
  horas_realizadas,
  data_inicio,
  ultima_atualizacao_em,
  created_at,
  updated_at
)
select
  project_target.id,
  coalesce(area_profile.id, any_profile.id),
  '[DEMO THCM] ' || project_target.nome || ' - ' || area_pool.nome || ' - ' || scenario_pool.titulo,
  format(
    'Massa ficticia para validacao da THCM. Projeto: %s. Area: %s. Cenario: %s.',
    project_target.nome,
    area_pool.nome,
    scenario_pool.titulo
  ),
  area_pool.slug,
  area_pool.id,
  tipo.id,
  scenario_pool.prioridade_slug,
  prioridade.id,
  scenario_pool.status,
  (current_date + scenario_pool.prazo_offset)::date,
  scenario_pool.bloqueio_motivo,
  scenario_pool.horas_estimadas,
  scenario_pool.horas_realizadas,
  case
    when scenario_pool.data_inicio_offset is null then null
    else (current_date - scenario_pool.data_inicio_offset)::date
  end,
  case
    when scenario_pool.ultima_update_offset is null then null
    else now() - make_interval(days => scenario_pool.ultima_update_offset)
  end,
  now() - make_interval(hours => ((area_pool.rn + scenario_pool.ordem)::int * 6)),
  now()
from area_pool
cross join scenario_pool
join lateral (
  select project_pool.id, project_pool.nome, project_pool.codigo
  from project_pool
  where project_pool.rn = (
    ((area_pool.rn + scenario_pool.ordem - 2)::int % (select count(*)::int from project_pool)) + 1
  )
  limit 1
) project_target on true
left join lateral (
  select p.id
  from profile_pool p
  where p.area_slug = area_pool.slug
  order by p.rn
  limit 1
) area_profile on true
join lateral (
  select id
  from profile_pool
  order by rn
  limit 1
) any_profile on true
join public.tipos_trabalho tipo on tipo.slug = scenario_pool.tipo_slug
join public.prioridades prioridade on prioridade.slug = scenario_pool.prioridade_slug;

with extras_seed (
  titulo,
  descricao,
  area_slug,
  tipo_slug,
  prioridade_slug,
  status,
  prazo_offset,
  horas_estimadas,
  horas_realizadas,
  profile_slot,
  bloqueio_motivo
) as (
  values
    (
      'Sem projeto - solicitacao em triagem',
      'Demanda recebida pela area de Produto e ainda sem projeto definido.',
      'produto',
      'projeto',
      'media',
      'pendente',
      12,
      6.00,
      0.00,
      2,
      null
    ),
    (
      'Sem projeto - chamado atrasado',
      'Chamado operacional sem projeto, mantido para validar filtro de demandas atrasadas.',
      'suporte',
      'suporte',
      'alta',
      'em andamento',
      -8,
      8.00,
      3.00,
      3,
      null
    ),
    (
      'Sem projeto - acesso bloqueado',
      'Demanda sem projeto bloqueada por pendencia de acesso em infraestrutura.',
      'infraestrutura',
      'incidente',
      'alta',
      'bloqueado',
      7,
      10.00,
      2.00,
      4,
      'Aguardando aprovacao de acesso administrativo para continuar a execucao.'
    ),
    (
      'Sem projeto - demanda cancelada',
      'Demanda cancelada durante a priorizacao para validar cenario de cancelamento.',
      'processos',
      'interno',
      'baixa',
      'cancelado',
      3,
      4.00,
      0.00,
      5,
      null
    )
)
insert into public.demandas (
  projeto_id,
  colaborador_id,
  titulo,
  descricao,
  area,
  area_id,
  tipo_trabalho_id,
  prioridade,
  prioridade_id,
  status,
  prazo_finalizacao,
  bloqueio_motivo,
  horas_estimadas,
  horas_realizadas,
  data_inicio,
  ultima_atualizacao_em,
  created_at,
  updated_at
)
select
  null,
  profile.id,
  '[DEMO THCM] ' || s.titulo,
  s.descricao,
  area.slug,
  area.id,
  tipo.id,
  s.prioridade_slug,
  prioridade.id,
  s.status,
  (current_date + s.prazo_offset)::date,
  s.bloqueio_motivo,
  s.horas_estimadas,
  s.horas_realizadas,
  case when s.status = 'pendente' then null else current_date - 5 end,
  case when s.status = 'pendente' then null else now() - interval '1 day' end,
  now() - interval '2 days',
  now()
from extras_seed s
join public.areas area on area.slug = s.area_slug
join public.tipos_trabalho tipo on tipo.slug = s.tipo_slug
join public.prioridades prioridade on prioridade.slug = s.prioridade_slug
join lateral (
  select profile_id as id
  from thcm_demo_profiles
  order by
    case
      when rn = (
        ((s.profile_slot - 1) % (select count(*) from thcm_demo_profiles)) + 1
      ) then 0
      else 1
    end,
    rn
  limit 1
) profile on true;

with historico_seed (codigo, status_anterior, status_novo, comentario, offset_days) as (
  values
    ('THCM-MB', null, 'planejado', 'Projeto criado para estruturar monitoramento de boletos.', 42),
    ('THCM-MB', 'planejado', 'em andamento', 'Inicio da execucao com primeiras demandas priorizadas.', 35),
    ('THCM-BAL1', null, 'planejado', 'Projeto criado para validacao inicial do modelo de balancete.', 18),
    ('THCM-BAL1', 'planejado', 'em andamento', 'Primeiras validacoes tecnicas iniciadas com Dados e BI.', 10),
    ('THCM-BMULT', null, 'planejado', 'Projeto criado para mapear o fluxo de baixas multiplas.', 31),
    ('THCM-BMULT', 'planejado', 'em andamento', 'Execucao iniciada com dependencia de ambiente.', 21),
    ('THCM-BMULT', 'em andamento', 'bloqueado', 'Projeto bloqueado por pendencia de acesso e validacao externa.', 4)
)
insert into public.projeto_status_historico (
  projeto_id,
  profile_id,
  status_anterior,
  status_novo,
  comentario,
  created_at
)
select
  projeto.id,
  gestor.id,
  s.status_anterior,
  s.status_novo,
  s.comentario,
  now() - make_interval(days => s.offset_days)
from historico_seed s
join public.projetos projeto on projeto.codigo = s.codigo
join lateral (
  select profile_id as id
  from thcm_demo_profiles
  order by
    case when role = 'GESTOR' then 0 else 1 end,
    rn
  limit 1
) gestor on true;

with entregas_seed (codigo, titulo, data_offset, status) as (
  values
    ('THCM-MB', 'Mapeamento de regras de boleto', -18, 'concluido'),
    ('THCM-MB', 'Painel de divergencias de cobranca', 8, 'em andamento'),
    ('THCM-MB', 'Alertas automaticos para vencimentos', 21, 'pendente'),
    ('THCM-BAL1', 'Modelo de dados do balancete', -5, 'concluido'),
    ('THCM-BAL1', 'Validacao cruzada com planilhas historicas', 15, 'em andamento'),
    ('THCM-BAL1', 'Publicacao do relatorio gerencial', 32, 'pendente'),
    ('THCM-BMULT', 'Desenho do fluxo de baixas', -12, 'concluido'),
    ('THCM-BMULT', 'Homologacao de ambiente de execucao', 6, 'bloqueado'),
    ('THCM-BMULT', 'Checklist de auditoria operacional', 18, 'pendente')
)
insert into public.projeto_entregas (
  projeto_id,
  titulo,
  data_prevista,
  status,
  created_at,
  updated_at
)
select
  projeto.id,
  s.titulo,
  (current_date + s.data_offset)::date,
  s.status,
  now() - interval '10 days',
  now()
from entregas_seed s
join public.projetos projeto on projeto.codigo = s.codigo;

with documentos_seed (codigo, nome, url, tipo, offset_days) as (
  values
    ('THCM-MB', 'Briefing - Monitor de Boletos', 'https://example.com/thcm/monitor-boletos/briefing.pdf', 'PDF', 40),
    ('THCM-MB', 'Mapa de Regras de Cobranca', 'https://example.com/thcm/monitor-boletos/regras.xlsx', 'Planilha', 21),
    ('THCM-BAL1', 'Especificacao - Modelo Balancete 1', 'https://example.com/thcm/modelo-balancete-1/especificacao.pdf', 'PDF', 17),
    ('THCM-BAL1', 'Amostra de Dados para Validacao', 'https://example.com/thcm/modelo-balancete-1/amostra.xlsx', 'Planilha', 8),
    ('THCM-BMULT', 'Desenho do Processo de Baixas Multiplas', 'https://example.com/thcm/baixas-multiplas/processo.pdf', 'PDF', 29),
    ('THCM-BMULT', 'Checklist de Pendencias de Acesso', 'https://example.com/thcm/baixas-multiplas/checklist.xlsx', 'Planilha', 3)
)
insert into public.projeto_documentos (
  projeto_id,
  nome,
  url,
  tipo,
  uploaded_by,
  created_at
)
select
  projeto.id,
  s.nome,
  s.url,
  s.tipo,
  gestor.id,
  now() - make_interval(days => s.offset_days)
from documentos_seed s
join public.projetos projeto on projeto.codigo = s.codigo
join lateral (
  select profile_id as id
  from thcm_demo_profiles
  order by
    case when role = 'GESTOR' then 0 else 1 end,
    rn
  limit 1
) gestor on true;

insert into public.demanda_atualizacoes_semanais (
  demanda_id,
  profile_id,
  status,
  horas_trabalhadas,
  comentario,
  semana_inicio,
  semana_fim
)
select
  d.id,
  d.colaborador_id,
  d.status,
  coalesce(d.horas_realizadas, 0),
  case
    when d.status = 'concluido' then 'Atualizacao demo: demanda concluida e pronta para validacao.'
    when d.status = 'bloqueado' then 'Atualizacao demo: demanda bloqueada por dependencia externa.'
    when d.status = 'cancelado' then 'Atualizacao demo: demanda cancelada apos repriorizacao.'
    else 'Atualizacao demo: execucao em andamento com progresso parcial.'
  end,
  (current_date - 7)::date,
  (current_date - 1)::date
from public.demandas d
where d.titulo like '[DEMO THCM]%'
  and d.status <> 'pendente';

with totals as (
  select
    projeto_id,
    coalesce(sum(horas_estimadas), 0)::numeric(10, 2) as horas_estimadas
  from public.demandas
  where projeto_id in (
    select id
    from public.projetos
    where codigo in ('THCM-MB', 'THCM-BAL1', 'THCM-BMULT')
  )
  group by projeto_id
)
update public.projetos projeto
set horas_estimadas = totals.horas_estimadas,
    updated_at = now()
from totals
where projeto.id = totals.projeto_id;

commit;

select
  'THCM demo seed concluido' as resultado,
  (select count(*) from public.projetos where codigo in ('THCM-MB', 'THCM-BAL1', 'THCM-BMULT')) as projetos_criados,
  (select count(*) from public.demandas where titulo like '[DEMO THCM]%') as demandas_criadas,
  (select count(distinct area_id) from public.demandas where titulo like '[DEMO THCM]%') as areas_cobertas,
  (select count(distinct colaborador_id) from public.demandas where titulo like '[DEMO THCM]%') as usuarios_reais_utilizados;
