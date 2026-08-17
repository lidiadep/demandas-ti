import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Clock3,
  Download,
  FileText,
  Filter,
  Folder,
  MoreVertical,
  Plus,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type { Cliente, Demanda, Profile, Projeto } from "../types/domain";

type ProjetoResumo = Pick<
  Projeto,
  | "id"
  | "cliente_id"
  | "nome"
  | "descricao"
  | "status"
  | "codigo"
  | "area_id"
  | "responsavel_id"
  | "horas_estimadas"
  | "data_inicio"
  | "prazo_final"
>;
type ColaboradorResumo = Pick<Profile, "id" | "nome" | "role" | "ativo">;

type ChartItem = {
  label: string;
  value: number;
  color: string;
  suffix?: string;
};

const areaLabels: Record<string, string> = {
  produto: "Produto",
  marketing: "Marketing",
  desenvolvimento: "Desenvolvimento",
  qa: "QA",
  suporte: "Suporte",
  sustentacao: "Sustentação",
  infraestrutura: "Infraestrutura",
  seguranca: "Segurança",
  processos: "Processos",
  qualidade: "Qualidade",
  negocio: "Negócio",
  manutencao: "Manutenção",
  "dados-bi": "Dados e BI",
  dados_bi: "Dados e BI",
  "relatorio-bi": "Relatório / BI",
  relatorio_bi: "Relatório / BI",
};

const areaColors = [
  "#2563eb",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#0f766e",
  "#ef4444",
  "#64748b",
  "#0891b2",
];

