-- Importacao consolidada da JaEra para apresentacao.
-- Origem: CSV exportado do Linear + demandas demonstrativas de QA.
-- As horas dos cards do Linear sao estimativas retrospectivas, pois o export nao trouxe Estimate.
-- O card JAE-21 foi excluido conforme solicitado.
-- A consulta e idempotente por titulo e projeto.

begin;

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where lower(email) = lower('qa.lead@parceirojaera.com.br')
      and ativo = true
  ) then
    raise exception 'Perfil ativo de QA nao encontrado para qa.lead@parceirojaera.com.br';
  end if;
end;
$$;

with linear_dados (
  linear_id,
  titulo,
  descricao,
  projeto_nome,
  responsavel_email,
  tipo_slug,
  prioridade_slug,
  status,
  horas_estimadas,
  horas_realizadas,
  data_inicio,
  prazo_finalizacao,
  created_at
) as (
  values
    ('JAE-43', 'Desenvolvimento (web) - Gateway de pagamento', 'Importado do Linear JAE-43. Integração de um gateway genuíno, real a nível de teste inicialmente, pra concluir o fluxo limpo de compra', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'integracao', 'media', 'pendente', 16, 0, '2026-09-25', null, '2026-09-25T13:23:16.618Z'),
    ('JAE-42', 'Desenvolvimento (web) - Notificações', 'Importado do Linear JAE-42. Construção do sistema de notificações diversas no JaEra Conecta', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'pendente', 16, 0, '2026-09-25', null, '2026-09-25T13:22:16.954Z'),
    ('JAE-41', 'Desenvolvimento (web) - Wishlist', 'Importado do Linear JAE-41. Construção de sistema de favoritos, com listagem e etc.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'pendente', 12, 0, '2026-09-25', null, '2026-09-25T13:21:27.229Z'),
    ('JAE-40', 'Desenvolvimento (web) - Avaliação de Produto', 'Importado do Linear JAE-40. Construção do componente de exibição de avaliações e comentarios', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'pendente', 12, 0, '2026-09-25', null, '2026-09-25T13:20:37.354Z'),
    ('JAE-33', 'Validação do uso da cloudflare', 'Importado do Linear JAE-33. Descrição original não informada no export.', 'JaEra Conecta - Infra', 'dev.full@parceirojaera.com.br', 'manutencao', 'media', 'pendente', 8, 0, '2026-09-09', null, '2026-09-09T14:11:58.718Z'),
    ('JAE-39', 'Atualização (web) - Página de Detalhes do Pedido', 'Importado do Linear JAE-39. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'manutencao', 'media', 'em andamento', 8, 4, '2026-09-24', null, '2026-09-10T18:27:35.375Z'),
    ('JAE-32', 'Criação do ambiente de dev no GCP', 'Importado do Linear JAE-32. Descrição original não informada no export.', 'JaEra Conecta - Infra', 'dev.full@parceirojaera.com.br', 'implementacao', 'media', 'em andamento', 16, 8, '2026-09-09', null, '2026-09-09T14:11:49.761Z'),
    ('JAE-10', 'Provision Vercel projects (admin)', 'Importado do Linear JAE-10. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'alta', 'concluido', 8, 8, '2026-02-10', '2026-02-13', '2026-02-10T07:55:51.383Z'),
    ('JAE-38', 'Atualização (web) - Página de Meus Pedidos', 'Importado do Linear JAE-38. Finalizar a mesma, que hoje está simplória e não contemplava o protótipo do figma', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'manutencao', 'media', 'concluido', 8, 8, '2026-09-24', null, '2026-09-10T18:25:42.283Z'),
    ('JAE-37', 'Atualização (web) - Página home', 'Importado do Linear JAE-37. Reorganizar seções e elementos e finalizar a página', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'manutencao', 'media', 'concluido', 8, 8, '2026-09-10', null, '2026-09-10T18:22:52.937Z'),
    ('JAE-35', 'Atualização básica de liçencas dos repositórios', 'Importado do Linear JAE-35. Descrição original não informada no export.', null, 'dev.pleno@parceirojaera.com.br', 'manutencao', 'media', 'concluido', 4, 4, '2026-09-09', null, '2026-09-09T19:52:05.517Z'),
    ('JAE-36', 'Atualização de projetos na vercel', 'Importado do Linear JAE-36. Contempla tambem correções de side effects causados pelos novos nomes dos repositórios', 'JaEra Conecta - Infra', 'dev.pleno@parceirojaera.com.br', 'manutencao', 'media', 'concluido', 8, 8, '2026-09-09', null, '2026-09-09T19:55:27.168Z'),
    ('JAE-34', 'Validação do uso de conta enterprise na vercel', 'Importado do Linear JAE-34. Descrição original não informada no export.', 'JaEra Conecta - Infra', 'dev.full@parceirojaera.com.br', 'manutencao', 'media', 'concluido', 8, 8, '2026-09-09', null, '2026-09-09T14:12:09.229Z'),
    ('JAE-27', 'Create the delete action', 'Importado do Linear JAE-27. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-03-02', null, '2026-03-02T12:16:25.186Z'),
    ('JAE-26', 'Create form to product update', 'Importado do Linear JAE-26. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-03-02', null, '2026-03-02T12:16:09.365Z'),
    ('JAE-29', 'Criação de organização no github para centralização dos repositórios', 'Importado do Linear JAE-29. Descrição original não informada no export.', 'JaEra Conecta - Infra', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-09-09', null, '2026-09-09T14:04:46.953Z'),
    ('JAE-30', 'Mover repositórios para dentro da organização', 'Importado do Linear JAE-30. Descrição original não informada no export.', 'JaEra Conecta - Infra', 'dev.pleno@parceirojaera.com.br', 'manutencao', 'media', 'concluido', 8, 8, '2026-09-09', null, '2026-09-09T14:11:31.148Z'),
    ('JAE-31', 'Padronizar nomes dos repositórios', 'Importado do Linear JAE-31. Descrição original não informada no export.', 'JaEra Conecta - Infra', 'dev.pleno@parceirojaera.com.br', 'manutencao', 'media', 'concluido', 4, 4, '2026-09-09', null, '2026-09-09T14:11:39.353Z'),
    ('JAE-24', 'Create list of Products', 'Importado do Linear JAE-24. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-03-02', null, '2026-03-02T12:15:37.685Z'),
    ('JAE-18', 'Admin: Auth pages (login/logout) + protected routes', 'Importado do Linear JAE-18. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 16, 16, '2026-02-18', '2026-02-20', '2026-02-10T08:05:19.509Z'),
    ('JAE-23', 'Products Crud Page', 'Importado do Linear JAE-23. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 16, 16, '2026-03-02', null, '2026-03-02T12:13:46.171Z'),
    ('JAE-25', 'Create form to add product', 'Importado do Linear JAE-25. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-03-02', null, '2026-03-02T12:15:50.290Z'),
    ('JAE-17', 'Create UI component library baseline (Button/Input/Card) - (Web)', 'Importado do Linear JAE-17. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 16, 16, '2026-02-10', '2026-02-17', '2026-02-10T08:03:15.205Z'),
    ('JAE-16', 'Create UI component library baseline (Button/Input/Card) - Mobile', 'Importado do Linear JAE-16. Descrição original não informada no export.', 'JaEra Conecta - App Mobile', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 16, 16, '2026-02-10', '2026-02-20', '2026-02-10T08:02:53.072Z'),
    ('JAE-15', 'Bootstrap React Native app (Expo + TS)', 'Importado do Linear JAE-15. Descrição original não informada no export.', 'JaEra Conecta - App Mobile', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 16, 16, '2026-02-10', null, '2026-02-10T08:02:08.931Z'),
    ('JAE-14', 'Bootstrap Next.js Admin App (App Router)', 'Importado do Linear JAE-14. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 16, 16, '2026-02-10', '2026-02-13', '2026-02-10T08:01:27.620Z'),
    ('JAE-13', 'Bootstrap Next.js Web App (App Router)', 'Importado do Linear JAE-13. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 16, 16, '2026-02-10', null, '2026-02-10T07:58:44.438Z'),
    ('JAE-9', 'Provision Vercel projects (web)', 'Importado do Linear JAE-9. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-02-10', null, '2026-02-10T07:55:45.538Z'),
    ('JAE-8', 'Setup GitHub Actions: lint + typecheck', 'Importado do Linear JAE-8. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-02-10', null, '2026-02-10T07:55:13.245Z'),
    ('JAE-7', 'Setup commit conventions + PR template', 'Importado do Linear JAE-7. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 4, 4, '2026-02-10', null, '2026-02-10T07:54:41.458Z'),
    ('JAE-6', 'Setup ESLint/Prettier/TSConfig base shared', 'Importado do Linear JAE-6. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-02-10', null, '2026-02-10T07:53:37.056Z'),
    ('JAE-5', 'Create structure + workspace scripts', 'Importado do Linear JAE-5. Descrição original não informada no export.', 'JaEra Conecta - Front End', 'dev.pleno@parceirojaera.com.br', 'implementacao', 'media', 'concluido', 8, 8, '2026-02-10', null, '2026-02-10T07:53:23.275Z')
),
linear_resolvidas as (
  select
    d.*,
    p.id as projeto_id,
    (
      select pr.id
      from public.profiles pr
      where lower(pr.email) = lower(d.responsavel_email)
        and pr.ativo = true
      limit 1
    ) as colaborador_id,
    (
      select id
      from public.areas
      where slug = 'desenvolvimento'
        and ativo = true
      limit 1
    ) as area_id,
    (
      select id
      from public.tipos_trabalho
      where slug = d.tipo_slug
        and ativo = true
      limit 1
    ) as tipo_trabalho_id,
    (
      select id
      from public.prioridades
      where slug = d.prioridade_slug
        and ativo = true
      limit 1
    ) as prioridade_id,
    coalesce(
      (
        select pr.id
        from public.profiles pr
        where lower(pr.email) = lower('gestão@parceirojaera.com.br')
          and pr.ativo = true
        limit 1
      ),
      (
        select pr.id
        from public.profiles pr
        where lower(pr.email) = lower('diretoria@parceirojaera.com.br')
          and pr.ativo = true
        limit 1
      )
    ) as criada_por_profile_id
  from linear_dados d
  left join public.projetos p
    on d.projeto_nome is not null
   and lower(p.nome) = lower(d.projeto_nome)
   and p.cliente_id = (
     select c.id
     from public.clientes c
     where lower(c.nome) in (lower('JaEra'), lower('Já Era'), lower('Ja Era'))
       and c.ativo = true
     limit 1
   )
),
linear_inseridas as (
  insert into public.demandas (
    projeto_id,
    colaborador_id,
    titulo,
    descricao,
    area,
    prioridade,
    status,
    prazo_finalizacao,
    area_id,
    tipo_trabalho_id,
    prioridade_id,
    bloqueio_motivo,
    horas_estimadas,
    horas_realizadas,
    data_inicio,
    origem,
    criada_por_profile_id,
    execucao_tipo,
    created_at
  )
  select
    r.projeto_id,
    r.colaborador_id,
    r.titulo,
    r.descricao,
    'desenvolvimento',
    r.prioridade_slug,
    r.status,
    r.prazo_finalizacao::date,
    r.area_id,
    r.tipo_trabalho_id,
    r.prioridade_id,
    null,
    r.horas_estimadas,
    r.horas_realizadas,
    r.data_inicio::date,
    'gestor',
    r.criada_por_profile_id,
    'externa',
    r.created_at::timestamptz
  from linear_resolvidas r
  where not exists (
    select 1
    from public.demandas existente
    where existente.titulo = r.titulo
      and (
        existente.projeto_id = r.projeto_id
        or (existente.projeto_id is null and r.projeto_id is null)
      )
  )
  returning id
)
select count(*) as cards_linear_inseridos
from linear_inseridas;

with qa_dados (
  projeto_nome,
  titulo,
  descricao,
  tipo_slug,
  prioridade_slug,
  status,
  horas_estimadas,
  horas_realizadas,
  data_inicio,
  prazo_finalizacao,
  bloqueio_motivo
) as (
  values
    ('JaEra Conecta - Front End', 'Homologação do fluxo de checkout', 'Demonstração QA: validar o fluxo completo de checkout e confirmação do pedido.', 'homologacao', 'alta', 'em andamento', 12, 4, '2026-09-22', '2026-09-30', null),
    ('JaEra Conecta - Front End', 'Teste funcional de notificações', 'Demonstração QA: validar o recebimento e a exibição das notificações no produto.', 'teste-funcional', 'media', 'pendente', 8, 0, '2026-09-25', '2026-10-02', null),
    ('JaEra Conecta - Front End', 'Teste regressivo de produtos e wishlist', 'Demonstração QA: validar se as alterações recentes preservaram os fluxos existentes.', 'teste-regressivo', 'media', 'concluido', 10, 10, '2026-09-15', '2026-09-18', null),
    ('JaEra Conecta - Infra', 'Evidências do ambiente de desenvolvimento no GCP', 'Demonstração QA: reunir evidências da configuração e funcionamento do ambiente de desenvolvimento.', 'evidencia', 'media', 'concluido', 6, 6, '2026-09-12', '2026-09-15', null),
    ('JaEra Conecta - Infra', 'Validação do fluxo de deploy e rollback', 'Demonstração QA: validar a publicação da aplicação e o retorno para uma versão anterior.', 'validacao-correcao', 'alta', 'bloqueado', 8, 2, '2026-09-18', '2026-09-20', 'Aguardando configuração final do ambiente de infraestrutura.'),
    ('JaEra Conecta - App Mobile', 'Teste regressivo do aplicativo mobile', 'Demonstração QA: validar os principais fluxos do aplicativo após as últimas alterações.', 'teste-regressivo', 'alta', 'em andamento', 16, 6, '2026-09-23', '2026-10-01', null),
    ('JaEra Conecta - App Mobile', 'Validação do onboarding mobile', 'Demonstração QA: validar cadastro, login e primeiro acesso no aplicativo mobile.', 'teste-funcional', 'media', 'pendente', 8, 0, '2026-09-25', '2026-10-03', null)
),
qa_resolvidas as (
  select
    d.*,
    p.id as projeto_id,
    (
      select pr.id
      from public.profiles pr
      where lower(pr.email) = lower('qa.lead@parceirojaera.com.br')
        and pr.ativo = true
      limit 1
    ) as colaborador_id,
    (
      select id
      from public.areas
      where slug = 'qa'
        and ativo = true
      limit 1
    ) as area_id,
    (
      select id
      from public.tipos_trabalho
      where slug = d.tipo_slug
        and ativo = true
      limit 1
    ) as tipo_trabalho_id,
    (
      select id
      from public.prioridades
      where slug = d.prioridade_slug
        and ativo = true
      limit 1
    ) as prioridade_id,
    coalesce(
      (
        select pr.id
        from public.profiles pr
        where lower(pr.email) = lower('gestão@parceirojaera.com.br')
          and pr.ativo = true
        limit 1
      ),
      (
        select pr.id
        from public.profiles pr
        where lower(pr.email) = lower('diretoria@parceirojaera.com.br')
          and pr.ativo = true
        limit 1
      )
    ) as criada_por_profile_id
  from qa_dados d
  join public.projetos p
    on lower(p.nome) = lower(d.projeto_nome)
   and p.cliente_id = (
     select c.id
     from public.clientes c
     where lower(c.nome) in (lower('JaEra'), lower('Já Era'), lower('Ja Era'))
       and c.ativo = true
     limit 1
   )
),
qa_inseridas as (
  insert into public.demandas (
    projeto_id,
    colaborador_id,
    titulo,
    descricao,
    area,
    prioridade,
    status,
    prazo_finalizacao,
    area_id,
    tipo_trabalho_id,
    prioridade_id,
    bloqueio_motivo,
    horas_estimadas,
    horas_realizadas,
    data_inicio,
    origem,
    criada_por_profile_id,
    execucao_tipo
  )
  select
    r.projeto_id,
    r.colaborador_id,
    r.titulo,
    r.descricao,
    'qa',
    r.prioridade_slug,
    r.status,
    r.prazo_finalizacao::date,
    r.area_id,
    r.tipo_trabalho_id,
    r.prioridade_id,
    r.bloqueio_motivo,
    r.horas_estimadas,
    r.horas_realizadas,
    r.data_inicio::date,
    'gestor',
    r.criada_por_profile_id,
    'interna'
  from qa_resolvidas r
  where not exists (
    select 1
    from public.demandas existente
    where existente.projeto_id = r.projeto_id
      and existente.titulo = r.titulo
  )
  returning id
)
select count(*) as demandas_qa_inseridas
from qa_inseridas;

commit;

select
  count(*) filter (where descricao like 'Importado do Linear%') as total_linear,
  count(*) filter (where descricao like 'Demonstração QA%') as total_qa,
  count(*) as total_importado
from public.demandas
where descricao like 'Importado do Linear%'
   or descricao like 'Demonstração QA%';
