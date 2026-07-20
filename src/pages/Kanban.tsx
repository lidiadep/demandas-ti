import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  Folder,
  LayoutDashboard,
  List,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type {
  AreaCadastro,
  Cliente,
  Demanda,
  Profile,
  Projeto,
  TipoTrabalho,
} from "../types/domain";

type ProjetoResumo = Pick<Projeto, "id" | "nome" | "codigo" | "cliente_id">;
type ColaboradorResumo = Pick<
  Profile,
  "id" | "nome" | "avatar_url" | "ativo" | "area_id" | "role"
>;
type ViewMode = "lista" | "kanban";
type BoardColumnId = "doing" | "pending" | "blocked" | "done";

type GestorDemandForm = {
  projetoId: string;
  areaId: string;
  tipoTrabalhoId: string;
  colaboradorIds: string[];
  titulo: string;
  descricao: string;
  horasEstimadas: string;
};

type DemandaCard = Demanda & {
  areaNome: string;
  areaSlug: string;
  tipoNome: string;
  projetoCodigo: string;
  projetoNome: string;
  clienteNome: string;
  responsavelNome: string;
  responsavelAvatar: string | null;
  prioridadeNome: string;
  prioridadeSlug: string;
  horasEstimadas: number;
  horasRealizadas: number;
  late: boolean;
  boardColumnId: BoardColumnId;
};

type BoardColumn = {
  id: BoardColumnId;
  title: string;
  tone: "green" | "amber" | "red" | "blue";
};

const boardColumns: BoardColumn[] = [
  { id: "doing", title: "Em andamento", tone: "green" },
  { id: "pending", title: "Pendentes", tone: "amber" },
  { id: "blocked", title: "Bloqueadas", tone: "red" },
  { id: "done", title: "Concluídas", tone: "blue" },
];

const areaFallbackLabels: Record<string, string> = {
  desenvolvimento: "Desenvolvimento",
  suporte: "Suporte",
  produto: "Produto",
  qa: "QA",
  marketing: "Marketing",
  negocio: "Negócio",
  manutencao: "Manutenção",
};

const priorityFallbackLabels: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const pageSizeOptions = [5, 10, 20];

function getEmptyGestorDemandForm(): GestorDemandForm {
  return {
    projetoId: "",
    areaId: "",
    tipoTrabalhoId: "",
    colaboradorIds: [],
    titulo: "",
    descricao: "",
    horasEstimadas: "",
  };
}

