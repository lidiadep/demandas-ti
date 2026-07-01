import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock3,
  Download,
  Filter,
  Link as LinkIcon,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
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
type ColaboradorResumo = Pick<Profile, "id" | "nome" | "avatar_url" | "ativo">;

type ColumnId = "active" | "blocked" | "done";

type DemandaCard = Demanda & {
  areaNome: string;
  areaSlug: string;
  tipoNome: string;
  projetoCodigo: string;
  projetoNome: string;
  clienteNome: string;
  responsavelNome: string;
  responsavelAvatar: string | null;
  horasEstimadas: number;
  horasRealizadas: number;
  columnId: ColumnId;
};

type ColumnConfig = {
  id: ColumnId;
  title: string;
  tone: "green" | "red" | "blue";
};

const columns: ColumnConfig[] = [
  {
    id: "active",
    title: "Em andamento",
    tone: "green",
  },
  {
    id: "blocked",
    title: "Bloqueado",
    tone: "red",
  },
  {
    id: "done",
    title: "Concluído",
    tone: "blue",
  },
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

export function Kanban() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorResumo[]>([]);
  const [areas, setAreas] = useState<AreaCadastro[]>([]);
  const [tipos, setTipos] = useState<TipoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");

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
      supabase.from("profiles").select("id,nome,avatar_url,ativo").order("nome"),
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
          "Erro ao carregar kanban",
          JSON.stringify(queryErrors, null, 2)
        );
      }

      setErrorMessage("Não foi possível carregar o kanban de demandas.");
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

  const demandasComContexto = useMemo<DemandaCard[]>(() => {
    return demandas.map((demanda) => {
      const projeto = projetosMap.get(demanda.projeto_id);
      const cliente = projeto ? clientesMap.get(projeto.cliente_id) : null;
      const responsavel = colaboradoresMap.get(demanda.colaborador_id);
      const areaCadastro = demanda.area_id
        ? areasMap.get(demanda.area_id)
        : null;
      const tipo = demanda.tipo_trabalho_id
        ? tiposMap.get(demanda.tipo_trabalho_id)
        : null;
      const areaSlug = areaCadastro?.slug ?? demanda.area ?? "desenvolvimento";

      return {
        ...demanda,
        areaNome: areaCadastro?.nome ?? getAreaLabel(areaSlug),
        areaSlug,
        tipoNome: tipo?.nome ?? "Demanda",
        projetoCodigo: projeto?.codigo ?? "PRJ",
        projetoNome: projeto?.nome ?? "Projeto não informado",
        clienteNome: cliente?.nome ?? "Cliente não informado",
        responsavelNome: responsavel?.nome ?? "Responsável não informado",
        responsavelAvatar: responsavel?.avatar_url ?? null,
        horasEstimadas: getEstimatedHours(demanda),
        horasRealizadas: getWorkedHours(demanda),
        columnId: getColumnId(demanda.status),
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
        projectFilter === "all" || demanda.projeto_id === projectFilter;
      const matchesArea =
        areaFilter === "all" ||
        demanda.area_id === areaFilter ||
        demanda.areaSlug === areaFilter;
      const matchesResponsavel =
        responsavelFilter === "all" ||
        demanda.colaborador_id === responsavelFilter;
      const matchesTipo =
        tipoFilter === "all" || demanda.tipo_trabalho_id === tipoFilter;

      return (
        matchesSearch &&
        matchesProject &&
        matchesArea &&
        matchesResponsavel &&
        matchesTipo
      );
    });
  }, [
    areaFilter,
    demandasComContexto,
    projectFilter,
    responsavelFilter,
    searchTerm,
    tipoFilter,
  ]);

  const demandasPorColuna = useMemo(() => {
    return columns.reduce<Record<ColumnId, DemandaCard[]>>(
      (acc, column) => {
        acc[column.id] = demandasFiltradas.filter(
          (demanda) => demanda.columnId === column.id
        );
        return acc;
      },
      {
        active: [],
        blocked: [],
        done: [],
      }
    );
  }, [demandasFiltradas]);

  const totalHorasEstimadas = demandasFiltradas.reduce(
    (total, demanda) => total + demanda.horasEstimadas,
    0
  );
  const totalHorasRealizadas = demandasFiltradas.reduce(
    (total, demanda) => total + demanda.horasRealizadas,
    0
  );
  const progressoGeral =
    totalHorasEstimadas === 0
      ? 0
      : Math.round((totalHorasRealizadas / totalHorasEstimadas) * 100);

  function limparFiltros() {
    setSearchTerm("");
    setProjectFilter("all");
    setAreaFilter("all");
    setResponsavelFilter("all");
    setTipoFilter("all");
  }

  function exportarKanban() {
    const header = [
      "Demanda",
      "Projeto",
      "Cliente",
      "Área",
      "Tipo",
      "Status",
      "Prazo",
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
    link.download = "kanban-demandas.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando kanban...</p>;
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6">
      <header className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Kanban</h1>
          <p className="mt-2 text-sm text-slate-500">
            Acompanhe o andamento das demandas em todos os projetos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ActionButton icon={<Calendar size={18} />} label="Período">
            <span className="block text-sm font-semibold text-slate-950">
              {formatWeekRange(new Date())}
            </span>
          </ActionButton>

          <button className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <Filter size={18} />
            Filtros
          </button>

          <button
            onClick={exportarKanban}
            className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download size={18} />
            Exportar
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1.4fr]">
        <FilterSelect
          label="Projeto"
          value={projectFilter}
          onChange={setProjectFilter}
          options={projetos.map((projeto) => ({
            label: projeto.nome,
            value: projeto.id,
          }))}
          placeholder="Todos os projetos"
        />

        <FilterSelect
          label="Área"
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
          label="Responsável"
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
          label="Tipo"
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

        <label className="flex h-14 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-500 shadow-sm">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Buscar demanda..."
          />
          {(searchTerm ||
            projectFilter !== "all" ||
            areaFilter !== "all" ||
            responsavelFilter !== "all" ||
            tipoFilter !== "all") && (
            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Limpar filtros"
            >
              <SlidersHorizontal size={16} />
            </button>
          )}
        </label>
      </section>

      <section className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-3">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            demandas={demandasPorColuna[column.id]}
          />
        ))}
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-2 text-sm font-medium text-slate-500">
        <span>Total de Demandas: {demandasFiltradas.length}</span>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <span>Horas Estimadas: {totalHorasEstimadas}h</span>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <span>Horas Realizadas: {totalHorasRealizadas}h</span>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <span>Progresso Geral: {progressoGeral}%</span>
        <span className="flex basis-full items-center justify-center gap-2 text-blue-600">
          <RefreshCw size={14} />
          Última atualização: agora
        </span>
      </footer>
    </div>
  );
}