export function Dashboard() {
  const { profile } = useAuth();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [competenceFilter, setCompetenceFilter] = useState("");
  const [periodFilterOpen, setPeriodFilterOpen] = useState(false);
  const portfolioRef = useRef<HTMLElement | null>(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const [demandasRes, projetosRes, clientesRes, colaboradoresRes] =
      await Promise.all([
        supabase
          .from("demandas")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("projetos")
          .select("*")
          .order("nome", { ascending: true }),
        supabase.from("clientes").select("id,nome"),
        supabase.from("profiles").select("id,nome,role,ativo"),
      ]);

    const queryErrors = [
      ["demandas", demandasRes.error],
      ["projetos", projetosRes.error],
      ["clientes", clientesRes.error],
      ["profiles", colaboradoresRes.error],
    ].filter(([, error]) => Boolean(error));

    const firstError = queryErrors[0]?.[1];

    if (firstError) {
      if (import.meta.env.DEV) {
        console.error(
          "Erro ao carregar dashboard",
          JSON.stringify(queryErrors, null, 2)
        );
      }

      setErrorMessage("Não foi possível carregar os dados do dashboard.");
      setLoading(false);
      return;
    }

    setDemandas((demandasRes.data as Demanda[]) ?? []);
    setProjetos((projetosRes.data as ProjetoResumo[]) ?? []);
    setClientes((clientesRes.data as Cliente[]) ?? []);
    setColaboradores((colaboradoresRes.data as ColaboradorResumo[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarDados();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarDados]);

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

  const demandasNoPeriodo = useMemo(
    () =>
      demandas.filter((demanda) =>
        isWithinCompetence(demanda, competenceFilter)
      ),
    [competenceFilter, demandas]
  );

  const projetosComMetricas = useMemo(() => {
    return projetos
      .map((projeto) => {
      const demandasDoProjeto = demandasNoPeriodo.filter(
        (demanda) => demanda.projeto_id === projeto.id
      );
      const concluidas = demandasDoProjeto.filter(
        (demanda) => demanda.status === "concluido"
      ).length;
      const ativas = demandasDoProjeto.filter((demanda) =>
        ["pendente", "em andamento"].includes(demanda.status)
      ).length;
      const atrasadas = demandasDoProjeto.filter(isDemandaAtrasada).length;
      const horasEstimadasDemandas = demandasDoProjeto.reduce(
        (total, demanda) => total + getEstimatedHours(demanda),
        0
      );
      const horasEstimadasProjeto = Number(projeto.horas_estimadas);
      const horasEstimadas =
        Number.isFinite(horasEstimadasProjeto) && horasEstimadasProjeto > 0
          ? horasEstimadasProjeto
          : horasEstimadasDemandas;
      const horasRealizadas = demandasDoProjeto.reduce(
        (total, demanda) => total + getWorkedHours(demanda),
        0
      );
      const progresso =
        demandasDoProjeto.length === 0
          ? 0
          : Math.round((concluidas / demandasDoProjeto.length) * 100);
      const areaPrincipal = getAreaPrincipal(demandasDoProjeto);
      const prazoMaisProximo =
        projeto.prazo_final ?? getPrazoMaisProximo(demandasDoProjeto);
      const responsavel =
        (projeto.responsavel_id
          ? colaboradoresMap.get(projeto.responsavel_id)?.nome
          : null) ??
        (demandasDoProjeto[0]
          ? colaboradoresMap.get(demandasDoProjeto[0].colaborador_id)?.nome
          : null) ??
        "-";

      return {
        ...projeto,
        clienteNome: clientesMap.get(projeto.cliente_id)?.nome ?? "-",
        demandas: demandasDoProjeto.length,
        demandasAtivas: ativas,
        demandasConcluidas: concluidas,
        demandasAtrasadas: atrasadas,
        horasEstimadas,
        horasRealizadas,
        progresso,
        areaPrincipal,
        prazoMaisProximo,
        responsavel,
      };
    })
      .filter(
        (projeto) =>
          !competenceFilter ||
          projeto.demandas > 0 ||
          isProjectWithinCompetence(projeto, competenceFilter)
      );
  }, [clientesMap, colaboradoresMap, competenceFilter, demandasNoPeriodo, projetos]);

  const projetosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return projetosComMetricas;
    }

    return projetosComMetricas.filter((projeto) =>
      [
        projeto.nome,
        projeto.clienteNome,
        projeto.status,
        projeto.areaPrincipal,
        projeto.responsavel,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [projetosComMetricas, searchTerm]);

  const totalDemandas = demandasNoPeriodo.length;
  const pendentes = demandasNoPeriodo.filter((demanda) => demanda.status === "pendente")
    .length;
  const emAndamento = demandasNoPeriodo.filter(
    (demanda) => demanda.status === "em andamento"
  ).length;
  const concluidas = demandasNoPeriodo.filter((demanda) => demanda.status === "concluido")
    .length;
  const bloqueadas = demandasNoPeriodo.filter((demanda) =>
    ["bloqueado", "cancelado"].includes(demanda.status)
  ).length;
  const demandasAtivas = pendentes + emAndamento;
  const demandasAtrasadas = demandasNoPeriodo.filter(isDemandaAtrasada).length;
  const projetosAtivos = projetosComMetricas.filter((projeto) =>
    ["ATIVO", "planejado", "em andamento"].includes(projeto.status)
  ).length;
  const colaboradoresAtivos = colaboradores.filter(
    (colaborador) => colaborador.ativo
  ).length;
  const horasEstimadas = demandasNoPeriodo.reduce(
    (total, demanda) => total + getEstimatedHours(demanda),
    0
  );
  const horasAtivas = demandasNoPeriodo
    .filter((demanda) =>
      ["pendente", "em andamento", "bloqueado"].includes(demanda.status)
    )
    .reduce((total, demanda) => total + getEstimatedHours(demanda), 0);
  const capacidadeUtilizada =
    horasEstimadas === 0 ? 0 : Math.round((horasAtivas / horasEstimadas) * 100);

  const hoursByAreaItems = Array.from(
    demandasNoPeriodo.reduce<Map<string, number>>((totals, demanda) => {
      const area = demanda.area ?? "sem_area";
      totals.set(area, (totals.get(area) ?? 0) + getEstimatedHours(demanda));
      return totals;
    }, new Map())
  )
    .filter(([, value]) => value > 0)
    .map(([area, value], index) => ({
      label: areaLabels[area] ?? formatAreaLabel(area),
      value,
      color: areaColors[index % areaColors.length],
      suffix: "h",
    }));

  const statusChartItems = [
    {
      label: "Em andamento",
      value: emAndamento,
      color: "#2563eb",
    },
    {
      label: "Pendentes",
      value: pendentes,
      color: "#f59e0b",
    },
    {
      label: "Bloqueadas",
      value: bloqueadas,
      color: "#ef4444",
    },
    {
      label: "Concluídas",
      value: concluidas,
      color: "#22c55e",
    },
  ].filter((item) => item.value > 0);

  function exportarRelatorio() {
    const header = [
      "Projeto",
      "Cliente",
      "Area",
      "Status",
      "Progresso",
      "Horas Estimadas",
      "Horas Realizadas",
      "Prazo",
      "Responsavel",
    ];

    const rows = projetosFiltrados.map((projeto) => [
      projeto.nome,
      projeto.clienteNome,
      areaLabels[projeto.areaPrincipal] ?? projeto.areaPrincipal,
      formatProjectStatus(projeto.status, projeto.demandasAtivas),
      `${projeto.progresso}%`,
      projeto.horasEstimadas,
      projeto.horasRealizadas,
      projeto.prazoMaisProximo ?? "",
      projeto.responsavel,
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
    link.download = "carteira-projetos.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando dashboard...</p>;
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
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-slate-600">
            Olá, {profile?.nome}!
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Dashboard de Projetos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Visão geral do portfólio de projetos e capacidade da equipe.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPeriodFilterOpen((open) => !open)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left text-sm font-medium text-slate-700 shadow-sm"
            >
              <Calendar size={18} />
              <span>
                <span className="block text-xs font-medium text-slate-500">
                  Período
                </span>
                {formatCompetenceLabel(competenceFilter)}
              </span>
            </button>

            {periodFilterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  Competência
                  <input
                    type="month"
                    value={competenceFilter}
                    onChange={(event) => setCompetenceFilter(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setCompetenceFilter("");
                    setPeriodFilterOpen(false);
                  }}
                  className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Limpar período
                </button>
              </div>
            )}
          </div>

          <button
            onClick={exportarRelatorio}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm"
          >
            <Download size={18} />
            Exportar Relatório
          </button>

          <button
            type="button"
            onClick={() =>
              portfolioRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm"
          >
            <Filter size={18} />
            Filtros
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          icon={<Folder size={22} />}
          label="Projetos ativos"
          value={projetosAtivos}
          helper={`${projetos.length - projetosAtivos} concluído(s)`}
          color="blue"
          progress={percent(projetosAtivos, projetos.length)}
        />

        <KpiCard
          icon={<FileText size={22} />}
          label="Demandas ativas"
          value={demandasAtivas}
          helper={`${concluidas} concluída(s)`}
          color="green"
          progress={percent(demandasAtivas, totalDemandas)}
        />

        <KpiCard
          icon={<Clock3 size={22} />}
          label="Horas estimadas (TI)"
          value={`${horasEstimadas}h`}
          helper={`${capacidadeUtilizada}% em demandas ativas`}
          color="purple"
          progress={capacidadeUtilizada}
        />

        <KpiCard
          icon={<TrendingUp size={22} />}
          label="Demandas atrasadas"
          value={demandasAtrasadas}
          helper={`${percent(demandasAtrasadas, totalDemandas)}% do total`}
          color="orange"
          progress={percent(demandasAtrasadas, totalDemandas)}
        />

        <KpiCard
          icon={<Users size={22} />}
          label="Colaboradores"
          value={colaboradoresAtivos}
          helper={`${colaboradores.length} perfil(is) no total`}
          color="cyan"
          progress={percent(colaboradoresAtivos, colaboradores.length)}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-[1fr_1fr_1.05fr]">
        <ChartCard title="Distribuição de Horas por Área">
          <DonutChart
            total={horasEstimadas}
            totalLabel="Total"
            centerValue={`${horasEstimadas}h`}
            items={hoursByAreaItems}
          />
        </ChartCard>

        <ChartCard title="Status das Demandas">
          <DonutChart
            total={totalDemandas}
            totalLabel="Total"
            centerValue={String(totalDemandas)}
            items={statusChartItems}
          />
        </ChartCard>

        <ChartCard
          title="Capacidade da Equipe"
          className="lg:col-span-2 2xl:col-span-1"
          action={
            <button className="text-sm font-semibold text-blue-600">
              Ver detalhes
            </button>
          }
        >
          <CapacityGauge
            percent={capacidadeUtilizada}
            used={horasAtivas}
            total={horasEstimadas}
          />
        </ChartCard>
      </section>

      <section
        ref={portfolioRef}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Carteira de Projetos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Lista de todos os projetos ativos e sua performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-72 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
              <Search size={16} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-slate-400"
                placeholder="Buscar projeto..."
              />
            </label>

            <Link
              to="/novo-projeto"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-blue-600"
            >
              <Plus size={16} />
              Novo Projeto
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Projeto</th>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Área</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Progresso</th>
                <th className="px-5 py-4">Horas Estimadas</th>
                <th className="px-5 py-4">Horas Realizadas</th>
                <th className="px-5 py-4">Prazo</th>
                <th className="px-5 py-4">Responsável</th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {projetosFiltrados.slice(0, 8).map((projeto, index) => (
                <tr key={projeto.id} className="align-middle">
                  <td className="px-5 py-4">
                    <Link
                      to={`/projetos/${projeto.id}`}
                      className="font-semibold text-slate-950 hover:text-blue-600"
                    >
                      {projeto.nome}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {projeto.codigo ?? `PRJ${String(index + 1).padStart(3, "0")}`}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {projeto.clienteNome}
                  </td>
                  <td className="px-5 py-4">
                    <AreaBadge area={projeto.areaPrincipal} />
                  </td>
                  <td className="px-5 py-4">
                    <ProjectStatusBadge
                      status={formatProjectStatus(
                        projeto.status,
                        projeto.demandasAtivas
                      )}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <ProgressCell value={projeto.progresso} />
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    {projeto.horasEstimadas}h
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    {projeto.horasRealizadas}h
                  </td>
                  <td className="px-5 py-4">
                    <DeadlineCell value={projeto.prazoMaisProximo} />
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {projeto.responsavel}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Link
                      to={`/projetos/${projeto.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                      title="Ver detalhes"
                    >
                      <MoreVertical size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {projetosFiltrados.length === 0 && (
            <p className="p-6 text-sm text-slate-500">
              Nenhum projeto encontrado.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
          <span>
            Exibindo {Math.min(projetosFiltrados.length, 8)} de{" "}
            {projetosFiltrados.length} projetos
          </span>

          <button className="font-semibold text-blue-600">
            Ver todos os projetos
          </button>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  helper,
  color,
  progress,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  helper: string;
  color: "blue" | "green" | "orange" | "purple" | "cyan";
  progress: number;
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
    cyan: {
      bg: "bg-cyan-50",
      text: "text-cyan-600",
      bar: "bg-cyan-500",
    },
  };
  const style = styles[color];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.bg} ${style.text}`}
      >
        {icon}
      </div>
      <p className="mt-5 text-xs font-bold uppercase text-slate-500">{label}</p>
      <h2 className="mt-2 text-4xl font-bold text-slate-950">{value}</h2>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
      <div className="mt-5 h-1.5 rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full ${style.bar}`}
          style={{ width: `${clampPercent(progress)}%` }}
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  action,
  className = "",
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function DonutChart({
  total,
  totalLabel,
  centerValue,
  items,
}: {
  total: number;
  totalLabel: string;
  centerValue: string;
  items: ChartItem[];
}) {
  let current = 0;
  const hasVisibleItems = total > 0 && items.length > 0;
  const gradient =
    !hasVisibleItems
      ? "#e2e8f0 0deg 360deg"
      : items
          .map((item) => {
            const start = current;
            const angle = (item.value / total) * 360;
            current += angle;
            return `${item.color} ${start}deg ${current}deg`;
          })
          .join(", ");

  return (
    <div className="mt-7 flex flex-col items-center gap-6 lg:flex-row lg:gap-8">
      <div className="relative h-44 w-44 shrink-0">
        <div
          className="h-44 w-44 rounded-full"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        />
        <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-3xl font-bold text-slate-950">
            {centerValue}
          </strong>
          <span className="text-sm text-slate-500">{totalLabel}</span>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        {items.map((item) => {
          const percentValue = percent(item.value, total);

          return (
            <div key={item.label} className="flex items-start gap-3 text-sm">
              <span
                className="mt-1 h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="font-medium text-slate-700">{item.label}</p>
                <p className="mt-1 text-slate-500">
                  {item.value}
                  {item.suffix ?? ""} ({percentValue}%)
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CapacityGauge({
  percent: percentValue,
  used,
  total,
}: {
  percent: number;
  used: number;
  total: number;
}) {
  return (
    <div className="mt-8 flex flex-col items-center">
      <div className="relative h-36 w-72">
        <svg viewBox="0 0 240 140" className="h-full w-full">
          <path
            d="M 30 120 A 90 90 0 0 1 210 120"
            fill="none"
            pathLength="100"
            stroke="#e2e8f0"
            strokeLinecap="round"
            strokeWidth="14"
          />
          <path
            d="M 30 120 A 90 90 0 0 1 210 120"
            fill="none"
            pathLength="100"
            stroke="#22c55e"
            strokeDasharray="100"
            strokeDashoffset={100 - percentValue}
            strokeLinecap="round"
            strokeWidth="14"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-5xl font-bold text-slate-950">{percentValue}%</p>
          <p className="mt-2 text-sm font-medium text-slate-600">
            da capacidade utilizada
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {used}h utilizadas de {total}h estimadas
      </p>
    </div>
  );
}

function AreaBadge({ area }: { area: string }) {
  const styles: Record<string, string> = {
    desenvolvimento: "bg-blue-50 text-blue-700",
    suporte: "bg-orange-50 text-orange-700",
    produto: "bg-purple-50 text-purple-700",
    qa: "bg-emerald-50 text-emerald-700",
    marketing: "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
        styles[area] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {areaLabels[area] ?? area}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Em andamento": "bg-emerald-50 text-emerald-700",
    Pendentes: "bg-amber-50 text-amber-700",
    Bloqueado: "bg-red-50 text-red-700",
    Concluído: "bg-blue-50 text-blue-700",
    Inativo: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function ProgressCell({ value }: { value: number }) {
  return (
    <div className="flex min-w-32 items-center gap-3">
      <div className="h-1.5 w-20 rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-blue-600"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600">{value}%</span>
    </div>
  );
}

function DeadlineCell({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-slate-500">-</span>;
  }

  const days = daysUntil(value);
  const late = days < 0;

  return (
    <div>
      <p className="font-medium text-slate-700">{formatDate(value)}</p>
      <p className={`mt-1 text-xs ${late ? "text-red-600" : "text-slate-500"}`}>
        {late ? `${Math.abs(days)} dia(s) em atraso` : `${days} dia(s)`}
      </p>
    </div>
  );
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

  return demanda.status === "concluido" ? getEstimatedHours(demanda) : 0;
}

function isDemandaAtrasada(demanda: Demanda) {
  if (!demanda.prazo_finalizacao || demanda.status === "concluido") {
    return false;
  }

  return new Date(demanda.prazo_finalizacao) < new Date();
}

function isWithinCompetence(demanda: Demanda, competence: string) {
  if (!competence) {
    return true;
  }

  const [year, month] = competence.split("-").map(Number);

  if (!year || !month) {
    return true;
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const demandStart = demanda.data_inicio
    ? parseDate(demanda.data_inicio)
    : demanda.prazo_finalizacao
      ? parseDate(demanda.prazo_finalizacao)
      : null;
  const demandEnd = demanda.prazo_finalizacao
    ? parseDate(demanda.prazo_finalizacao)
    : demandStart;

  if (!demandStart || !demandEnd) {
    return false;
  }

  return demandStart <= monthEnd && demandEnd >= monthStart;
}

function isProjectWithinCompetence(projeto: ProjetoResumo, competence: string) {
  if (!competence) {
    return true;
  }

  const [year, month] = competence.split("-").map(Number);

  if (!year || !month) {
    return true;
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const projectStart = projeto.data_inicio
    ? parseDate(projeto.data_inicio)
    : projeto.prazo_final
      ? parseDate(projeto.prazo_final)
      : null;
  const projectEnd = projeto.prazo_final ? parseDate(projeto.prazo_final) : projectStart;

  if (!projectStart || !projectEnd) {
    return false;
  }

  return projectStart <= monthEnd && projectEnd >= monthStart;
}

function getAreaPrincipal(demandas: Demanda[]) {
  const totals = new Map<string, number>();

  demandas.forEach((demanda) => {
    const area = demanda.area ?? "desenvolvimento";
    totals.set(area, (totals.get(area) ?? 0) + 1);
  });

  return (
    Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "desenvolvimento"
  );
}

function getPrazoMaisProximo(demandas: Demanda[]) {
  const prazos = demandas
    .map((demanda) => demanda.prazo_finalizacao)
    .filter((prazo): prazo is string => Boolean(prazo))
    .sort();

  return prazos[0] ?? null;
}

function formatProjectStatus(status: string, demandasAtivas: number) {
  if (status === "CONCLUIDO") {
    return "Concluído";
  }

  if (status === "INATIVO") {
    return "Inativo";
  }

  return demandasAtivas > 0 ? "Em andamento" : "Pendentes";
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function formatAreaLabel(area: string) {
  return area
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatCompetenceLabel(value: string) {
  if (!value) {
    return "Semana atual";
  }

  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return "Semana atual";
  }

  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function daysUntil(value: string) {
  const today = new Date();
  const target = new Date(value);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}