export function Kanban() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorResumo[]>([]);
  const [areas, setAreas] = useState<AreaCadastro[]>([]);
  const [tipos, setTipos] = useState<TipoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [showWithoutProject, setShowWithoutProject] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [gestorDemandOpen, setGestorDemandOpen] = useState(false);
  const [gestorDemandForm, setGestorDemandForm] = useState<GestorDemandForm>(
    getEmptyGestorDemandForm
  );
  const [gestorDemandError, setGestorDemandError] = useState("");
  const [creatingGestorDemand, setCreatingGestorDemand] = useState(false);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const [
      demandasRes,
      projetosRes,
      clientesRes,
      colaboradoresRes,
      areasRes,
      tiposRes,
    ] = await Promise.all([
      supabase
        .from("demandas")
        .select("*")
        .order("prazo_finalizacao", { ascending: true }),
      supabase.from("projetos").select("id,nome,codigo,cliente_id").order("nome"),
      supabase.from("clientes").select("id,nome"),
      supabase
        .from("profiles")
        .select("id,nome,avatar_url,ativo,area_id,role")
        .order("nome"),
      supabase.from("areas").select("id,nome,slug,cor,ativo").order("nome"),
      supabase
        .from("tipos_trabalho")
        .select("id,nome,slug,cor,ativo")
        .order("nome"),
    ]);

    const queryErrors = [
      ["demandas", demandasRes.error],
      ["projetos", projetosRes.error],
      ["clientes", clientesRes.error],
      ["profiles", colaboradoresRes.error],
      ["areas", areasRes.error],
      ["tipos_trabalho", tiposRes.error],
    ].filter(([, error]) => Boolean(error));

    if (queryErrors.length > 0) {
      if (import.meta.env.DEV) {
        console.error(
          "Erro ao carregar demandas",
          JSON.stringify(queryErrors, null, 2)
        );
      }

      setErrorMessage("Não foi possível carregar as demandas da equipe.");
      setLoading(false);
      return;
    }

    setDemandas((demandasRes.data as Demanda[]) ?? []);
    setProjetos((projetosRes.data as ProjetoResumo[]) ?? []);
    setClientes((clientesRes.data as Cliente[]) ?? []);
    setColaboradores((colaboradoresRes.data as ColaboradorResumo[]) ?? []);
    setAreas((areasRes.data as AreaCadastro[]) ?? []);
    setTipos((tiposRes.data as TipoTrabalho[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarDados();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarDados]);

  const projetosMap = useMemo(
    () => new Map(projetos.map((projeto) => [projeto.id, projeto])),
    [projetos]
  );

  const clientesMap = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes]
  );

  const colaboradoresMap = useMemo(
    () =>
      new Map(
        colaboradores.map((colaborador) => [colaborador.id, colaborador])
      ),
    [colaboradores]
  );

  const areasMap = useMemo(
    () => new Map(areas.map((area) => [area.id, area])),
    [areas]
  );

  const tiposMap = useMemo(
    () => new Map(tipos.map((tipo) => [tipo.id, tipo])),
    [tipos]
  );

  const colaboradoresAtivos = useMemo(
    () =>
      colaboradores.filter(
        (colaborador) =>
          colaborador.ativo && colaborador.role === "COLABORADOR"
      ),
    [colaboradores]
  );

  const colaboradoresSelecionados = useMemo(
    () =>
      colaboradoresAtivos.filter((colaborador) =>
        gestorDemandForm.colaboradorIds.includes(colaborador.id)
      ),
    [colaboradoresAtivos, gestorDemandForm.colaboradorIds]
  );

  const demandasComContexto = useMemo<DemandaCard[]>(() => {
    return demandas.map((demanda) => {
      const projeto = demanda.projeto_id
        ? projetosMap.get(demanda.projeto_id)
        : null;
      const cliente = projeto ? clientesMap.get(projeto.cliente_id) : null;
      const responsavel = colaboradoresMap.get(demanda.colaborador_id);
      const areaCadastro = demanda.area_id
        ? areasMap.get(demanda.area_id)
        : null;
      const tipo = demanda.tipo_trabalho_id
        ? tiposMap.get(demanda.tipo_trabalho_id)
        : null;
      const areaSlug = areaCadastro?.slug ?? demanda.area ?? "desenvolvimento";
      const prioridadeSlug = String(demanda.prioridade ?? "media").toLowerCase();
      const late = isLate(demanda);

      return {
        ...demanda,
        areaNome: areaCadastro?.nome ?? getAreaLabel(areaSlug),
        areaSlug,
        tipoNome: tipo?.nome ?? "Demanda",
        projetoCodigo: projeto?.codigo ?? "Sem código",
        projetoNome: projeto?.nome ?? "Sem projeto",
        clienteNome: cliente?.nome ?? "Cliente não informado",
        responsavelNome: responsavel?.nome ?? "Responsável não informado",
        responsavelAvatar: responsavel?.avatar_url ?? null,
        prioridadeNome: priorityFallbackLabels[prioridadeSlug] ?? prioridadeSlug,
        prioridadeSlug,
        horasEstimadas: getEstimatedHours(demanda),
        horasRealizadas: getWorkedHours(demanda),
        late,
        boardColumnId: getBoardColumnId(demanda.status),
      };
    });
  }, [areasMap, clientesMap, colaboradoresMap, demandas, projetosMap, tiposMap]);

  const demandasFiltradas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return demandasComContexto.filter((demanda) => {
      const matchesSearch =
        !term ||
        [
          demanda.titulo,
          demanda.descricao ?? "",
          demanda.projetoNome,
          demanda.projetoCodigo,
          demanda.clienteNome,
          demanda.areaNome,
          demanda.tipoNome,
          demanda.responsavelNome,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesProject =
        projectFilter === "all" ||
        (projectFilter === "without_project"
          ? !demanda.projeto_id
          : demanda.projeto_id === projectFilter);
      const matchesArea =
        areaFilter === "all" ||
        demanda.area_id === areaFilter ||
        demanda.areaSlug === areaFilter;
      const matchesResponsavel =
        responsavelFilter === "all" ||
        demanda.colaborador_id === responsavelFilter;
      const matchesTipo =
        tipoFilter === "all" || demanda.tipo_trabalho_id === tipoFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "atrasada"
          ? demanda.late
          : normalizeStatus(demanda.status) === statusFilter);
      const matchesPriority =
        priorityFilter === "all" || demanda.prioridadeSlug === priorityFilter;
      const matchesDate = isWithinRange(
        demanda.prazo_finalizacao,
        dateStart,
        dateEnd
      );
      const matchesProjectVisibility =
        showWithoutProject || Boolean(demanda.projeto_id);

      return (
        matchesSearch &&
        matchesProject &&
        matchesArea &&
        matchesResponsavel &&
        matchesTipo &&
        matchesStatus &&
        matchesPriority &&
        matchesDate &&
        matchesProjectVisibility
      );
    });
  }, [
    areaFilter,
    dateEnd,
    dateStart,
    demandasComContexto,
    priorityFilter,
    projectFilter,
    responsavelFilter,
    searchTerm,
    showWithoutProject,
    statusFilter,
    tipoFilter,
  ]);

  const demandasPorColuna = useMemo(() => {
    return boardColumns.reduce<Record<BoardColumnId, DemandaCard[]>>(
      (acc, column) => {
        acc[column.id] = demandasFiltradas.filter(
          (demanda) => demanda.boardColumnId === column.id
        );
        return acc;
      },
      {
        doing: [],
        pending: [],
        blocked: [],
        done: [],
      }
    );
  }, [demandasFiltradas]);

  const totalPages = Math.max(1, Math.ceil(demandasFiltradas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const demandasPaginadas = demandasFiltradas.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const metrics = useMemo(() => {
    const active = demandasFiltradas.filter(
      (demanda) =>
        !["concluido", "cancelado"].includes(normalizeStatus(demanda.status))
    ).length;
    const late = demandasFiltradas.filter((demanda) => demanda.late).length;
    const withoutProject = demandasFiltradas.filter(
      (demanda) => !demanda.projeto_id
    ).length;
    const totalHours = demandasFiltradas.reduce(
      (total, demanda) => total + demanda.horasEstimadas,
      0
    );
    const activeHours = demandasFiltradas
      .filter(
        (demanda) =>
          !["concluido", "cancelado"].includes(normalizeStatus(demanda.status))
      )
      .reduce((total, demanda) => total + demanda.horasEstimadas, 0);

    return {
      active,
      late,
      withoutProject,
      capacity: totalHours === 0 ? 0 : Math.round((activeHours / totalHours) * 100),
      activeHours,
      totalHours,
    };
  }, [demandasFiltradas]);

  function limparFiltros() {
    setSearchTerm("");
    setProjectFilter("all");
    setAreaFilter("all");
    setResponsavelFilter("all");
    setTipoFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDateStart("");
    setDateEnd("");
    setShowWithoutProject(true);
  }

  function exportarDemandas() {
    const header = [
      "Demanda",
      "Projeto",
      "Cliente",
      "Área",
      "Tipo",
      "Status",
      "Prazo",
      "Prioridade",
      "Horas Estimadas",
      "Horas Realizadas",
      "Responsável",
    ];

    const rows = demandasFiltradas.map((demanda) => [
      demanda.titulo,
      demanda.projetoNome,
      demanda.clienteNome,
      demanda.areaNome,
      demanda.tipoNome,
      getStatusLabel(demanda.status),
      demanda.prazo_finalizacao ? formatDate(demanda.prazo_finalizacao) : "",
      demanda.prioridadeNome,
      demanda.horasEstimadas,
      demanda.horasRealizadas,
      demanda.responsavelNome,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "demandas-equipe.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function abrirDemandaGestor() {
    setGestorDemandForm({
      projetoId: projetos[0]?.id ?? "",
      areaId: areas.find((area) => area.ativo)?.id ?? "",
      tipoTrabalhoId: tipos.find((tipo) => tipo.ativo)?.id ?? "",
      colaboradorIds: [],
      titulo: "",
      descricao: "",
      horasEstimadas: "",
    });
    setGestorDemandError("");
    setGestorDemandOpen(true);
  }

  function fecharDemandaGestor() {
    if (creatingGestorDemand) {
      return;
    }

    setGestorDemandOpen(false);
    setGestorDemandError("");
  }

  async function salvarDemandaGestor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGestorDemandError("");

    const selectedArea = areas.find((area) => area.id === gestorDemandForm.areaId);
    const selectedType = tipos.find(
      (tipo) => tipo.id === gestorDemandForm.tipoTrabalhoId
    );
    const horasEstimadas = Number(gestorDemandForm.horasEstimadas);

    if (
      !gestorDemandForm.projetoId ||
      !selectedArea ||
      !selectedType ||
      gestorDemandForm.colaboradorIds.length === 0 ||
      !gestorDemandForm.titulo.trim()
    ) {
      setGestorDemandError(
        "Preencha projeto, categoria, tipo, responsável e título."
      );
      return;
    }

    if (!Number.isFinite(horasEstimadas) || horasEstimadas <= 0) {
      setGestorDemandError("Informe uma estimativa de horas maior que zero.");
      return;
    }

    setCreatingGestorDemand(true);

    const demandasParaCriar = colaboradoresSelecionados.map((colaborador) => ({
      projeto_id: gestorDemandForm.projetoId,
      colaborador_id: colaborador.id,
      titulo: gestorDemandForm.titulo.trim(),
      descricao: gestorDemandForm.descricao.trim() || null,
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
    }));

    const { error } = await supabase.from("demandas").insert(demandasParaCriar);

    if (error) {
      setGestorDemandError(`Não foi possível criar a demanda: ${error.message}`);
      setCreatingGestorDemand(false);
      return;
    }

    setCreatingGestorDemand(false);
    setGestorDemandOpen(false);
    setGestorDemandForm(getEmptyGestorDemandForm());
    await carregarDados();
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando demandas...</p>;
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">
            Demandas da Equipe
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Acompanhe todas as demandas, projetos, responsáveis e prazos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <Calendar size={18} className="text-slate-500" />
            <span>
              <span className="block text-xs font-medium text-slate-500">
                Semana atual
              </span>
              <span className="font-semibold text-slate-800">
                {formatWeekRange(new Date())}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={exportarDemandas}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download size={17} />
            Exportar
          </button>

          <button
            type="button"
            onClick={abrirDemandaGestor}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            title="Demandar tarefa por categoria"
          >
            <Plus size={18} />
            Nova Demanda
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<LayoutDashboard size={24} />}
          label="Ativas"
          value={metrics.active}
          helper={`${percent(metrics.active, demandasFiltradas.length)}% das demandas exibidas`}
          progress={percent(metrics.active, demandasFiltradas.length)}
          color="blue"
        />
        <MetricCard
          icon={<Clock3 size={24} />}
          label="Atrasadas"
          value={metrics.late}
          helper={`${percent(metrics.late, demandasFiltradas.length)}% das demandas exibidas`}
          progress={percent(metrics.late, demandasFiltradas.length)}
          color="orange"
        />
        <MetricCard
          icon={<Folder size={24} />}
          label="Sem projeto"
          value={metrics.withoutProject}
          helper={`${percent(metrics.withoutProject, demandasFiltradas.length)}% das demandas exibidas`}
          progress={percent(metrics.withoutProject, demandasFiltradas.length)}
          color="purple"
        />
        <MetricCard
          icon={<Users size={24} />}
          label="Capacidade utilizada"
          value={`${metrics.capacity}%`}
          helper={`${metrics.activeHours}h utilizadas de ${metrics.totalHours}h estimadas`}
          progress={metrics.capacity}
          color="green"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
          <label className="flex h-12 min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm text-slate-500">
            <Search size={17} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Buscar demanda ou projeto..."
            />
          </label>

          <FilterSelect
            value={projectFilter}
            onChange={setProjectFilter}
            options={[
              ...projetos.map((projeto) => ({
                label: projeto.nome,
                value: projeto.id,
              })),
              { label: "Sem projeto", value: "without_project" },
            ]}
            placeholder="Todos os projetos"
          />

          <FilterSelect
            value={areaFilter}
            onChange={setAreaFilter}
            options={areas
              .filter((area) => area.ativo)
              .map((area) => ({
                label: area.nome,
                value: area.id,
              }))}
            placeholder="Todas as áreas"
          />

          <FilterSelect
            value={responsavelFilter}
            onChange={setResponsavelFilter}
            options={colaboradores
              .filter((colaborador) => colaborador.ativo)
              .map((colaborador) => ({
                label: colaborador.nome,
                value: colaborador.id,
              }))}
            placeholder="Todos os responsáveis"
          />

          <FilterSelect
            value={tipoFilter}
            onChange={setTipoFilter}
            options={tipos
              .filter((tipo) => tipo.ativo)
              .map((tipo) => ({
                label: tipo.nome,
                value: tipo.id,
              }))}
            placeholder="Todos os tipos"
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_1fr_1.3fr_auto_auto]">
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "Em andamento", value: "em andamento" },
              { label: "Pendente", value: "pendente" },
              { label: "Bloqueado", value: "bloqueado" },
              { label: "Concluído", value: "concluido" },
              { label: "Atrasada", value: "atrasada" },
            ]}
            placeholder="Todos os status"
          />

          <FilterSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { label: "Alta", value: "alta" },
              { label: "Média", value: "media" },
              { label: "Baixa", value: "baixa" },
            ]}
            placeholder="Prioridade: Todas"
          />

          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm text-slate-500">
            <Calendar size={16} />
            <input
              type="date"
              value={dateStart}
              onChange={(event) => setDateStart(event.target.value)}
              className="min-w-0 bg-transparent text-slate-700 outline-none"
            />
          </label>

          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm text-slate-500">
            <Calendar size={16} />
            <input
              type="date"
              value={dateEnd}
              onChange={(event) => setDateEnd(event.target.value)}
              className="min-w-0 bg-transparent text-slate-700 outline-none"
            />
          </label>

          <label className="inline-flex h-12 items-center gap-3 whitespace-nowrap px-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={showWithoutProject}
              onChange={(event) => setShowWithoutProject(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Mostrar demandas sem projeto
          </label>

          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Filter size={16} />
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex gap-1">
            <ViewButton
              active={viewMode === "lista"}
              icon={<List size={17} />}
              label="Lista"
              onClick={() => setViewMode("lista")}
            />
            <ViewButton
              active={viewMode === "kanban"}
              icon={<LayoutDashboard size={17} />}
              label="Kanban"
              onClick={() => setViewMode("kanban")}
            />
          </div>

          <p className="hidden text-sm font-medium text-slate-500 md:block">
            {demandasFiltradas.length} demanda(s) encontrada(s)
          </p>
        </div>

        {viewMode === "lista" ? (
          <DemandasTable
            demandas={demandasPaginadas}
            page={safePage}
            pageSize={pageSize}
            total={demandasFiltradas.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        ) : (
          <KanbanBoard demandasPorColuna={demandasPorColuna} />
        )}
      </section>

      <footer className="flex items-center justify-center gap-2 pb-2 text-sm font-medium text-slate-500">
        <SlidersHorizontal size={15} className="text-blue-600" />
        Use os filtros para alternar entre recortes por projeto, área, status e
        responsável.
      </footer>

      {gestorDemandOpen && (
        <GestorDemandModal
          form={gestorDemandForm}
          projetos={projetos}
          areas={areas}
          tipos={tipos}
          colaboradores={colaboradoresAtivos}
          errorMessage={gestorDemandError}
          saving={creatingGestorDemand}
          onChange={setGestorDemandForm}
          onClose={fecharDemandaGestor}
          onSubmit={salvarDemandaGestor}
        />
      )}
    </div>
  );
}

function GestorDemandModal({
  form,
  projetos,
  areas,
  tipos,
  colaboradores,
  errorMessage,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: GestorDemandForm;
  projetos: ProjetoResumo[];
  areas: AreaCadastro[];
  tipos: TipoTrabalho[];
  colaboradores: ColaboradorResumo[];
  errorMessage: string;
  saving: boolean;
  onChange: (form: GestorDemandForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">
            Nova demanda por categoria
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecione os colaboradores que devem receber esta demanda.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Projeto *
              <select
                value={form.projetoId}
                onChange={(event) =>
                  onChange({ ...form, projetoId: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              >
                <option value="">Selecione</option>
                {projetos.map((projeto) => (
                  <option key={projeto.id} value={projeto.id}>
                    {projeto.codigo ? `${projeto.codigo} - ${projeto.nome}` : projeto.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Categoria *
              <select
                value={form.areaId}
                onChange={(event) =>
                  onChange({ ...form, areaId: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              >
                <option value="">Selecione</option>
                {areas
                  .filter((area) => area.ativo)
                  .map((area) => (
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
                  onChange({ ...form, tipoTrabalhoId: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              >
                <option value="">Selecione</option>
                {tipos
                  .filter((tipo) => tipo.ativo)
                  .map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Estimativa de horas *
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={form.horasEstimadas}
                onChange={(event) =>
                  onChange({ ...form, horasEstimadas: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Título *
            <input
              value={form.titulo}
              onChange={(event) =>
                onChange({ ...form, titulo: event.target.value })
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
                onChange({ ...form, descricao: event.target.value })
              }
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-700">
              Responsáveis *
            </legend>
            <div className="mt-3 grid max-h-44 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
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
                        onChange({
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

          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            {form.colaboradorIds.length > 0
              ? `${form.colaboradorIds.length} colaborador(es) selecionado(s) receberão esta demanda.`
              : "Selecione ao menos um colaborador para receber esta demanda."}
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
            {saving ? "Criando..." : "Criar demandas"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DemandasTable({
  demandas,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  demandas: DemandaCard[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Demanda</th>
              <th className="px-5 py-4">Projeto</th>
              <th className="px-5 py-4">Responsável</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Prazo</th>
              <th className="px-5 py-4">Prioridade</th>
              <th className="px-5 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {demandas.map((demanda) => (
              <tr key={demanda.id} className="align-middle">
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-950">
                    {demanda.titulo}
                  </p>
                  {demanda.descricao && (
                    <p className="mt-1 line-clamp-2 max-w-md text-xs text-slate-500">
                      {demanda.descricao}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Folder size={16} className="text-blue-600" />
                    <span>
                      <span className="block font-semibold text-slate-800">
                        {demanda.projetoNome}
                      </span>
                      <span className="text-xs text-slate-500">
                        {demanda.projetoCodigo}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={demanda.responsavelNome}
                      src={demanda.responsavelAvatar}
                    />
                    <span className="font-medium text-slate-700">
                      {demanda.responsavelNome}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <DemandStatusBadge status={demanda.status} late={demanda.late} />
                </td>
                <td className="px-5 py-4">
                  <Deadline value={demanda.prazo_finalizacao} late={demanda.late} />
                </td>
                <td className="px-5 py-4">
                  <PriorityBadge
                    prioridade={demanda.prioridadeSlug}
                    label={demanda.prioridadeNome}
                  />
                </td>
                <td className="px-5 py-4 text-center">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                    title="Mais opções"
                  >
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {demandas.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhuma demanda encontrada para os filtros selecionados.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <span>
          Exibindo {first} a {last} de {total} demanda(s)
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700">
            {page}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} por página
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

function KanbanBoard({
  demandasPorColuna,
}: {
  demandasPorColuna: Record<BoardColumnId, DemandaCard[]>;
}) {
  return (
    <div className="grid min-h-[620px] grid-cols-1 gap-4 bg-slate-50 p-4 xl:grid-cols-4">
      {boardColumns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          demandas={demandasPorColuna[column.id]}
        />
      ))}
    </div>
  );
}

function KanbanColumn({
  column,
  demandas,
}: {
  column: BoardColumn;
  demandas: DemandaCard[];
}) {
  const tone = getToneClasses(column.tone);

  return (
    <div className="flex min-h-[560px] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
          <h2 className="text-sm font-bold uppercase text-slate-800">
            {column.title}
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {demandas.length}
          </span>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          title="Adicionar"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {demandas.map((demanda) => (
          <KanbanCard key={demanda.id} demanda={demanda} />
        ))}

        {demandas.length === 0 && (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500">
            Nenhuma demanda neste grupo.
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ demanda }: { demanda: DemandaCard }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="line-clamp-2 font-bold text-slate-950">
        {demanda.titulo}
      </h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        {demanda.projetoNome}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Avatar name={demanda.responsavelNome} src={demanda.responsavelAvatar} />
        <AreaBadge area={demanda.areaSlug} label={demanda.areaNome} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-medium">
        <span className={demanda.late ? "text-red-600" : "text-slate-600"}>
          <Calendar className="mr-1.5 inline-block align-[-3px]" size={15} />
          {demanda.prazo_finalizacao
            ? formatDate(demanda.prazo_finalizacao)
            : "Sem prazo"}
        </span>
        <span className="text-slate-600">
          <Clock3 className="mr-1.5 inline-block align-[-3px]" size={15} />
          {demanda.horasEstimadas}h
        </span>
      </div>
    </article>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  progress,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  helper: string;
  progress: number;
  color: "blue" | "green" | "orange" | "purple";
}) {
  const styles = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      bar: "bg-blue-600",
    },
    green: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      bar: "bg-emerald-500",
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-600",
      bar: "bg-orange-500",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      bar: "bg-purple-500",
    },
  }[color];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${styles.bg} ${styles.text}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
      </div>
      <div className="mt-5 h-1.5 rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full ${styles.bar}`}
          style={{ width: `${clampPercent(progress)}%` }}
        />
      </div>
    </article>
  );
}

function ViewButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-600 hover:text-slate-950"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
    >
      <option value="all">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
      />
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 ring-2 ring-white">
      {getInitials(name)}
    </span>
  );
}

function AreaBadge({ area, label }: { area: string; label: string }) {
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
      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
        styles[area] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

function DemandStatusBadge({
  status,
  late,
}: {
  status: string;
  late: boolean;
}) {
  if (late) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
        <AlertTriangle size={13} />
        Atrasada
      </span>
    );
  }

  const normalized = normalizeStatus(status);
  const styles: Record<string, string> = {
    pendente: "bg-amber-50 text-amber-700",
    "em andamento": "bg-emerald-50 text-emerald-700",
    bloqueado: "bg-red-50 text-red-700",
    concluido: "bg-blue-50 text-blue-700",
    cancelado: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-bold ${
        styles[normalized] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function PriorityBadge({
  prioridade,
  label,
}: {
  prioridade: string;
  label: string;
}) {
  const styles: Record<string, string> = {
    alta: "bg-red-50 text-red-700",
    media: "bg-amber-50 text-amber-700",
    baixa: "bg-blue-50 text-blue-700",
  };

  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          prioridade === "alta"
            ? "bg-red-500"
            : prioridade === "media"
              ? "bg-amber-500"
              : "bg-blue-500"
        }`}
      />
      <span
        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
          styles[prioridade] ?? "bg-slate-100 text-slate-700"
        }`}
      >
        {label}
      </span>
    </span>
  );
}

function Deadline({ value, late }: { value: string | null; late: boolean }) {
  if (!value) {
    return <span className="text-slate-500">Sem prazo</span>;
  }

  const days = daysUntil(value);

  return (
    <div>
      <p className={`font-semibold ${late ? "text-red-600" : "text-slate-800"}`}>
        {formatDate(value)}
      </p>
      <p className={`mt-1 text-xs ${late ? "text-red-600" : "text-slate-500"}`}>
        {late
          ? `${Math.abs(days)} dia(s) em atraso`
          : days === 0
            ? "vence hoje"
            : `${days} dia(s)`}
      </p>
    </div>
  );
}

function getBoardColumnId(status: string): BoardColumnId {
  const normalized = normalizeStatus(status);

  if (normalized === "concluido") {
    return "done";
  }

  if (normalized === "bloqueado" || normalized === "cancelado") {
    return "blocked";
  }

  if (normalized === "pendente") {
    return "pending";
  }

  return "doing";
}

function getToneClasses(tone: BoardColumn["tone"]) {
  const styles = {
    green: {
      dot: "bg-emerald-500",
    },
    amber: {
      dot: "bg-amber-500",
    },
    red: {
      dot: "bg-red-500",
    },
    blue: {
      dot: "bg-blue-500",
    },
  };

  return styles[tone];
}

function getStatusLabel(status: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, string> = {
    pendente: "Pendente",
    "em andamento": "Em andamento",
    bloqueado: "Bloqueado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  return labels[normalized] ?? status;
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace("concluído", "concluido");
}

function getAreaLabel(area: string) {
  return areaFallbackLabels[area] ?? area;
}

function getEstimatedHours(demanda: Demanda) {
  const estimated = Number(demanda.horas_estimadas);

  if (Number.isFinite(estimated) && estimated > 0) {
    return estimated;
  }

  const weights: Record<string, number> = {
    alta: 16,
    media: 8,
    baixa: 4,
  };

  return weights[String(demanda.prioridade ?? "media").toLowerCase()] ?? 8;
}

function getWorkedHours(demanda: Demanda) {
  const worked = Number(demanda.horas_realizadas);

  if (Number.isFinite(worked) && worked > 0) {
    return worked;
  }

  return normalizeStatus(demanda.status) === "concluido"
    ? getEstimatedHours(demanda)
    : 0;
}

function isLate(demanda: Demanda) {
  if (!demanda.prazo_finalizacao || normalizeStatus(demanda.status) === "concluido") {
    return false;
  }

  return parseDate(demanda.prazo_finalizacao) < startOfToday();
}

function isWithinRange(
  value: string | null,
  dateStart: string,
  dateEnd: string
) {
  if (!value || (!dateStart && !dateEnd)) {
    return true;
  }

  const target = parseDate(value).getTime();

  if (dateStart && target < parseDate(dateStart).getTime()) {
    return false;
  }

  if (dateEnd && target > parseDate(dateEnd).getTime()) {
    return false;
  }

  return true;
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDate(value: string) {
  return parseDate(value).toLocaleDateString("pt-BR");
}

function daysUntil(value: string) {
  const today = startOfToday();
  const target = parseDate(value);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function getWeekRange(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
}

function formatWeekRange(date: Date) {
  const range = getWeekRange(date);
  const start = parseDate(range.start);
  const end = parseDate(range.end);

  const startLabel = start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const endLabel = end.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${startLabel} - ${endLabel.replace(".", "")}`;
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
