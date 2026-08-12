import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  History,
  Link as LinkIcon,
  User,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type { Demanda, DemandaAtualizacaoSemanal } from "../types/domain";

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
  | "updated_at"
  | "projeto_id"
  | "colaborador_id"
  | "prioridade"
  | "execucao_tipo"
  | "fornecedor_id"
> & {
  projeto_codigo: string | null;
  projeto_nome: string | null;
  cliente_nome: string | null;
  area_nome: string | null;
  area_slug: string | null;
  tipo_trabalho_nome: string | null;
  prioridade_nome: string | null;
  prioridade_slug: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  fornecedor_nome: string | null;
};

export function DemandaDetalhes() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [demanda, setDemanda] = useState<DemandaDetalhada | null>(null);
  const [atualizacoes, setAtualizacoes] = useState<DemandaAtualizacaoSemanal[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const carregarDemanda = useCallback(async () => {
    if (!id) {
      setErrorMessage("Demanda não encontrada.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [demandaRes, atualizacoesRes] = await Promise.all([
      supabase.from("vw_demandas_detalhadas").select("*").eq("id", id).single(),
      supabase
        .from("demanda_atualizacoes_semanais")
        .select("*")
        .eq("demanda_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (demandaRes.error) {
      setErrorMessage("Não foi possível carregar os detalhes da demanda.");
      setLoading(false);
      return;
    }

    if (atualizacoesRes.error && import.meta.env.DEV) {
      console.error("Erro ao carregar histórico da demanda", atualizacoesRes.error);
    }

    setDemanda(demandaRes.data as DemandaDetalhada);
    setAtualizacoes(
      (atualizacoesRes.data as DemandaAtualizacaoSemanal[]) ?? []
    );
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void carregarDemanda();
  }, [carregarDemanda]);

  const backPath = profile?.role === "COLABORADOR" ? "/minhas-demandas" : "/kanban";
  const backLabel =
    profile?.role === "COLABORADOR" ? "Voltar para Minhas Demandas" : "Voltar para Analítico";

  if (loading) {
    return <StateMessage title="Carregando demanda..." />;
  }

  if (errorMessage || !demanda) {
    return (
      <StateMessage
        title="Demanda não encontrada"
        description={errorMessage || "Não encontramos os dados desta demanda."}
      />
    );
  }

  const horasEstimadas = toNumber(demanda.horas_estimadas);
  const horasRealizadas = toNumber(demanda.horas_realizadas);
  const progresso =
    horasEstimadas === 0 ? 0 : Math.round((horasRealizadas / horasEstimadas) * 100);
  const execucaoLabel = demanda.execucao_tipo === "externa" ? "Externa" : "Interna";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            to={backPath}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <StatusBadge status={demanda.status} />
            <PriorityBadge label={demanda.prioridade_nome ?? demanda.prioridade ?? "-"} />
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {execucaoLabel}
            </span>
          </div>

          <h1 className="mt-4 max-w-4xl text-3xl font-bold text-slate-950">
            {demanda.titulo}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Criada em {formatDate(demanda.created_at)}
          </p>
        </div>

        {demanda.projeto_id && (
          <Link
            to={`/projetos/${demanda.projeto_id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <FolderKanban size={17} />
            Ver projeto
          </Link>
        )}
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Clock3 size={20} />}
          label="Horas estimadas"
          value={`${horasEstimadas}h`}
          helper={`${horasRealizadas}h realizadas`}
        />
        <MetricCard
          icon={<CheckCircle2 size={20} />}
          label="Progresso por horas"
          value={`${clampPercent(progresso)}%`}
          helper="Com base no estimado"
        />
        <MetricCard
          icon={<Calendar size={20} />}
          label="Prazo"
          value={formatDate(demanda.prazo_finalizacao)}
          helper={getDeadlineText(demanda.prazo_finalizacao)}
        />
        <MetricCard
          icon={<User size={20} />}
          label="Responsável"
          value={demanda.responsavel_nome ?? "-"}
          helper={demanda.responsavel_email ?? "Sem e-mail informado"}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <Panel title="Detalhes da demanda">
          <div className="space-y-5">
            <InfoBlock
              icon={<FileText size={18} />}
              label="Descrição"
              value={demanda.descricao || "Sem descrição cadastrada."}
            />

            {demanda.bloqueio_motivo && (
              <InfoBlock
                icon={<History size={18} />}
                label="Motivo do bloqueio"
                value={demanda.bloqueio_motivo}
              />
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoPair label="Cliente" value={demanda.cliente_nome ?? "-"} />
              <InfoPair
                label="Projeto"
                value={demanda.projeto_nome ?? "Sem projeto vinculado"}
              />
              <InfoPair label="Categoria" value={demanda.area_nome ?? "-"} />
              <InfoPair label="Tipo" value={demanda.tipo_trabalho_nome ?? "-"} />
              <InfoPair label="Execução" value={execucaoLabel} />
              <InfoPair
                label="Fornecedor"
                value={
                  demanda.execucao_tipo === "externa"
                    ? demanda.fornecedor_nome ?? "-"
                    : "Não se aplica"
                }
              />
              <InfoPair label="Início" value={formatDate(demanda.data_inicio)} />
              <InfoPair
                label="Última atualização"
                value={formatDate(demanda.ultima_atualizacao_em)}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Vínculos">
          <div className="space-y-4">
            <InfoPair label="Código do projeto" value={demanda.projeto_codigo ?? "-"} />
            <InfoPair label="ID da demanda" value={demanda.id} />
            {demanda.projeto_id && (
              <Link
                to={`/projetos/${demanda.projeto_id}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
              >
                <LinkIcon size={16} />
                Abrir projeto vinculado
              </Link>
            )}
          </div>
        </Panel>
      </section>

      <Panel title="Histórico de atualizações">
        <div className="space-y-3">
          {atualizacoes.map((atualizacao) => (
            <article
              key={atualizacao.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={atualizacao.status} />
                  <span className="text-sm font-semibold text-slate-700">
                    {formatDate(atualizacao.semana_inicio)} até{" "}
                    {formatDate(atualizacao.semana_fim)}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-700">
                  {toNumber(atualizacao.horas_trabalhadas)}h
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {atualizacao.comentario}
              </p>
            </article>
          ))}

          {atualizacoes.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Nenhuma atualização registrada para esta demanda.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
      </div>
    </article>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon}
        {label}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
        {value}
      </p>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function PriorityBadge({ label }: { label: string }) {
  return (
    <span className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
      {label}
    </span>
  );
}

function StateMessage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-slate-950">{title}</h1>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </section>
  );
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    "em andamento": "Em andamento",
    bloqueado: "Bloqueado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  return labels[status] ?? status;
}

function getDeadlineText(value: string | null | undefined) {
  if (!value) {
    return "Sem prazo definido";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(value);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} dia(s) em atraso`;
  }

  if (diffDays === 0) {
    return "Vence hoje";
  }

  return `${diffDays} dia(s) restantes`;
}
