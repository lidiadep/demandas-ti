do $$
declare
  v_cliente_id uuid;
  v_profile_id uuid;
  v_projeto_id uuid;
  v_prioridade_id uuid;
  v_area_id uuid;
  v_tipo_id uuid;
  v_import_marker text := '[IMPORT_JULHO_2026_JOSE_VITOR]';
begin
  select id
    into v_profile_id
  from public.profiles
  where lower(email) = 'jose.vitor@thcm.com.br'
  limit 1;

  if v_profile_id is null then
    raise exception 'Profile jose.vitor@thcm.com.br nao encontrado.';
  end if;

  select id
    into v_cliente_id
  from public.clientes
  where lower(nome) like '%thcm%'
  order by created_at
  limit 1;

  if v_cliente_id is null then
    raise exception 'Cliente THCM nao encontrado.';
  end if;

  select id
    into v_prioridade_id
  from public.prioridades
  where slug = 'media'
  limit 1;

  if v_prioridade_id is null then
    raise exception 'Prioridade media nao encontrada.';
  end if;

  insert into public.projetos (
    cliente_id,
    nome,
    descricao,
    status,
    codigo,
    responsavel_id,
    data_inicio,
    prazo_final,
    horas_estimadas
  )
  select
    v_cliente_id,
    'Atividades Julho/2026 - Jose Vitor',
    'Projeto consolidado para importacao das atividades executadas em julho/2026 por jose.vitor@thcm.com.br.',
    'CONCLUIDO',
    'THCM-JV-2026-07',
    v_profile_id,
    date '2026-07-01',
    date '2026-07-31',
    195.50
  where not exists (
    select 1
    from public.projetos
    where codigo = 'THCM-JV-2026-07'
  );

  select id
    into v_projeto_id
  from public.projetos
  where codigo = 'THCM-JV-2026-07'
  limit 1;

  update public.projetos
  set cliente_id = v_cliente_id,
      responsavel_id = v_profile_id,
      status = 'CONCLUIDO',
      data_inicio = date '2026-07-01',
      prazo_final = date '2026-07-31',
      horas_estimadas = 195.50,
      updated_at = now()
  where id = v_projeto_id;

  insert into public.projeto_membros (
    projeto_id,
    profile_id,
    papel,
    alocacao_percentual,
    ativo
  )
  values (
    v_projeto_id,
    v_profile_id,
    'Desenvolvedor / Suporte',
    100,
    true
  )
  on conflict (projeto_id, profile_id) do update
  set papel = excluded.papel,
      alocacao_percentual = excluded.alocacao_percentual,
      ativo = true,
      updated_at = now();

  delete from public.demandas
  where colaborador_id = v_profile_id
    and descricao like '%' || v_import_marker || '%';

  with source_data(titulo, descricao, area_slug, tipo_slug, horas, data_inicio, prazo_finalizacao) as (
    values
      (
        'Monitor Boletos - Estrutura base e modelagem ZC1/ZC2',
        'Modelagem e preparacao das tabelas/campos ZC1 e ZC2, estrutura base do monitor, tokens, contas, certificados, URLs, client id/secret, dados de beneficiario e configuracoes bancarias.',
        'desenvolvimento',
        'implementacao',
        16.00,
        date '2026-07-07',
        date '2026-07-15'
      ),
      (
        'Monitor Boletos - Integracao Sicredi',
        'Criacao de login/app na pagina do desenvolvedor Sicredi, classe de consultas, obtencao de token, ajustes de API, antecipacao de parcelas, selecao de contas e validacoes de comunicacao.',
        'desenvolvimento',
        'integracao',
        16.00,
        date '2026-07-13',
        date '2026-07-22'
      ),
      (
        'Monitor Boletos - Integracao Itau',
        'Estudo do layout/API Itau, criacao de linhas do boleto, codigo de barras, classe do banco, obtencao de token, montagem do body e envio de boleto em sandbox.',
        'desenvolvimento',
        'integracao',
        14.00,
        date '2026-07-07',
        date '2026-07-30'
      ),
      (
        'Monitor Boletos - Integracao Inter',
        'Testes de inclusao e cancelamento de boleto no Banco Inter, ajuste de envio, baixa manual e atualizacoes relacionadas ao token/monitor.',
        'desenvolvimento',
        'integracao',
        8.00,
        date '2026-07-25',
        date '2026-07-29'
      ),
      (
        'Monitor Boletos - Cancelamento, status e geracao de PDF',
        'Implementacao de consulta de status, geracao/confirmacao de PDF, cancelamento de boleto, cancelamento por bordero, tratamento de erros e metodos de consulta/baixa.',
        'desenvolvimento',
        'implementacao',
        16.00,
        date '2026-07-17',
        date '2026-07-24'
      ),
      (
        'Monitor Boletos - Tela PO-UI e selecao de contas',
        'Prototipo da tela inicial, layout do monitor 2.0, ajuste no Protheus, selecao de conta por banco, API de bancos cadastrados e integracao da aplicacao PO-UI.',
        'desenvolvimento',
        'implementacao',
        10.00,
        date '2026-07-20',
        date '2026-07-30'
      ),
      (
        'Monitor Boletos - Testes, ajustes e compilacao em producao/JOB',
        'Testes de envio, cancelamento, verificacao de status, compilacoes em producao e ambiente de JOBs, atualizacao de fontes e validacoes finais.',
        'qa',
        'homologacao',
        10.00,
        date '2026-07-23',
        date '2026-07-31'
      ),
      (
        'Baixas Multiplas - Correcoes de parcela, desconto e baixa manual',
        'Correcoes de parcela, data de calculo, desconto maior que valor do titulo, baixa manual e testes relacionados a AUTACRESC.',
        'desenvolvimento',
        'correcao',
        12.00,
        date '2026-07-10',
        date '2026-07-29'
      ),
      (
        'Jobs de Baixa - Correcao de envio e funcoes descontinuadas',
        'Analise de console/log, troca de funcao descontinuada, correcao do envio de baixas e atualizacao do ambiente de JOBs.',
        'desenvolvimento',
        'manutencao',
        10.00,
        date '2026-07-02',
        date '2026-07-22'
      ),
      (
        'Relatorios e rotinas descontinuadas - Conversao e compilacao',
        'Conversao de funcoes ATFR070 e CTBR490 em user function, compilacoes em COMPILA/producao e adequacoes apos chamado TOTVS.',
        'desenvolvimento',
        'manutencao',
        14.00,
        date '2026-07-08',
        date '2026-07-14'
      ),
      (
        'Relatorios e rotinas descontinuadas - Ajustes FIN/CTB/FAT/ATF',
        'Ajustes em rotinas e relatorios de Financeiro, Contabilidade, Faturamento e Ativo Fixo, incluindo menus, filial e relatorio de pedidos de compra.',
        'desenvolvimento',
        'correcao',
        9.00,
        date '2026-07-08',
        date '2026-07-13'
      ),
      (
        'Fluig - Ajustes em gestao de contrato e widget consulta processo',
        'Ajustes em campo de aditamento preliminar, liberacao de campos, analise de widget de consulta de processo, logs e dataset de usuario para API.',
        'desenvolvimento',
        'correcao',
        6.00,
        date '2026-07-03',
        date '2026-07-15'
      ),
      (
        'Fluig - Avisos, lembretes e notificacoes de parcelas',
        'Criacao de script e email para notificacao de cessao de parcela, ajustes de frequencia de avisos/lembretes e testes.',
        'desenvolvimento',
        'melhoria',
        6.00,
        date '2026-07-10',
        date '2026-07-30'
      ),
      (
        'Suporte - Acessos, senhas, licencas e usuarios',
        'Apoios de acesso, redefinicao de senha, troca/mudanca de licencas, replica/remocao de papeis de usuarios e duvidas operacionais de dominio.',
        'suporte',
        'n1',
        8.00,
        date '2026-07-01',
        date '2026-07-29'
      ),
      (
        'Suporte - Protheus, servicos, backup e restore',
        'Verificacao de disponibilidade do Protheus, reinicializacao de servicos, backup/restore, documentacao de restore e abertura/acompanhamento de chamados.',
        'suporte',
        'n2',
        10.00,
        date '2026-07-03',
        date '2026-07-31'
      ),
      (
        'Suporte - Salas, equipamentos, impressora, radio e Teams/WhatsApp',
        'Verificacao de salas de reuniao, documentos de conferencia, suporte a equipamentos, mouse, impressora, radio, Teams, WhatsApp Web e vistoria VIVO.',
        'suporte',
        'n1',
        8.00,
        date '2026-07-01',
        date '2026-07-31'
      ),
      (
        'Suporte - Apoio operacional financeiro, baixas, XML e natureza',
        'Apoio para localizar baixas, verificar conta de cliente, preenchimento de natureza, arquivo XML, log de tabela ZA6 e operacoes financeiras pontuais.',
        'suporte',
        'duvida-operacional',
        6.00,
        date '2026-07-10',
        date '2026-07-29'
      ),
      (
        'Intercompany - Ajuste de filial e compilacao',
        'Ajuste de erro de filial e compilacao em producao para Intercompany.',
        'desenvolvimento',
        'correcao',
        5.00,
        date '2026-07-24',
        date '2026-07-27'
      ),
      (
        'TCSEC - Telefone, site e validacao',
        'Alteracao de telefone, solicitacao de ajuste no index.html do site tcsec.com.br e verificacao da alteracao publicada.',
        'desenvolvimento',
        'manutencao',
        4.00,
        date '2026-07-30',
        date '2026-07-30'
      ),
      (
        'Fundo Financeiro - Criacao de tabela e entendimento inicial',
        'Criacao da tabela ZF2 para fundo financeiro e reuniao de entendimento sobre funcionamento do fundo.',
        'produto',
        'levantamento-requisito',
        4.00,
        date '2026-07-31',
        date '2026-07-31'
      ),
      (
        'Atualizacao de fontes, GitHub e ambientes',
        'Atualizacao de fontes no GitHub, ambientes e organizacao de rotinas relacionadas aos projetos do periodo.',
        'desenvolvimento',
        'manutencao',
        3.50,
        date '2026-07-06',
        date '2026-07-27'
      )
  ),
  resolved as (
    select
      source_data.*,
      a.id as area_id,
      t.id as tipo_id
    from source_data
    join public.areas a
      on a.slug = source_data.area_slug
    join public.tipos_trabalho t
      on t.slug = source_data.tipo_slug
     and t.area_id = a.id
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
    horas_estimadas,
    horas_realizadas,
    data_inicio,
    prazo_finalizacao,
    origem,
    criada_por_profile_id,
    visualizada_em,
    execucao_tipo,
    fornecedor_id,
    created_at,
    updated_at,
    ultima_atualizacao_em
  )
  select
    v_projeto_id,
    v_profile_id,
    titulo,
    descricao || chr(10) || chr(10) || v_import_marker,
    area_slug,
    area_id,
    tipo_id,
    'media',
    v_prioridade_id,
    'concluido',
    horas,
    horas,
    data_inicio,
    prazo_finalizacao,
    'colaborador',
    v_profile_id,
    now(),
    'interna',
    null,
    data_inicio::timestamptz,
    now(),
    prazo_finalizacao::timestamptz
  from resolved;

  if (select count(*) from public.demandas where colaborador_id = v_profile_id and descricao like '%' || v_import_marker || '%') <> 21 then
    raise exception 'Importacao incompleta: esperado 21 demandas para Jose Vitor em julho/2026.';
  end if;
end $$;