function KanbanColumn({
  column,
  demandas,
}: {
  column: ColumnConfig;
  demandas: DemandaCard[];
}) {
  const tone = {
    green: {
      dot: "bg-emerald-500",
      count: "bg-slate-100 text-slate-700",
      border: "border-t-emerald-500",
    },
    red: {
      dot: "bg-red-500",
      count: "bg-red-50 text-red-700",
      border: "border-t-red-500",
    },
    blue: {
      dot: "bg-emerald-500",
      count: "bg-blue-50 text-blue-700",
      border: "border-t-blue-500",
    },
  }[column.tone];

  return (
    <div
      className={`flex min-h-[620px] flex-col rounded-2xl border border-slate-200 border-t-4 bg-white shadow-sm ${tone.border}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <span className={`h-3.5 w-3.5 rounded-full ${tone.dot}`} />
          <h2 className="text-lg font-bold text-slate-950">{column.title}</h2>
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold ${tone.count}`}
          >
            {demandas.length}
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-500">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-slate-100"
            title="Adicionar demanda"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-slate-100"
            title="Mais opções"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {demandas.map((demanda) => (
          <DemandCard key={demanda.id} demanda={demanda} />
        ))}

        {demandas.length === 0 && (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
            Nenhuma demanda neste status.
          </div>
        )}
      </div>

      <button
        type="button"
        className="mx-4 mb-4 mt-auto flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        <Plus size={16} />
        Adicionar demanda
      </button>
    </div>
  );
}

function DemandCard({ demanda }: { demanda: DemandaCard }) {
  const late = isLate(demanda);
  const blocked = demanda.columnId === "blocked";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-bold text-slate-950">
            {demanda.titulo}
          </h3>
          <p className="mt-2 truncate text-sm font-medium text-slate-500">
            {demanda.projetoNome}
          </p>
        </div>

        <Avatar name={demanda.responsavelNome} src={demanda.responsavelAvatar} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AreaBadge area={demanda.areaSlug} label={demanda.areaNome} />
        <TypeBadge label={demanda.tipoNome} />
        {demanda.status === "pendente" && <StatusBadge label="Pendente" />}
      </div>

      {blocked && demanda.bloqueio_motivo && (
        <p className="mt-4 flex items-start gap-2 text-sm font-medium text-red-600">
          <LinkIcon className="mt-0.5 shrink-0" size={15} />
          {demanda.bloqueio_motivo}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
        {demanda.prazo_finalizacao && (
          <span className={late ? "text-red-600" : ""}>
            <Calendar className="mr-2 inline-block align-[-3px]" size={16} />
            {formatDate(demanda.prazo_finalizacao)}
          </span>
        )}
        <span>
          <Clock3 className="mr-2 inline-block align-[-3px]" size={16} />
          {demanda.horasEstimadas}h
        </span>
      </div>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
      >
        <option value="all">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <button className="inline-flex min-w-56 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-left text-slate-700 shadow-sm hover:bg-slate-50">
      {icon}
      <span>
        <span className="block text-xs font-medium text-slate-500">
          {label}
        </span>
        {children}
      </span>
    </button>
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
      className={`rounded-lg px-3 py-1 text-xs font-bold ${
        styles[area] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

function TypeBadge({ label }: { label: string }) {
  const lowerLabel = label.toLowerCase();
  const style = lowerLabel.includes("suporte")
    ? "bg-orange-50 text-orange-700"
    : lowerLabel.includes("projeto")
      ? "bg-blue-50 text-blue-700"
      : lowerLabel.includes("terceir")
        ? "bg-purple-50 text-purple-700"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-lg px-3 py-1 text-xs font-bold ${style}`}>
      {label}
    </span>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
      {label}
    </span>
  );
}

function getColumnId(status: string): ColumnId {
  const normalized = normalizeStatus(status);

  if (normalized === "concluido") {
    return "done";
  }

  if (normalized === "bloqueado" || normalized === "cancelado") {
    return "blocked";
  }

  return "active";
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

  return weights[demanda.prioridade ?? "media"] ?? 8;
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
  if (!demanda.prazo_finalizacao || getColumnId(demanda.status) === "done") {
    return false;
  }

  return new Date(demanda.prazo_finalizacao) < startOfToday();
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function formatWeekRange(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
