import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  History,
  MoreVertical,
  Pencil,
  Plus,
  TrendingUp,
  User,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type {
  AreaCadastro,
  Cliente,
  Demanda,
  Fornecedor,
  Profile,
  PrioridadeCadastro,
  ProjetoMembro,
  TipoTrabalho,
} from "../types/domain";

type ProjetoMetricas = {
  id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  status: string;
  data_inicio: string | null;
  prazo_final: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  area_id: string | null;
  area_nome: string | null;
  area_slug: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  demandas_total: number | null;
  demandas_ativas: number | null;
  demandas_bloqueadas: number | null;
  demandas_concluidas: number | null;
  demandas_atrasadas: number | null;
  horas_estimadas: number | string | null;
  horas_realizadas: number | string | null;
  progresso_percentual: number | null;
  created_at?: string;
  updated_at?: string;
};

type DemandaDetalhada = Pick<
  Demanda,
  | "id"
  | "titulo"
  | "descricao"
  | "status"
  | "bloqueio_motivo"
  | "horas_estimadas"
  | "horas_realizadas"
  | "data_inicio"
  | "prazo_finalizacao"
  | "ultima_atualizacao_em"
  | "created_at"
  | "projeto_id"
  | "colaborador_id"
  | "prioridade"
  | "execucao_tipo"
  | "fornecedor_id"
> & {
  area_nome: string | null;
  area_slug: string | null;
  tipo_trabalho_nome: string | null;
  prioridade_nome: string | null;
  prioridade_slug: string | null;
  responsavel_nome: string | null;
  fornecedor_nome: string | null;
};

type ProfileResumo = Pick<Profile, "id" | "nome" | "cargo" | "avatar_url">;
type ColaboradorCategoria = Pick<
  Profile,
  "id" | "nome" | "ativo" | "area_id" | "role"
>;

type ProjetoMembroRow = ProjetoMembro & {
  profiles: ProfileResumo | ProfileResumo[] | null;
};

type ProjetoEntrega = {
  id: string;
  projeto_id: string;
  demanda_id: string | null;
  titulo: string;
  data_prevista: string | null;
  status: string;
  created_at: string;
};

type ProjetoDocumento = {
  id: string;
  projeto_id: string;
  nome: string;
  url: string;
  tipo: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type ProjetoHistorico = {
  id: string;
  projeto_id: string;
  profile_id: string | null;
  status_anterior: string | null;
  status_novo: string;
  comentario: string | null;
  created_at: string;
  profiles: Pick<Profile, "nome"> | Pick<Profile, "nome">[] | null;
};

type TabId =
  | "overview"
  | "demands"
  | "team"
  | "timeline"
  | "docs"
  | "history";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Visão Geral" },
  { id: "demands", label: "Demandas" },
  { id: "team", label: "Equipe" },
  { id: "timeline", label: "Cronograma" },
  { id: "docs", label: "Documentos" },
  { id: "history", label: "Histórico de Atualizações" },
];

const fallbackAreas = [
  { label: "Negócio", slug: "negocio" },
  { label: "Desenvolvimento", slug: "desenvolvimento" },
  { label: "QA", slug: "qa" },
  { label: "Suporte", slug: "suporte" },
  { label: "Produto", slug: "produto" },
];

type ProjectDemandForm = {
  areaId: string;
  tipoTrabalhoId: string;
  execucaoTipo: "interna" | "externa";
  fornecedorId: string;
  colaboradorIds: string[];
  titulo: string;
  descricao: string;
  horasEstimadas: string;
};

type ProjectEditForm = {
  clienteId: string;
  areaId: string;
  responsavelId: string;
  prioridadeId: string;
  nome: string;
  descricao: string;
  dataInicio: string;
  prazoFinal: string;
  horasEstimadas: string;
};

function getEmptyProjectDemandForm(): ProjectDemandForm {
  return {
    areaId: "",
    tipoTrabalhoId: "",
    execucaoTipo: "interna",
    fornecedorId: "",
    colaboradorIds: [],
    titulo: "",
    descricao: "",
    horasEstimadas: "",
  };
}

function getEmptyProjectEditForm(): ProjectEditForm {
  return {
    clienteId: "",
    areaId: "",
    responsavelId: "",
    prioridadeId: "",
    nome: "",
    descricao: "",
    dataInicio: "",
    prazoFinal: "",
    horasEstimadas: "",
  };
}

