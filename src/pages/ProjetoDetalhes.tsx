import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, FolderKanban, User, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Cliente, Demanda, Profile, Projeto } from "../types/domain";

type ProfileResumo = Pick<Profile, "id" | "nome">;

const areas = ["produto", "marketing", "desenvolvimento", "qa", "suporte"];

const areaLabels: Record<string, string> = {
  produto: "Produto",
  marketing: "Marketing",
  desenvolvimento: "Desenvolvimento",
  qa: "QA",
  suporte: "Suporte",
};

export function ProjetoDetalhes() {
  const { id } = useParams();

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [profiles, setProfiles] = useState<ProfileResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const carregarDados = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [projetoRes, demandasRes, profilesRes] = await Promise.all([
      supabase
        .from("projetos")
        .select("id,nome,descricao,status,cliente_id")
        .eq("id", id)
        .single(),
      supabase
        .from("demandas")
        .select(
          "id,titulo,descricao,area,prioridade,status,prazo_finalizacao,colaborador_id,created_at,projeto_id"
        )
        .eq("projeto_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,nome"),
    ]);

    if (projetoRes.error) {
      setProjeto(null);
      setLoading(false);
      return;
    }

    const projetoData = projetoRes.data as Projeto;
    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes")
      .select("id,nome")
      .eq("id", projetoData.cliente_id)
      .single();

    if (demandasRes.error || profilesRes.error || clienteError) {
      setErrorMessage("Não foi possível carregar os detalhes do projeto.");
      setLoading(false);
      return;
    }

    setProjeto(projetoData);
    setCliente((clienteData as Cliente) ?? null);
    setDemandas((demandasRes.data as Demanda[]) ?? []);
    setProfiles((profilesRes.data as ProfileResumo[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarDados();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarDados]);

  const profilesMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const concluidas = demandas.filter((d) => d.status === "concluido").length;
  const progresso =
    demandas.length === 0 ? 0 : Math.round((concluidas / demandas.length) * 100);

  const porArea = useMemo(
    () =>
      areas
        .map((area) => ({
          area,
          total: demandas.filter((demanda) => demanda.area === area).length,
        }))
        .filter((item) => item.total > 0),
    [demandas]
  );

  const prazoMaisProximo = useMemo(() => {
    const prazos = demandas
      .map((demanda) => demanda.prazo_finalizacao)
      .filter((prazo): prazo is string => Boolean(prazo))
      .sort();

    return prazos[0] ?? null;
  }, [demandas]);

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
    <div className="space-y-8">
      <header>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
        >
          <ArrowLeft size={16} />
          Voltar para Dashboard
        </Link>

        <div className="mt-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              {projeto.nome}
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              {demandas.length} demanda(s) · Status: {projeto.status}
            </p>
          </div>

          <StatusBadge status={projeto.status} />
        </div>
      </header>

      <section className="grid grid-cols-5 gap-4">
        <InfoItem
          icon={<FolderKanban size={20} />}
          label="Cliente"
          value={cliente?.nome ?? "-"}
        />

        <InfoItem
          icon={<FolderKanban size={20} />}
          label="Área principal"
          value={areaLabels[porArea[0]?.area] ?? "-"}
        />

        <InfoItem
          icon={<User size={20} />}
          label="Responsável"
          value={
            demandas[0]
              ? profilesMap.get(demandas[0].colaborador_id)?.nome ?? "-"
              : "-"
          }
        />

        <InfoItem
          icon={<Calendar size={20} />}
          label="Prazo mais próximo"
          value={formatDate(prazoMaisProximo)}
        />

        <InfoItem
          icon={<Users size={20} />}
          label="Progresso geral"
          value={`${progresso}%`}
        />
      </section>

      <section className="grid grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950">Matriz de Intensidade</h2>

          <RadarChart
            items={areas.map((area) => ({
              label: areaLabels[area],
              value: demandas.filter((demanda) => demanda.area === area).length,
            }))}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950">Resumo analítico</h2>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {porArea.map((item) => (
              <div
                key={item.area}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <p className="text-sm text-slate-500">
                  {areaLabels[item.area] ?? item.area}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {item.total}
                </p>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-xs font-bold uppercase tracking-wide text-slate-500">
            Demandas
          </h3>

          <div className="mt-4 space-y-3">
            {demandas.slice(0, 5).map((demanda) => (
              <div
                key={demanda.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {demanda.titulo}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {getAreaLabel(demanda.area)}
                    </span>

                    <DemandStatusBadge status={demanda.status} />
                  </div>
                </div>

                <PriorityBadge prioridade={demanda.prioridade ?? "media"} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-950">Demandas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Demandas vinculadas a este projeto.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {demandas.map((demanda) => (
            <div
              key={demanda.id}
              className="flex items-center justify-between gap-4 p-5"
            >
              <div>
                <h3 className="font-semibold text-slate-900">
                  {demanda.titulo}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {getAreaLabel(demanda.area)} ·{" "}
                  {profilesMap.get(demanda.colaborador_id)?.nome ?? "-"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <PriorityBadge prioridade={demanda.prioridade ?? "media"} />
                <DemandStatusBadge status={demanda.status} />
                <span className="text-sm text-slate-500">
                  {formatDate(demanda.prazo_finalizacao)}
                </span>
              </div>
            </div>
          ))}

          {demandas.length === 0 && (
            <p className="p-6 text-sm text-slate-500">
              Nenhuma demanda vinculada a este projeto.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-blue-600">{icon}</div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 font-bold text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ATIVO: "bg-emerald-100 text-emerald-700",
    INATIVO: "bg-slate-100 text-slate-700",
    CONCLUIDO: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        colors[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function getAreaLabel(area: string | null) {
  if (!area) {
    return "-";
  }

  return areaLabels[area] ?? area;
}

function DemandStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pendente: "bg-amber-100 text-amber-700",
    "em andamento": "bg-blue-100 text-blue-700",
    concluido: "bg-emerald-100 text-emerald-700",
    cancelado: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        colors[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ prioridade }: { prioridade: string }) {
  const colors: Record<string, string> = {
    alta: "bg-red-100 text-red-700",
    media: "bg-yellow-100 text-yellow-700",
    baixa: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        colors[prioridade] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {prioridade}
    </span>
  );
}

function RadarChart({
  items,
}: {
  items: {
    label: string;
    value: number;
  }[];
}) {
  const size = 360;
  const center = size / 2;
  const maxRadius = 130;
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
      const radius = (item.value / maxValue) * maxRadius;
      const p = point(index, radius);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="mt-6 flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((level) => {
          const points = items
            .map((_, index) => {
              const p = point(index, maxRadius * level);
              return `${p.x},${p.y}`;
            })
            .join(" ");

          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        {items.map((item, index) => {
          const outer = point(index, maxRadius);
          const label = point(index, maxRadius + 28);

          return (
            <g key={item.label}>
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="#e2e8f0"
              />

              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-700 text-xs font-semibold"
              >
                {item.label}
              </text>
            </g>
          );
        })}

        <polygon
          points={polygonPoints}
          fill="rgba(37, 99, 235, 0.18)"
          stroke="#2563eb"
          strokeWidth="3"
        />

        {items.map((item, index) => {
          const radius = (item.value / maxValue) * maxRadius;
          const p = point(index, radius);

          return (
            <circle
              key={item.label}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#2563eb"
            />
          );
        })}
      </svg>
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
