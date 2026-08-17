begin;

-- Limpeza operacional para preparar a base antes de importar dados reais.
-- Preserva cadastros estruturais:
-- profiles, clientes, profile_clientes, areas, tipos_trabalho, prioridades e fornecedores.

delete from public.demanda_atualizacoes_semanais;
delete from public.projeto_entregas;
delete from public.projeto_documentos;
delete from public.projeto_status_historico;
delete from public.projeto_membros;
delete from public.demandas;
delete from public.projetos;

commit;
