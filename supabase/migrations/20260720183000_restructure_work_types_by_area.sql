alter table public.tipos_trabalho
  add column if not exists area_id uuid references public.areas(id);

insert into public.areas (nome, slug, cor, ativo)
values
  ('Suporte', 'suporte', '#f97316', true),
  ('Desenvolvimento', 'desenvolvimento', '#2563eb', true),
  ('Qualidade/QA', 'qa', '#10b981', true),
  ('Produto/Processo', 'produto', '#7c3aed', true),
  ('Marketing', 'marketing', '#f59e0b', true)
on conflict (slug) do update
set nome = excluded.nome,
    cor = excluded.cor,
    ativo = true;

update public.areas
set ativo = false
where slug not in (
  'suporte',
  'desenvolvimento',
  'qa',
  'produto',
  'marketing'
);

with desired_types(nome, slug, cor, area_slug) as (
  values
    ('N1', 'n1', '#f97316', 'suporte'),
    ('N2', 'n2', '#ea580c', 'suporte'),
    ('N3', 'n3', '#c2410c', 'suporte'),
    ('Dúvida operacional', 'duvida-operacional', '#fb923c', 'suporte'),
    ('Incidente', 'incidente', '#dc2626', 'suporte'),
    ('Implementação', 'implementacao', '#2563eb', 'desenvolvimento'),
    ('Manutenção', 'manutencao', '#1d4ed8', 'desenvolvimento'),
    ('Correção', 'correcao', '#3b82f6', 'desenvolvimento'),
    ('Melhoria', 'melhoria', '#60a5fa', 'desenvolvimento'),
    ('Integração', 'integracao', '#0ea5e9', 'desenvolvimento'),
    ('Teste funcional', 'teste-funcional', '#10b981', 'qa'),
    ('Teste regressivo', 'teste-regressivo', '#059669', 'qa'),
    ('Homologação', 'homologacao', '#34d399', 'qa'),
    ('Evidência', 'evidencia', '#6ee7b7', 'qa'),
    ('Validação de correção', 'validacao-correcao', '#047857', 'qa'),
    ('Levantamento de requisito', 'levantamento-requisito', '#7c3aed', 'produto'),
    ('Especificação', 'especificacao', '#8b5cf6', 'produto'),
    ('Documentação', 'documentacao', '#a78bfa', 'produto'),
    ('Treinamento', 'treinamento', '#6d28d9', 'produto'),
    ('Priorização', 'priorizacao', '#5b21b6', 'produto'),
    ('Pesquisa de Campo', 'pesquisa-campo', '#f59e0b', 'marketing'),
    ('Criação', 'criacao', '#d97706', 'marketing'),
    ('Correção', 'marketing-correcao', '#fbbf24', 'marketing'),
    ('Melhoria', 'marketing-melhoria', '#fcd34d', 'marketing')
)
insert into public.tipos_trabalho (nome, slug, cor, ativo, area_id)
select
  desired_types.nome,
  desired_types.slug,
  desired_types.cor,
  true,
  areas.id
from desired_types
join public.areas on areas.slug = desired_types.area_slug
on conflict (slug) do update
set nome = excluded.nome,
    cor = excluded.cor,
    ativo = true,
    area_id = excluded.area_id;

update public.tipos_trabalho
set ativo = false
where slug not in (
  'n1',
  'n2',
  'n3',
  'duvida-operacional',
  'incidente',
  'implementacao',
  'manutencao',
  'correcao',
  'melhoria',
  'integracao',
  'teste-funcional',
  'teste-regressivo',
  'homologacao',
  'evidencia',
  'validacao-correcao',
  'levantamento-requisito',
  'especificacao',
  'documentacao',
  'treinamento',
  'priorizacao',
  'pesquisa-campo',
  'criacao',
  'marketing-correcao',
  'marketing-melhoria'
);

create index if not exists idx_tipos_trabalho_area_id
  on public.tipos_trabalho(area_id);
