import {
  Calendar,
  Download,
  FileText,
  Folder,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type Demanda = {
  id: string;
  titulo: string;
  area: string;
  prioridade: string;
  status: string;
  prazo_finalizacao: string | null;
  created_at: string;
  projeto_id: string;
  colaborador_id: string;
};

type Projeto = {
  id: string;
  cliente_id: string;
  nome: string;
  status: string;
};

type Cliente = {
  id: string;
  nome: string;
};

type Colaborador = {
  id: string;
  nome: string;
  role: string;
};

export function Dashboard() {
  const { profile } = useAuth();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

async function carregarDados() {
  setLoading(true);

  const [demandasRes, projetosRes, clientesRes, colaboradoresRes] =
    await Promise.all([
      supabase
        .from("demandas")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("projetos")
        .select("*"),

      supabase
        .from("clientes")
        .select("*"),

      supabase
        .from("profiles")
        .select("id,nome,role"),
    ]);

  setDemandas((demandasRes.data as Demanda[]) ?? []);
  setProjetos((projetosRes.data as Projeto[]) ?? []);
  console.log("PROJETOS", projetosRes.data);
  console.log("CLIENTES", clientesRes.data);
  console.log("COLABORADORES", colaboradoresRes.data);
  console.log("DEMANDAS", demandasRes.data);
  setClientes((clientesRes.data as Cliente[]) ?? []);
  setColaboradores((colaboradoresRes.data as Colaborador[]) ?? []);

  setLoading(false);
}

  const totalDemandas = demandas.length;
  const pendentes = demandas.filter((d) => d.status === "pendente").length;
  const emAndamento = demandas.filter((d) => d.status === "em andamento").length;
  const concluidas = demandas.filter((d) => d.status === "concluido").length;
  const canceladas = demandas.filter((d) => d.status === "cancelado").length;

  const atrasadas = demandas.filter((d) => {
    if (!d.prazo_finalizacao || d.status === "concluido") return false;
    return new Date(d.prazo_finalizacao) < new Date();
  }).length;

  const projetosAtivos = projetos.filter((p) => p.status === "ATIVO").length;
  const projetosMap = new Map<string, Projeto>();

  projetos.forEach((p) => {
    projetosMap.set(p.id, p);
  });

  const clientesMap = new Map<string, Cliente>();

  clientes.forEach((c) => {
  clientesMap.set(c.id, c);
  });

  const colaboradoresMap = new Map<string, Colaborador>();

  colaboradores.forEach((c) => {
  colaboradoresMap.set(c.id, c);
  });

  const porArea = useMemo(() => {
    const areas = ["produto", "marketing", "desenvolvimento", "qa", "suporte"];

    return areas.map((area) => ({
      area,
      total: demandas.filter((d) => d.area === area).length,
    }));
  }, [demandas]);


  const areaChartItems = [
  {
    label: "Produto",
    value: porArea.find((item) => item.area === "produto")?.total ?? 0,
    color: "#2563eb",
  },
  {
    label: "Marketing",
    value: porArea.find((item) => item.area === "marketing")?.total ?? 0,
    color: "#22c55e",
  },
  {
    label: "Desenvolvimento",
    value: porArea.find((item) => item.area === "desenvolvimento")?.total ?? 0,
    color: "#f59e0b",
  },
  {
    label: "QA",
    value: porArea.find((item) => item.area === "qa")?.total ?? 0,
    color: "#a855f7",
  },
  {
    label: "Suporte",
    value: porArea.find((item) => item.area === "suporte")?.total ?? 0,
    color: "#94a3b8",
  },
];

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

  const ultimasDemandas = demandas.slice(0, 6);

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-slate-600">Olá, {profile?.nome}! 👋</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Dashboard de Projetos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Visão geral das demandas, projetos e capacidade da equipe.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-md">
            <Calendar size={18} />
            Período atual
          </button>

          <button className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-md">
            <Download size={18} />
            Exportar Relatório
          </button>
        </div>
      </header>

      <section className="grid grid-cols-5 gap-4">
        <KpiCard
          icon={<Folder size={22} />}
          label="Projetos ativos"
          value={projetosAtivos}
          helper={`${projetos.length} projeto(s) no total`}
          color="blue"
        />

        <KpiCard
          icon={<FileText size={22} />}
          label="Demandas ativas"
          value={pendentes + emAndamento}
          helper={`${concluidas} concluída(s)`}
          color="green"
        />

        <KpiCard
          icon={<TrendingUp size={22} />}
          label="Demandas atrasadas"
          value={atrasadas}
          helper={`${totalDemandas} demanda(s) no total`}
          color="orange"
        />

        <KpiCard
          icon={<Users size={22} />}
          label="Colaboradores"
          value={2}
          helper="Usuários de teste"
          color="cyan"
        />

        <KpiCard
          icon={<FileText size={22} />}
          label="Concluídas"
          value={concluidas}
          helper={`${canceladas} cancelada(s)`}
          color="purple"
        />
      </section>

      <section className="grid grid-cols-3 gap-5">
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="font-semibold text-slate-950">Distribuição por Área</h2>
    <DonutChart total={totalDemandas} items={areaChartItems} />
  </div>

  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="font-semibold text-slate-950">Status das Demandas</h2>
    <DonutChart total={totalDemandas} items={statusChartItems} />
  </div>

  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="font-semibold text-slate-950">Capacidade da Equipe</h2>

    <div className="mt-10 text-center">
      <p className="text-6xl font-bold text-slate-950">
        {totalDemandas === 0
          ? 0
          : Math.round(((pendentes + emAndamento) / totalDemandas) * 100)}
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
                : Math.round(((pendentes + emAndamento) / totalDemandas) * 100)
            }%`,
          }}
        />
      </div>
    </div>
  </div>
</section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Carteira de Demandas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Últimas demandas registradas no ambiente.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-400">
            <Search size={16} />
            Buscar demanda...
          </div>
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
                 ? clientesMap.get((projeto as any).cliente_id)
                  : undefined;

                  const colaborador = colaboradoresMap.get(demanda.colaborador_id);

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
                <Badge>{demanda.area}</Badge>
                </td>

                <td className="px-6 py-4">
                <StatusBadge status={demanda.status} />
                </td>

                <td className="px-6 py-4 text-slate-600">
                {demanda.prioridade}
                </td>

                <td className="px-6 py-4 text-slate-600">
                {demanda.prazo_finalizacao ?? "-"}
        </td>

        <td className="px-6 py-4 text-slate-600">
          {colaborador?.nome ?? "-"}
        </td>
        <td className="px-6 py-4 text-center">
        <Link
        to={`/projetos/${projeto?.id}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
        title="Ver detalhes"
        >
        <ArrowRight size={18} />
        </Link>
      </td>
      </tr>
    );
  })}
</tbody>
          </table>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  helper: string;
  color: "blue" | "green" | "orange" | "cyan" | "purple";
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
    cyan: {
      bg: "bg-cyan-50",
      text: "text-cyan-600",
      bar: "bg-cyan-500",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      bar: "bg-purple-500",
    },
  };

  const s = styles[color];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${s.bg} ${s.text}`}>
        {icon}
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h2 className="mt-2 text-5xl font-bold text-slate-900">
        {value}
      </h2>

      <p className="mt-3 text-sm text-slate-500">
        {helper}
      </p>

      <div className="mt-6 h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 w-2/5 rounded-full ${s.bar}`} />
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-blue-700">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pendente: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    "em andamento": "bg-green-100 text-green-700 border border-green-200",
    concluido: "bg-blue-100 text-blue-700 border border-blue-200",
    cancelado: "bg-red-100 text-red-700 border border-red-200",
  };

  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        colors[status as keyof typeof colors]
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
          <strong className="text-3xl font-bold text-slate-900">
            {total}
          </strong>
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