export function ProjetoDetalhes() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [projeto, setProjeto] = useState<ProjetoMetricas | null>(null);
  const [demandas, setDemandas] = useState<DemandaDetalhada[]>([]);
  const [membros, setMembros] = useState<ProjetoMembroRow[]>([]);
  const [entregas, setEntregas] = useState<ProjetoEntrega[]>([]);
  const [documentos, setDocumentos] = useState<ProjetoDocumento[]>([]);
  const [historico, setHistorico] = useState<ProjetoHistorico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [areas, setAreas] = useState<AreaCadastro[]>([]);
  const [tipos, setTipos] = useState<TipoTrabalho[]>([]);
  const [prioridades, setPrioridades] = useState<PrioridadeCadastro[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorCategoria[]>([]);
  const [projectPriorityId, setProjectPriorityId] = useState("");
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [projectEditForm, setProjectEditForm] =
    useState<ProjectEditForm>(getEmptyProjectEditForm);
  const [projectEditError, setProjectEditError] = useState("");
  const [savingProjectEdit, setSavingProjectEdit] = useState(false);
  const [projectDemandForm, setProjectDemandForm] =
    useState<ProjectDemandForm>(getEmptyProjectDemandForm);
  const [projectDemandError, setProjectDemandError] = useState("");
  const [savingProjectDemand, setSavingProjectDemand] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const carregarDados = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [
      projetoRes,
      demandasRes,
      membrosRes,
      entregasRes,
      documentosRes,
      historicoRes,
      projetoRawRes,
      clientesRes,
      areasRes,
      tiposRes,
      prioridadesRes,
      fornecedoresRes,
      colaboradoresRes,
    ] = await Promise.all([
      supabase.from("vw_projetos_metricas").select("*").eq("id", id).single(),
      supabase
        .from("vw_demandas_detalhadas")
        .select("*")
        .eq("projeto_id", id)
        .order("prazo_finalizacao", { ascending: true }),
      supabase
        .from("projeto_membros")
        .select(
          `
          id,
          projeto_id,
          profile_id,
          papel,
          alocacao_percentual,
          ativo,
          profiles (
            id,
            nome,
            cargo,
            avatar_url
          )
        `
        )
        .eq("projeto_id", id)
        .eq("ativo", true)
        .order("papel", { ascending: true }),
      supabase
        .from("projeto_entregas")
        .select("*")
        .eq("projeto_id", id)
        .order("data_prevista", { ascending: true }),
      supabase
        .from("projeto_documentos")
        .select("*")
        .eq("projeto_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("projeto_status_historico")
        .select(
          `
          id,
          projeto_id,
          profile_id,
          status_anterior,
          status_novo,
          comentario,
          created_at,
          profiles (
            nome
          )
        `
        )
        .eq("projeto_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("projetos").select("prioridade_id").eq("id", id).single(),
      supabase
        .from("clientes")
        .select("id,nome,documento,segmento,ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("areas")
        .select("id,nome,slug,cor,ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("tipos_trabalho")
        .select("id,nome,slug,cor,ativo,area_id")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("prioridades")
        .select("id,nome,slug,peso,cor,ordem,ativo")
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
      supabase
        .from("fornecedores")
        .select("id,nome,tipo,contato,ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("profiles")
        .select("id,nome,ativo,area_id,role")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    if (projetoRes.error || demandasRes.error) {
      if (import.meta.env.DEV) {
        console.error(
          "Erro ao carregar projeto",
          JSON.stringify(
            [
              ["vw_projetos_metricas", projetoRes.error],
              ["vw_demandas_detalhadas", demandasRes.error],
            ].filter(([, error]) => Boolean(error)),
            null,
            2
          )
        );
      }

      setErrorMessage("Não foi possível carregar os detalhes do projeto.");
      setLoading(false);
      return;
    }

    if (import.meta.env.DEV) {
      const optionalErrors = [
        ["projeto_membros", membrosRes.error],
        ["projeto_entregas", entregasRes.error],
        ["projeto_documentos", documentosRes.error],
        ["projeto_status_historico", historicoRes.error],
        ["projetos", projetoRawRes.error],
        ["clientes", clientesRes.error],
        ["areas", areasRes.error],
        ["tipos_trabalho", tiposRes.error],
        ["prioridades", prioridadesRes.error],
        ["fornecedores", fornecedoresRes.error],
        ["profiles", colaboradoresRes.error],
      ].filter(([, error]) => Boolean(error));

      if (optionalErrors.length > 0) {
        console.warn(
          "Dados opcionais do projeto não carregados",
          JSON.stringify(optionalErrors, null, 2)
        );
      }
    }

    setProjeto((projetoRes.data as ProjetoMetricas) ?? null);
    setDemandas((demandasRes.data as DemandaDetalhada[]) ?? []);
    setMembros((membrosRes.data as ProjetoMembroRow[]) ?? []);
    setEntregas((entregasRes.data as ProjetoEntrega[]) ?? []);
    setDocumentos((documentosRes.data as ProjetoDocumento[]) ?? []);
    setHistorico((historicoRes.data as ProjetoHistorico[]) ?? []);
    setProjectPriorityId(
      ((projetoRawRes.data as { prioridade_id?: string | null } | null)
        ?.prioridade_id as string | undefined) ?? ""
    );
    setClientes((clientesRes.data as Cliente[]) ?? []);
    setAreas((areasRes.data as AreaCadastro[]) ?? []);
    setTipos((tiposRes.data as TipoTrabalho[]) ?? []);
    setPrioridades((prioridadesRes.data as PrioridadeCadastro[]) ?? []);
    setFornecedores((fornecedoresRes.data as Fornecedor[]) ?? []);
    setColaboradores((colaboradoresRes.data as ColaboradorCategoria[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarDados();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarDados]);

  const demandasTotal = projeto?.demandas_total ?? demandas.length;
  const demandasConcluidas =
    projeto?.demandas_concluidas ??
    demandas.filter((demanda) => normalizeStatus(demanda.status) === "concluido")
      .length;
  const demandasAtivas =
    projeto?.demandas_ativas ??
    demandas.filter((demanda) =>
      ["pendente", "em andamento"].includes(normalizeStatus(demanda.status))
    ).length;
  const demandasBloqueadas =
    projeto?.demandas_bloqueadas ??
    demandas.filter((demanda) =>
      ["bloqueado", "cancelado"].includes(normalizeStatus(demanda.status))
    ).length;
  const demandasAtrasadas =
    projeto?.demandas_atrasadas ??
    demandas.filter((demanda) => isLate(demanda)).length;
  const horasEstimadas =
    toNumber(projeto?.horas_estimadas) ||
    demandas.reduce((total, demanda) => total + getEstimatedHours(demanda), 0);
  const horasRealizadas =
    toNumber(projeto?.horas_realizadas) ||
    demandas.reduce((total, demanda) => total + getWorkedHours(demanda), 0);
  const progresso =
    projeto?.progresso_percentual ??
    (demandasTotal === 0
      ? 0
      : Math.round((demandasConcluidas / demandasTotal) * 100));
  const prazoFinal =
    projeto?.prazo_final ?? getClosestDeadline(demandas) ?? null;
  const responsavelNome =
    projeto?.responsavel_nome ??
    getMemberProfile(membros[0])?.nome ??
    demandas[0]?.responsavel_nome ??
    "-";
  const areaPrincipal =
    projeto?.area_nome ??
    getAreaMetrics(demandas)[0]?.label ??
    "Não definida";
  const radarItems = useMemo(() => buildRadarItems(demandas), [demandas]);
  const areaMetrics = useMemo(() => getAreaMetrics(demandas), [demandas]);
  const colaboradoresAtivos = useMemo(
    () =>
      colaboradores.filter(
        (colaborador) =>
          colaborador.ativo && colaborador.role === "COLABORADOR"
      ),
    [colaboradores]
  );
  const canEditProject = canManageProject(profile?.role);

  const colaboradoresSelecionados = useMemo(
    () =>
      colaboradoresAtivos.filter((colaborador) =>
        projectDemandForm.colaboradorIds.includes(colaborador.id)
      ),
    [colaboradoresAtivos, projectDemandForm.colaboradorIds]
  );

  function updateProjectDemandForm(form: ProjectDemandForm) {
    setProjectDemandForm(form);
    setProjectDemandError("");
  }

  function abrirEdicaoProjeto() {
    if (!projeto) {
      return;
    }

    setProjectEditError("");
    setProjectEditForm({
      clienteId: projeto.cliente_id ?? "",
      areaId: projeto.area_id ?? "",
      responsavelId: projeto.responsavel_id ?? "",
      prioridadeId:
        projectPriorityId ||
        prioridades.find((prioridade) => prioridade.slug === "media")?.id ||
        prioridades[0]?.id ||
        "",
      nome: projeto.nome,
      descricao: projeto.descricao ?? "",
      dataInicio: projeto.data_inicio ?? "",
      prazoFinal: projeto.prazo_final ?? "",
      horasEstimadas: String(toNumber(projeto.horas_estimadas) || ""),
    });
    setProjectEditOpen(true);
  }

  function updateProjectEditForm(form: ProjectEditForm) {
    setProjectEditForm(form);
    setProjectEditError("");
  }

  async function salvarEdicaoProjeto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectEditError("");

    if (!id || !profile || !canEditProject) {
      setProjectEditError("Você não tem permissão para editar este projeto.");
      return;
    }

    const horasEstimadasPlanejadas = Number(projectEditForm.horasEstimadas);

    if (
      !projectEditForm.clienteId ||
      !projectEditForm.areaId ||
      !projectEditForm.responsavelId ||
      !projectEditForm.prioridadeId ||
      !projectEditForm.nome.trim() ||
      !projectEditForm.dataInicio ||
      !projectEditForm.prazoFinal
    ) {
      setProjectEditError("Preencha os campos obrigatórios do projeto.");
      return;
    }

    if (
      !Number.isFinite(horasEstimadasPlanejadas) ||
      horasEstimadasPlanejadas < 0
    ) {
      setProjectEditError("Informe horas estimadas válidas.");
      return;
    }

    setSavingProjectEdit(true);

    const { error } = await supabase
      .from("projetos")
      .update({
        cliente_id: projectEditForm.clienteId,
        area_id: projectEditForm.areaId,
        responsavel_id: projectEditForm.responsavelId,
        prioridade_id: projectEditForm.prioridadeId,
        nome: projectEditForm.nome.trim(),
        descricao: projectEditForm.descricao.trim() || null,
        data_inicio: projectEditForm.dataInicio,
        prazo_final: projectEditForm.prazoFinal,
        horas_estimadas: horasEstimadasPlanejadas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setProjectEditError(`Não foi possível salvar o projeto: ${error.message}`);
      setSavingProjectEdit(false);
      return;
    }

    setSavingProjectEdit(false);
    setProjectEditOpen(false);
    await carregarDados();
  }

  async function salvarDemandaDoProjeto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectDemandError("");

    const selectedArea = areas.find((area) => area.id === projectDemandForm.areaId);
    const selectedType = tipos.find(
      (tipo) => tipo.id === projectDemandForm.tipoTrabalhoId
    );
    const horasEstimadas = Number(projectDemandForm.horasEstimadas);

    if (
      !id ||
      !profile ||
      !selectedArea ||
      !selectedType ||
      (projectDemandForm.execucaoTipo === "externa" &&
        !projectDemandForm.fornecedorId) ||
      projectDemandForm.colaboradorIds.length === 0 ||
      !projectDemandForm.titulo.trim()
    ) {
      setProjectDemandError(
        "Preencha categoria, tipo, execução, responsável e título."
      );
      return;
    }

    if (!Number.isFinite(horasEstimadas) || horasEstimadas <= 0) {
      setProjectDemandError("Informe uma estimativa de horas maior que zero.");
      return;
    }

    setSavingProjectDemand(true);

    const demandasParaCriar = colaboradoresSelecionados.map((colaborador) => ({
      projeto_id: id,
      colaborador_id: colaborador.id,
      titulo: projectDemandForm.titulo.trim(),
      descricao: projectDemandForm.descricao.trim() || null,
      area: selectedArea.slug,
      area_id: selectedArea.id,
      tipo_trabalho_id: selectedType.id,
      prioridade: "media",
      prioridade_id: null,
      status: "pendente",
      horas_estimadas: horasEstimadas,
      horas_realizadas: 0,
      data_inicio: null,
      prazo_finalizacao: null,
      origem: "gestor",
      criada_por_profile_id: profile.id,
      visualizada_em: null,
      execucao_tipo: projectDemandForm.execucaoTipo,
      fornecedor_id:
        projectDemandForm.execucaoTipo === "externa"
          ? projectDemandForm.fornecedorId
          : null,
    }));

    const { error } = await supabase.from("demandas").insert(demandasParaCriar);

    if (error) {
      setProjectDemandError(`Não foi possível criar a demanda: ${error.message}`);
      setSavingProjectDemand(false);
      return;
    }

    setProjectDemandForm(getEmptyProjectDemandForm());
    setSavingProjectDemand(false);
    await carregarDados();
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando projeto...</p>;
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (!projeto) {
    return <p className="text-sm text-slate-500">Projeto não encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
          >
            <ArrowLeft size={16} />
            Voltar para Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={abrirEdicaoProjeto}
              disabled={!canEditProject}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil size={16} />
              Editar projeto
            </button>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
              title="Mais opções"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              {projeto.nome}
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500">
              {horasEstimadas}h estimadas • {demandasTotal} demanda(s) • Status:{" "}
              {getProjectStatusLabel(projeto.status, demandasAtivas)}
            </p>
          </div>

          <ProjectStatusBadge
            status={getProjectStatusLabel(projeto.status, demandasAtivas)}
          />
        </div>

        <section className="grid grid-cols-1 gap-4 border-y border-slate-200 py-5 md:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_1.3fr_1.1fr_1.1fr_1.4fr]">
          <InfoInline
            icon={<FolderKanban size={20} />}
            label="Cliente"
            value={projeto.cliente_nome ?? "-"}
          />
          <InfoInline
            icon={<FolderKanban size={20} />}
            label="Área"
            value={areaPrincipal}
          />
          <InfoInline
            icon={<User size={20} />}
            label="Responsável"
            value={responsavelNome}
          />
          <InfoInline
            icon={<Calendar size={20} />}
            label="Data de início"
            value={formatDate(projeto.data_inicio)}
          />
          <InfoInline
            icon={<Calendar size={20} />}
            label="Prazo final"
            value={formatDate(prazoFinal)}
          />
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500">
                Progresso geral
              </p>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${Math.min(progresso, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-bold text-slate-950">
              {progresso}%
            </span>
          </div>
        </section>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-5 py-4 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <OverviewTab
          projeto={projeto}
          demandas={demandas}
          membros={membros}
          entregas={entregas}
          radarItems={radarItems}
          areaMetrics={areaMetrics}
          progresso={progresso}
          horasEstimadas={horasEstimadas}
          horasRealizadas={horasRealizadas}
          demandasTotal={demandasTotal}
          demandasConcluidas={demandasConcluidas}
          demandasAtrasadas={demandasAtrasadas}
          demandasBloqueadas={demandasBloqueadas}
          prazoFinal={prazoFinal}
          responsavelNome={responsavelNome}
        />
      )}

      {activeTab === "demands" && (
        <DemandasTab
          demandas={demandas}
          form={projectDemandForm}
          areas={areas}
          tipos={tipos}
          fornecedores={fornecedores}
          colaboradores={colaboradoresAtivos}
          errorMessage={projectDemandError}
          saving={savingProjectDemand}
          onFormChange={updateProjectDemandForm}
          onSubmit={salvarDemandaDoProjeto}
        />
      )}
      {activeTab === "team" && (
        <EquipeTab membros={membros} responsavelNome={responsavelNome} />
      )}
      {activeTab === "timeline" && <EntregasTab entregas={entregas} />}
      {activeTab === "docs" && <DocumentosTab documentos={documentos} />}
      {activeTab === "history" && <HistoricoTab historico={historico} />}

      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-2 text-sm font-medium text-slate-500">
        <span>Total de Demandas: {demandasTotal}</span>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <span>Horas Estimadas: {horasEstimadas}h</span>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <span>Horas Realizadas: {horasRealizadas}h</span>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <span>Progresso Geral: {progresso}%</span>
      </footer>

      {projectEditOpen && (
        <ProjectEditModal
          form={projectEditForm}
          clientes={clientes}
          areas={areas}
          responsaveis={colaboradores}
          prioridades={prioridades}
          errorMessage={projectEditError}
          saving={savingProjectEdit}
          onFormChange={updateProjectEditForm}
          onSubmit={salvarEdicaoProjeto}
          onClose={() => {
            setProjectEditOpen(false);
            setProjectEditError("");
          }}
        />
      )}
    </div>
  );
}

function ProjectEditModal({
  form,
  clientes,
  areas,
  responsaveis,
  prioridades,
  errorMessage,
  saving,
  onFormChange,
  onSubmit,
  onClose,
}: {
  form: ProjectEditForm;
  clientes: Cliente[];
  areas: AreaCadastro[];
  responsaveis: ColaboradorCategoria[];
  prioridades: PrioridadeCadastro[];
  errorMessage: string;
  saving: boolean;
  onFormChange: (form: ProjectEditForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">Editar projeto</h2>
          <p className="mt-1 text-sm text-slate-500">
            Atualize as informações de planejamento do projeto.
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="space-y-4 px-6 py-5">
            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <label className="block text-sm font-semibold text-slate-700">
              Nome do projeto *
              <input
                value={form.nome}
                onChange={(event) =>
                  onFormChange({ ...form, nome: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Descrição
              <textarea
                value={form.descricao}
                onChange={(event) =>
                  onFormChange({ ...form, descricao: event.target.value })
                }
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Cliente *
                <select
                  value={form.clienteId}
                  onChange={(event) =>
                    onFormChange({ ...form, clienteId: event.target.value })
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  required
                >
                  <option value="">Selecione</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Área *
                <select
                  value={form.areaId}
                  onChange={(event) =>
                    onFormChange({ ...form, areaId: event.target.value })
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  required
                >
                  <option value="">Selecione</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Responsável *
                <select
                  value={form.responsavelId}
                  onChange={(event) =>
                    onFormChange({ ...form, responsavelId: event.target.value })
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  required
                >
                  <option value="">Selecione</option>
                  {responsaveis.map((responsavel) => (
                    <option key={responsavel.id} value={responsavel.id}>
                      {responsavel.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Prioridade *
                <select
                  value={form.prioridadeId}
                  onChange={(event) =>
                    onFormChange({ ...form, prioridadeId: event.target.value })
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  required
                >
                  <option value="">Selecione</option>
                  {prioridades.map((prioridade) => (
                    <option key={prioridade.id} value={prioridade.id}>
                      {prioridade.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block text-sm font-semibold text-slate-700">
                Data de início *
                <input
                  type="date"
                  value={form.dataInicio}
                  onChange={(event) =>
                    onFormChange({ ...form, dataInicio: event.target.value })
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Prazo final *
                <input
                  type="date"
                  value={form.prazoFinal}
                  onChange={(event) =>
                    onFormChange({ ...form, prazoFinal: event.target.value })
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Horas estimadas *
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={form.horasEstimadas}
                  onChange={(event) =>
                    onFormChange({
                      ...form,
                      horasEstimadas: event.target.value,
                    })
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OverviewTab({
  projeto,
  demandas,
  membros,
  entregas,
  radarItems,
  areaMetrics,
  progresso,
  horasEstimadas,
  horasRealizadas,
  demandasTotal,
  demandasConcluidas,
  demandasAtrasadas,
  demandasBloqueadas,
  prazoFinal,
  responsavelNome,
}: {
  projeto: ProjetoMetricas;
  demandas: DemandaDetalhada[];
  membros: ProjetoMembroRow[];
  entregas: ProjetoEntrega[];
  radarItems: { label: string; value: number }[];
  areaMetrics: { label: string; slug: string; hours: number; total: number }[];
  progresso: number;
  horasEstimadas: number;
  horasRealizadas: number;
  demandasTotal: number;
  demandasConcluidas: number;
  demandasAtrasadas: number;
  demandasBloqueadas: number;
  prazoFinal: string | null;
  responsavelNome: string;
}) {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.05fr]">
        <Panel title="Matriz de Intensidade">
          <RadarChart items={radarItems} />
          <p className="mt-2 text-center text-xs font-medium text-slate-500">
            Esforço (h) por subárea
          </p>
        </Panel>

        <Panel title="Resumo analítico">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {areaMetrics.slice(0, 3).map((item) => (
              <AreaMetric
                key={item.slug}
                label={item.label}
                value={`${item.hours}h`}
                helper={`${percent(item.hours, horasEstimadas)}%`}
              />
            ))}
          </div>

          <h3 className="mt-7 text-xs font-bold uppercase text-slate-500">
            Demandas
          </h3>
          <div className="mt-4 space-y-3">
            {demandas.slice(0, 4).map((demanda) => (
              <DemandSummary key={demanda.id} demanda={demanda} />
            ))}
            {demandas.length === 0 && (
              <EmptyState>Nenhuma demanda vinculada ao projeto.</EmptyState>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Progresso"
          value={`${progresso}%`}
          helper={`${demandasConcluidas} concluída(s)`}
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          label="Horas Estimadas"
          value={`${horasEstimadas}h`}
          helper="Total do projeto"
          icon={<Clock3 size={20} />}
        />
        <MetricCard
          label="Horas Realizadas"
          value={`${horasRealizadas}h`}
          helper={`${percent(horasRealizadas, horasEstimadas)}% do estimado`}
          icon={<CheckCircle2 size={20} />}
        />
        <MetricCard
          label="Demandas Totais"
          value={demandasTotal}
          helper={`${demandasAtrasadas} atrasada(s), ${demandasBloqueadas} bloqueada(s)`}
          icon={<FolderKanban size={20} />}
        />
        <MetricCard
          label="Prazo Final"
          value={formatDate(prazoFinal)}
          helper={getDeadlineText(prazoFinal)}
          icon={<Calendar size={20} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr_1fr]">
        <Panel title="Informações do Projeto">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm md:grid-cols-2">
            <InfoPair label="Cliente" value={projeto.cliente_nome ?? "-"} />
            <InfoPair label="Data de início" value={formatDate(projeto.data_inicio)} />
            <InfoPair label="Área" value={projeto.area_nome ?? "-"} />
            <InfoPair label="Prazo final" value={formatDate(prazoFinal)} />
            <InfoPair label="Responsável" value={responsavelNome} />
            <InfoPair
              label="Descrição"
              value={projeto.descricao ?? "Sem descrição cadastrada."}
            />
          </dl>
        </Panel>

        <Panel title="Membros da Equipe">
          <div className="space-y-3">
            {membros.slice(0, 4).map((membro) => (
              <MemberRow key={membro.id} membro={membro} />
            ))}
            {membros.length === 0 && (
              <EmptyState>Nenhum membro cadastrado.</EmptyState>
            )}
          </div>
        </Panel>

        <Panel title="Próximas Entregas">
          <div className="space-y-3">
            {entregas.slice(0, 4).map((entrega) => (
              <DeliveryRow key={entrega.id} entrega={entrega} />
            ))}
            {entregas.length === 0 && (
              <EmptyState>Nenhuma entrega cadastrada.</EmptyState>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function ProjectDemandCreatePanel({
  form,
  areas,
  tipos,
  fornecedores,
  colaboradores,
  errorMessage,
  saving,
  onFormChange,
  onSubmit,
}: {
  form: ProjectDemandForm;
  areas: AreaCadastro[];
  tipos: TipoTrabalho[];
  fornecedores: Fornecedor[];
  colaboradores: ColaboradorCategoria[];
  errorMessage: string;
  saving: boolean;
  onFormChange: (form: ProjectDemandForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const tiposDaCategoria = tipos.filter(
    (tipo) => tipo.ativo && (!form.areaId || tipo.area_id === form.areaId)
  );

  return (
    <Panel title="Incluir demanda no projeto">
      <form onSubmit={onSubmit} className="space-y-4">
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm font-semibold text-slate-700">
            Categoria *
            <select
              value={form.areaId}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  areaId: event.target.value,
                  tipoTrabalhoId:
                    tipos.find(
                      (tipo) => tipo.ativo && tipo.area_id === event.target.value
                    )?.id ?? "",
                })
              }
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              required
            >
              <option value="">Selecione</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Tipo *
            <select
              value={form.tipoTrabalhoId}
              onChange={(event) =>
                onFormChange({ ...form, tipoTrabalhoId: event.target.value })
              }
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              required
            >
              <option value="">Selecione</option>
              {tiposDaCategoria.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700 xl:col-span-2">
            Título *
            <input
              value={form.titulo}
              onChange={(event) =>
                onFormChange({ ...form, titulo: event.target.value })
              }
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              required
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
          <label className="block text-sm font-semibold text-slate-700">
            Horas estimadas *
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={form.horasEstimadas}
              onChange={(event) =>
                onFormChange({ ...form, horasEstimadas: event.target.value })
              }
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Descrição
            <input
              value={form.descricao}
              onChange={(event) =>
                onFormChange({ ...form, descricao: event.target.value })
              }
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Execução *
            <select
              value={form.execucaoTipo}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  execucaoTipo: event.target.value as "interna" | "externa",
                  fornecedorId:
                    event.target.value === "externa" ? form.fornecedorId : "",
                })
              }
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              required
            >
              <option value="interna">Interna</option>
              <option value="externa">Externa</option>
            </select>
          </label>

          {form.execucaoTipo === "externa" && (
            <label className="block text-sm font-semibold text-slate-700">
              Fornecedor *
              <select
                value={form.fornecedorId}
                onChange={(event) =>
                  onFormChange({ ...form, fornecedorId: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              >
                <option value="">Selecione</option>
                {fornecedores.map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Responsáveis *
          </legend>
          <div className="mt-3 grid max-h-44 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {colaboradores.map((colaborador) => {
              const checked = form.colaboradorIds.includes(colaborador.id);

              return (
                <label
                  key={colaborador.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      onFormChange({
                        ...form,
                        colaboradorIds: event.target.checked
                          ? [...form.colaboradorIds, colaborador.id]
                          : form.colaboradorIds.filter(
                              (id) => id !== colaborador.id
                            ),
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  {colaborador.nome}
                </label>
              );
            })}
          </div>
          {colaboradores.length === 0 && (
            <p className="mt-3 text-sm font-medium text-slate-500">
              Nenhum colaborador ativo encontrado.
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 md:flex-row md:items-center md:justify-between">
          <span>
            {form.colaboradorIds.length > 0
              ? `${form.colaboradorIds.length} colaborador(es) selecionado(s) receberão esta demanda.`
              : "Selecione ao menos um colaborador para receber esta demanda."}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            {saving ? "Criando..." : "Criar demandas"}
          </button>
        </div>
      </form>
    </Panel>
  );
}

function DemandasTab({
  demandas,
  form,
  areas,
  tipos,
  fornecedores,
  colaboradores,
  errorMessage,
  saving,
  onFormChange,
  onSubmit,
}: {
  demandas: DemandaDetalhada[];
  form: ProjectDemandForm;
  areas: AreaCadastro[];
  tipos: TipoTrabalho[];
  fornecedores: Fornecedor[];
  colaboradores: ColaboradorCategoria[];
  errorMessage: string;
  saving: boolean;
  onFormChange: (form: ProjectDemandForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="space-y-5">
      <ProjectDemandCreatePanel
        form={form}
        areas={areas}
        tipos={tipos}
        fornecedores={fornecedores}
        colaboradores={colaboradores}
        errorMessage={errorMessage}
        saving={saving}
        onFormChange={onFormChange}
        onSubmit={onSubmit}
      />

      <Panel title="Demandas vinculadas">
      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Demanda</th>
              <th className="px-5 py-4">Área</th>
              <th className="px-5 py-4">Tipo</th>
              <th className="px-5 py-4">Execução</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Prioridade</th>
              <th className="px-5 py-4">Horas</th>
              <th className="px-5 py-4">Prazo</th>
              <th className="px-5 py-4">Responsável</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {demandas.map((demanda) => (
              <tr key={demanda.id}>
                <td className="max-w-sm px-5 py-4">
                  <Link
                    to={`/demandas/${demanda.id}`}
                    className="font-bold text-slate-950 hover:text-blue-600"
                  >
                    {demanda.titulo}
                  </Link>
                  {demanda.descricao && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {demanda.descricao}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <AreaBadge
                    slug={demanda.area_slug ?? "desenvolvimento"}
                    label={demanda.area_nome ?? "-"}
                  />
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {demanda.tipo_trabalho_nome ?? "-"}
                </td>
                <td className="px-5 py-4">
                  <ExecutionBadge demanda={demanda} />
                </td>
                <td className="px-5 py-4">
                  <DemandStatusBadge status={demanda.status} />
                </td>
                <td className="px-5 py-4">
                  <PriorityBadge prioridade={demanda.prioridade_slug ?? demanda.prioridade ?? "media"} />
                </td>
                <td className="px-5 py-4 font-semibold text-slate-700">
                  {getWorkedHours(demanda)}h / {getEstimatedHours(demanda)}h
                </td>
                <td className="px-5 py-4">
                  <Deadline value={demanda.prazo_finalizacao} />
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {demanda.responsavel_nome ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {demandas.length === 0 && (
        <EmptyState>Nenhuma demanda vinculada ao projeto.</EmptyState>
      )}
      </Panel>
    </div>
  );
}

function EquipeTab({
  membros,
  responsavelNome,
}: {
  membros: ProjetoMembroRow[];
  responsavelNome: string;
}) {
  return (
    <Panel title="Equipe do projeto">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {membros.map((membro) => {
          const profile = getMemberProfile(membro);
          return (
            <div key={membro.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={profile?.nome ?? "-"} src={profile?.avatar_url ?? null} />
                <div>
                  <p className="font-bold text-slate-950">
                    {profile?.nome ?? "Membro sem perfil"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {profile?.cargo ?? membro.papel}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {membro.papel}
                </span>
                <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {membro.alocacao_percentual}% alocação
                </span>
                {profile?.nome === responsavelNome && (
                  <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Responsável
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {membros.length === 0 && <EmptyState>Nenhum membro cadastrado.</EmptyState>}
    </Panel>
  );
}

function EntregasTab({ entregas }: { entregas: ProjetoEntrega[] }) {
  return (
    <Panel title="Cronograma e entregas">
      <div className="space-y-3">
        {entregas.map((entrega) => (
          <DeliveryRow key={entrega.id} entrega={entrega} />
        ))}
      </div>
      {entregas.length === 0 && (
        <EmptyState>Nenhuma entrega cadastrada.</EmptyState>
      )}
    </Panel>
  );
}

function DocumentosTab({ documentos }: { documentos: ProjetoDocumento[] }) {
  return (
    <Panel title="Documentos do projeto">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {documentos.map((documento) => (
          <a
            key={documento.id}
            href={documento.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:bg-blue-50"
          >
            <FileText className="mt-0.5 text-blue-600" size={20} />
            <span>
              <span className="block font-bold text-slate-950">
                {documento.nome}
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                {documento.tipo ?? "Documento"} • {formatDate(documento.created_at)}
              </span>
            </span>
          </a>
        ))}
      </div>
      {documentos.length === 0 && (
        <EmptyState>Nenhum documento cadastrado.</EmptyState>
      )}
    </Panel>
  );
}

function HistoricoTab({ historico }: { historico: ProjetoHistorico[] }) {
  return (
    <Panel title="Histórico de atualizações">
      <div className="space-y-3">
        {historico.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <History size={18} />
            </span>
            <div>
              <p className="font-bold text-slate-950">
                {item.status_anterior
                  ? `${getProjectStatusLabel(item.status_anterior, 0)} → ${getProjectStatusLabel(item.status_novo, 0)}`
                  : getProjectStatusLabel(item.status_novo, 0)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(item.created_at)} • {getHistoryAuthor(item)}
              </p>
              {item.comentario && (
                <p className="mt-2 text-sm text-slate-600">{item.comentario}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {historico.length === 0 && (
        <EmptyState>Nenhum histórico cadastrado.</EmptyState>
      )}
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoInline({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-blue-600">{icon}</span>
      <span>
        <span className="block text-xs font-medium text-slate-500">{label}</span>
        <span className="block font-bold text-slate-950">{value}</span>
      </span>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-blue-600">{icon}</span>
        <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function AreaMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 font-bold text-slate-950">
        {value} <span className="text-slate-500">({helper})</span>
      </p>
    </div>
  );
}

function DemandSummary({ demanda }: { demanda: DemandaDetalhada }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-bold text-slate-950">{demanda.titulo}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <AreaBadge
            slug={demanda.area_slug ?? "desenvolvimento"}
            label={demanda.area_nome ?? "-"}
          />
          <DemandStatusBadge status={demanda.status} />
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {demanda.tipo_trabalho_nome ?? "Demanda"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <PriorityBadge prioridade={demanda.prioridade_slug ?? demanda.prioridade ?? "media"} />
        <span className="text-sm font-bold text-slate-700">
          {getEstimatedHours(demanda)}h
        </span>
      </div>
    </div>
  );
}

function MemberRow({ membro }: { membro: ProjetoMembroRow }) {
  const profile = getMemberProfile(membro);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={profile?.nome ?? "-"} src={profile?.avatar_url ?? null} />
        <div>
          <p className="font-bold text-slate-950">
            {profile?.nome ?? "Membro sem perfil"}
          </p>
          <p className="text-sm text-slate-500">
            {profile?.cargo ?? membro.papel}
          </p>
        </div>
      </div>
      <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
        {membro.papel}
      </span>
    </div>
  );
}

function DeliveryRow({ entrega }: { entrega: ProjetoEntrega }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <Calendar className="mt-0.5 text-blue-600" size={18} />
        <div>
          <p className="font-bold text-slate-950">{entrega.titulo}</p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(entrega.data_prevista)}
          </p>
        </div>
      </div>
      <DeliveryStatusBadge status={entrega.status} />
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function RadarChart({ items }: { items: { label: string; value: number }[] }) {
  const size = 330;
  const center = size / 2;
  const maxRadius = 115;
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  function point(index: number, radius: number) {
    const angle = (Math.PI * 2 * index) / items.length - Math.PI / 2;

    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }

  const polygonPoints = items
    .map((item, index) => {
      const p = point(index, (item.value / maxValue) * maxRadius);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="flex justify-center">
      <svg
        className="h-auto w-full max-w-[360px]"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            fill="none"
            points={items
              .map((_, index) => {
                const p = point(index, maxRadius * level);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        {items.map((item, index) => {
          const outer = point(index, maxRadius);
          const label = point(index, maxRadius + 25);

          return (
            <g key={item.label}>
              <line
                stroke="#e2e8f0"
                x1={center}
                x2={outer.x}
                y1={center}
                y2={outer.y}
              />
              <text
                className="fill-slate-700 text-xs font-semibold"
                dominantBaseline="middle"
                textAnchor="middle"
                x={label.x}
                y={label.y}
              >
                {item.label}
              </text>
            </g>
          );
        })}

        <polygon
          fill="rgba(37, 99, 235, 0.18)"
          points={polygonPoints}
          stroke="#2563eb"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      <img
        alt={name}
        className="h-10 w-10 rounded-full object-cover"
        src={src}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
      {getInitials(name)}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Em andamento": "bg-emerald-50 text-emerald-700",
    Planejado: "bg-amber-50 text-amber-700",
    Bloqueado: "bg-red-50 text-red-700",
    Concluído: "bg-blue-50 text-blue-700",
    Inativo: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function DemandStatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const colors: Record<string, string> = {
    pendente: "bg-amber-50 text-amber-700",
    "em andamento": "bg-emerald-50 text-emerald-700",
    bloqueado: "bg-red-50 text-red-700",
    concluido: "bg-blue-50 text-blue-700",
    cancelado: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-bold ${
        colors[normalized] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {getDemandStatusLabel(status)}
    </span>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const colors: Record<string, string> = {
    pendente: "bg-amber-50 text-amber-700",
    "em andamento": "bg-blue-50 text-blue-700",
    concluido: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-bold ${
        colors[normalized] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {getDemandStatusLabel(status)}
    </span>
  );
}

function AreaBadge({ slug, label }: { slug: string; label: string }) {
  const styles: Record<string, string> = {
    desenvolvimento: "bg-blue-50 text-blue-700",
    suporte: "bg-orange-50 text-orange-700",
    produto: "bg-purple-50 text-purple-700",
    qa: "bg-emerald-50 text-emerald-700",
    marketing: "bg-amber-50 text-amber-700",
    negocio: "bg-teal-50 text-teal-700",
    manutencao: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-bold ${
        styles[slug] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

function ExecutionBadge({ demanda }: { demanda: DemandaDetalhada }) {
  const externa = demanda.execucao_tipo === "externa";
  const label = externa ? "Externa" : "Interna";

  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
        externa ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-700"
      }`}
      title={demanda.fornecedor_nome ?? label}
    >
      {demanda.fornecedor_nome ? `${label}: ${demanda.fornecedor_nome}` : label}
    </span>
  );
}

function PriorityBadge({ prioridade }: { prioridade: string }) {
  const normalized = prioridade.toLowerCase();
  const colors: Record<string, string> = {
    alta: "bg-red-50 text-red-700",
    media: "bg-amber-50 text-amber-700",
    baixa: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-bold ${
        colors[normalized] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {capitalize(prioridade)}
    </span>
  );
}

function Deadline({ value }: { value: string | null }) {
  return (
    <div>
      <p className="font-semibold text-slate-700">{formatDate(value)}</p>
      <p
        className={`mt-1 text-xs font-semibold ${
          isDateLate(value) ? "text-red-600" : "text-slate-500"
        }`}
      >
        {getDeadlineText(value)}
      </p>
    </div>
  );
}

function buildRadarItems(demandas: DemandaDetalhada[]) {
  const metrics = getAreaMetrics(demandas);
  const merged = [...metrics];

  fallbackAreas.forEach((area) => {
    if (!merged.some((item) => item.slug === area.slug)) {
      merged.push({
        label: area.label,
        slug: area.slug,
        hours: 0,
        total: 0,
      });
    }
  });

  return merged.slice(0, 5).map((item) => ({
    label: item.label,
    value: item.hours || item.total,
  }));
}

function getAreaMetrics(demandas: DemandaDetalhada[]) {
  const metrics = new Map<
    string,
    { label: string; slug: string; hours: number; total: number }
  >();

  demandas.forEach((demanda) => {
    const slug = demanda.area_slug ?? "desenvolvimento";
    const current =
      metrics.get(slug) ??
      {
        label: demanda.area_nome ?? capitalize(slug),
        slug,
        hours: 0,
        total: 0,
      };

    current.hours += getEstimatedHours(demanda);
    current.total += 1;
    metrics.set(slug, current);
  });

  const values = Array.from(metrics.values()).sort((a, b) => b.hours - a.hours);

  return values.length > 0
    ? values
    : fallbackAreas.slice(0, 3).map((area) => ({
        label: area.label,
        slug: area.slug,
        hours: 0,
        total: 0,
      }));
}

function getMemberProfile(membro?: ProjetoMembroRow) {
  if (!membro) {
    return null;
  }

  if (Array.isArray(membro.profiles)) {
    return membro.profiles[0] ?? null;
  }

  return membro.profiles;
}

function getHistoryAuthor(item: ProjetoHistorico) {
  if (Array.isArray(item.profiles)) {
    return item.profiles[0]?.nome ?? "Sistema";
  }

  return item.profiles?.nome ?? "Sistema";
}

function getProjectStatusLabel(status: string, activeDemandas: number) {
  const normalized = normalizeStatus(status);

  if (normalized === "concluido") {
    return "Concluído";
  }

  if (normalized === "inativo") {
    return "Inativo";
  }

  if (normalized === "bloqueado") {
    return "Bloqueado";
  }

  if (normalized === "planejado") {
    return "Planejado";
  }

  return activeDemandas > 0 || normalized === "ativo"
    ? "Em andamento"
    : "Planejado";
}

function getDemandStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    "em andamento": "Em andamento",
    bloqueado: "Bloqueado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  return labels[normalizeStatus(status)] ?? status;
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace("concluído", "concluido");
}

function getEstimatedHours(demanda: Pick<Demanda, "horas_estimadas" | "prioridade">) {
  const estimated = toNumber(demanda.horas_estimadas);

  if (estimated > 0) {
    return estimated;
  }

  const weights: Record<string, number> = {
    alta: 16,
    media: 8,
    baixa: 4,
  };

  return weights[String(demanda.prioridade ?? "media").toLowerCase()] ?? 8;
}

function getWorkedHours(demanda: Pick<Demanda, "horas_realizadas" | "horas_estimadas" | "prioridade" | "status">) {
  const worked = toNumber(demanda.horas_realizadas);

  if (worked > 0) {
    return worked;
  }

  return normalizeStatus(demanda.status) === "concluido"
    ? getEstimatedHours(demanda)
    : 0;
}

function isLate(demanda: DemandaDetalhada) {
  return normalizeStatus(demanda.status) !== "concluido" && isDateLate(demanda.prazo_finalizacao);
}

function isDateLate(value: string | null) {
  const days = daysUntil(value);
  return days !== null && days < 0;
}

function getClosestDeadline(demandas: DemandaDetalhada[]) {
  return (
    demandas
      .map((demanda) => demanda.prazo_finalizacao)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null
  );
}

function getDeadlineText(value: string | null) {
  const days = daysUntil(value);

  if (days === null) {
    return "Sem prazo";
  }

  if (days < 0) {
    return `${Math.abs(days)} dia(s) em atraso`;
  }

  if (days === 0) {
    return "vence hoje";
  }

  return `${days} dia(s) restante(s)`;
}

function daysUntil(value: string | null) {
  if (!value) {
    return null;
  }

  const today = startOfDay(new Date());
  const target = parseDate(value);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return parseDate(value).toLocaleDateString("pt-BR");
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function capitalize(value: string) {
  if (!value) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function canManageProject(role?: string | null) {
  return ["GESTOR", "DIRETOR", "ADMIN"].includes(
    role?.trim().toUpperCase() ?? ""
  );
}
