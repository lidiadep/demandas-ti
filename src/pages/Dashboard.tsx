import {
  ArrowRight,
  Calendar,
  Download,
  FileText,
  Folder,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { KpiCard } from "../components/dashboard/KpiCards";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type { Cliente, Demanda, Profile, Projeto } from "../types/domain";

type ProjetoResumo = Pick<Projeto, "id" | "cliente_id" | "nome" | "status">;
type ColaboradorResumo = Pick<Profile, "id" | "nome" | "role" | "ativo">;

const areas = ["produto", "marketing", "desenvolvimento", "qa", "suporte"];

const areaLabels: Record<string, string> = {
  produto: "Produto",
  marketing: "Marketing",
  desenvolvimento: "Desenvolvimento",
  qa: "QA",
  suporte: "Suporte",
};

export function Dashboard() {
  const { profile } = useAuth();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const [demandasRes, projetosRes, clientesRes, colaboradoresRes] =
      await Promise.all([
        supabase
          .from("demandas")
          .select(
            "id,titulo,area,prioridade,status,prazo_finalizacao,created_at,projeto_id,colaborador_id,descricao"
          )
          .order("created_at", { ascending: false }),
        supabase.from("projetos").select("id,cliente_id,nome,status"),
        supabase.from("clientes").select("id,nome"),
        supabase.from("profiles").select("id,nome,role,ativo"),
      ]);

    const firstError =
      demandasRes.error ||
      projetosRes.error ||
      clientesRes.error ||
      colaboradoresRes.error;

    if (firstError) {
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

  const demandasFiltradas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return demandas;
    }

    return demandas.filter((demanda) => {
      const projeto = projetosMap.get(demanda.projeto_id);
      const cliente = projeto ? clientesMap.get(projeto.cliente_id) : null;
      const colaborador = colaboradoresMap.get(demanda.colaborador_id);

      return [
        demanda.titulo,
        demanda.area,
        demanda.status,
        demanda.prioridade,
        projeto?.nome,
        cliente?.nome,
        colaborador?.nome,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [clientesMap, colaboradoresMap, demandas, projetosMap, searchTerm]);

  const totalDemandas = demandas.length;
  const pendentes = demandas.filter((d) => d.status === "pendente").length;
  const emAndamento = demandas.filter((d) => d.status === "em andamento").length;
  const concluidas = demandas.filter((d) => d.status === "concluido").length;
  const canceladas = demandas.filter((d) => d.status === "cancelado").length;

  const atrasadas = demandas.filter((d) => {
    if (!d.prazo_finalizacao || d.status === "concluido") {
      return false;
    }

    return new Date(d.prazo_finalizacao) < new Date();
  }).length;

  const projetosAtivos = projetos.filter((p) => p.status === "ATIVO").length;
  const colaboradoresAtivos = colaboradores.filter((c) => c.ativo).length;
  const demandasAtivas = pendentes + emAndamento;

  const porArea = useMemo(
    () =>
      areas.map((area) => ({
        area,
        total: demandas.filter((demanda) => demanda.area === area).length,
      })),
    [demandas]
  );

  const areaChartItems = porArea.map((item, index) => ({
    label: areaLabels[item.area] ?? item.area,
    value: item.total,
    color: ["#2563eb", "#22c55e", "#f59e0b", "#a855f7", "#64748b"][index],
  }));

  const statusChartItems = [
    {
      label: "Pendentes",
      value: pendentes,
      color: "#f59e0b",
    },
    {
      label: "Em andamento",
      value: emAndamento,
      color: "#2563eb",
    },
    {
      label: "Concluídas",
      value: concluidas,
      color: "#22c55e",
    },
    {
      label: "Canceladas",
      value: canceladas,
      color: "#ef4444",
    },
  ];

  const ultimasDemandas = demandasFiltradas.slice(0, 6);

  function exportarRelatorio() {
    const header = [
      "Demanda",
      "Projeto",
      "Cliente",
      "Area",
      "Status",
      "Prioridade",
      "Prazo",
      "Colaborador",
    ];

    const rows = demandasFiltradas.map((demanda) => {
      const projeto = projetosMap.get(demanda.projeto_id);
      const cliente = projeto ? clientesMap.get(projeto.cliente_id) : null;
      const colaborador = colaboradoresMap.get(demanda.colaborador_id);

      return [
        demanda.titulo,
        projeto?.nome ?? "",
        cliente?.nome ?? "",
        demanda.area,
        demanda.status,
        demanda.prioridade,
        demanda.prazo_finalizacao ?? "",
        colaborador?.nome ?? "",
      ];
    });

    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "relatorio-demandas.csv";
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
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-slate-600">Olá, {profile?.nome}!</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Dashboard de Projetos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Visão geral das demandas, projetos e capacidade da equipe.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
            <Calendar size={18} />
            Período atual
          </button>

          <button
            onClick={exportarRelatorio}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </header>

      <section className="grid grid-cols-5 gap-4">
        <KpiCard
          icon={<Folder size={22} />}
          title="Projetos ativos"
          value={projetosAtivos}
          subtitle={`${projetos.length} projeto(s) no total`}
          color="blue"
        />

        <KpiCard
          icon={<FileText size={22} />}
          title="Demandas ativas"
          value={demandasAtivas}
          subtitle={`${concluidas} concluída(s)`}
          color="green"
        />

        <KpiCard
          icon={<TrendingUp size={22} />}
          title="Demandas atrasadas"
          value={atrasadas}
          subtitle={`${totalDemandas} demanda(s) no total`}
          color="orange"
        />

        <KpiCard
          icon={<Users size={22} />}
          title="Colaboradores"
          value={colaboradoresAtivos}
          subtitle={`${colaboradores.length} perfil(is) no total`}
          color="cyan"
        />

        <KpiCard
          icon={<FileText size={22} />}
          title="Concluídas"
          value={concluidas}
          subtitle={`${canceladas} cancelada(s)`}
          color="purple"
        />
      </section>

      <section className="grid grid-cols-3 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950">Distribuição por Área</h2>
          <DonutChart total={totalDemandas} items={areaChartItems} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950">Status das Demandas</h2>
          <DonutChart total={totalDemandas} items={statusChartItems} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950">Capacidade da Equipe</h2>

          <div className="mt-10 text-center">
            <p className="text-6xl font-bold text-slate-950">
              {totalDemandas === 0
                ? 0
                : Math.round((demandasAtivas / totalDemandas) * 100)}
              %
            </p>

            <p className="mt-3 text-sm text-slate-500">
              demandas abertas em relação ao total
            </p>

            <div className="mt-8 h-3 rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-emerald-500"
                style={{
                  width: `${
                    totalDemandas === 0
                      ? 0
                      : Math.round((demandasAtivas / totalDemandas) * 100)
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Carteira de Demandas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Últimas demandas registradas no ambiente.
            </p>
          </div>

          <label className="flex min-w-80 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
              placeholder="Buscar demanda..."
            />
          </label>
        </div>

        <div className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Demanda</th>
                <th className="px-6 py-4">Projeto</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Área</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Prazo</th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {ultimasDemandas.map((demanda) => {
                const projeto = projetosMap.get(demanda.projeto_id);
                const cliente = projeto
                  ? clientesMap.get(projeto.cliente_id)
                  : undefined;
                const colaborador = colaboradoresMap.get(
                  demanda.colaborador_id
                );

                return (
                  <tr key={demanda.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {demanda.titulo}
                    </td>

                    <td className="px-6 py-4">
                      {projeto ? (
                        <Link
                          to={`/projetos/${projeto.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {projeto.nome}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {cliente?.nome ?? "-"}
                    </td>

                    <td className="px-6 py-4">
                      <Badge>{areaLabels[demanda.area] ?? demanda.area}</Badge>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={demanda.status} />
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {demanda.prioridade}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(demanda.prazo_finalizacao)}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {colaborador?.nome ?? "-"}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {projeto ? (
                        <Link
                          to={`/projetos/${projeto.id}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                          title="Ver detalhes"
                        >
                          <ArrowRight size={18} />
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {ultimasDemandas.length === 0 && (
            <p className="p-6 text-sm text-slate-500">
              Nenhuma demanda encontrada.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-blue-700">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pendente: "border border-yellow-200 bg-yellow-100 text-yellow-700",
    "em andamento": "border border-blue-200 bg-blue-100 text-blue-700",
    concluido: "border border-emerald-200 bg-emerald-100 text-emerald-700",
    cancelado: "border border-red-200 bg-red-100 text-red-700",
  };

  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        colors[status] ?? "border border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function DonutChart({
  total,
  items,
}: {
  total: number;
  items: {
    label: string;
    value: number;
    color: string;
  }[];
}) {
  let current = 0;

  const gradient =
    total === 0
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
    <div className="mt-6 flex items-center gap-8">
      <div className="relative h-40 w-40 shrink-0">
        <div
          className="h-40 w-40 rounded-full"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        />

        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-3xl font-bold text-slate-900">{total}</strong>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const percent =
            total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div key={item.label} className="flex items-start gap-3 text-sm">
              <span
                className="mt-1 h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />

              <div>
                <p className="font-medium text-slate-700">{item.label}</p>
                <p className="text-slate-500">
                  {item.value} ({percent}%)
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}
