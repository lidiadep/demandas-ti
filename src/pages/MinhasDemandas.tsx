import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Clock3,
  Filter,
  Folder,
  Lightbulb,
  LockKeyhole,
  MoreVertical,
  PlayCircle,
  Plus,
  Search,
  SquarePen,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type {
  Demanda,
  DemandaAtualizacaoSemanal,
  Projeto,
  TipoTrabalho,
} from "../types/domain";

type ProjetoResumo = Pick<Projeto, "id" | "nome" | "codigo">;
type TipoResumo = Pick<TipoTrabalho, "id" | "nome" | "slug" | "ativo">;

type DemandaComContexto = Demanda & {
  projetoCodigo: string;
  projetoNome: string;
  tipoNome: string;
  horasEstimadas: number;
  horasRealizadas: number;
  ultimaAtualizacao: DemandaAtualizacaoSemanal | null;
};

type WeeklyForm = {
  status: string;
  horas: string;
  comentario: string;
  semanaInicio: string;
  semanaFim: string;
};

const statusOptions = [
  { label: "Em andamento", value: "em andamento" },
  { label: "Bloqueado", value: "bloqueado" },
  { label: "Concluído", value: "concluido" },
];

export function MinhasDemandas() {
  const { profile } = useAuth();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [tipos, setTipos] = useState<TipoResumo[]>([]);
  const [atualizacoes, setAtualizacoes] = useState<
    DemandaAtualizacaoSemanal[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [selectedDemanda, setSelectedDemanda] =
    useState<DemandaComContexto | null>(null);
  const [weeklyForm, setWeeklyForm] = useState<WeeklyForm>(() =>
    getDefaultWeeklyForm("em andamento")
  );
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  const carregarDemandas = useCallback(async () => {
    if (!profile) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [demandasRes, projetosRes, tiposRes, atualizacoesRes] =
      await Promise.all([
        supabase
          .from("demandas")
          .select("*")
          .eq("colaborador_id", profile.id)
          .order("prazo_finalizacao", { ascending: true }),
        supabase.from("projetos").select("id,nome,codigo").order("nome"),
        supabase
          .from("tipos_trabalho")
          .select("id,nome,slug,ativo")
          .order("nome"),
        supabase
          .from("demanda_atualizacoes_semanais")
          .select("*")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false }),
      ]);

    const queryErrors = [
      ["demandas", demandasRes.error],
      ["projetos", projetosRes.error],
      ["tipos_trabalho", tiposRes.error],
      ["demanda_atualizacoes_semanais", atualizacoesRes.error],
    ].filter(([, error]) => Boolean(error));

    if (queryErrors.length > 0) {
      if (import.meta.env.DEV) {
        console.error(
          "Erro ao carregar minhas demandas",
          JSON.stringify(queryErrors, null, 2)
        );
      }

      setErrorMessage("Não foi possível carregar suas demandas.");
      setLoading(false);
      return;
    }

    setDemandas((demandasRes.data as Demanda[]) ?? []);
    setProjetos((projetosRes.data as ProjetoResumo[]) ?? []);
    setTipos((tiposRes.data as TipoResumo[]) ?? []);
    setAtualizacoes(
      (atualizacoesRes.data as DemandaAtualizacaoSemanal[]) ?? []
    );
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarDemandas();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarDemandas]);

  const projetosMap = useMemo(
    () => new Map(projetos.map((projeto) => [projeto.id, projeto])),
    [projetos]
  );

  const tiposMap = useMemo(
    () => new Map(tipos.map((tipo) => [tipo.id, tipo])),
    [tipos]
  );

  const ultimaAtualizacaoMap = useMemo(() => {
    const map = new Map<string, DemandaAtualizacaoSemanal>();

    atualizacoes.forEach((atualizacao) => {
      if (!map.has(atualizacao.demanda_id)) {
        map.set(atualizacao.demanda_id, atualizacao);
      }
    });

    return map;
  }, [atualizacoes]);

  const demandasComContexto = useMemo<DemandaComContexto[]>(() => {
    return demandas.map((demanda) => {
      const projeto = projetosMap.get(demanda.projeto_id);
      const tipo = demanda.tipo_trabalho_id
        ? tiposMap.get(demanda.tipo_trabalho_id)
        : null;

      return {
        ...demanda,
        projetoCodigo: projeto?.codigo ?? "PRJ",
        projetoNome: projeto?.nome ?? "Projeto não informado",
        tipoNome: tipo?.nome ?? "Demanda",
        horasEstimadas: getEstimatedHours(demanda),
        horasRealizadas: getWorkedHours(demanda),
        ultimaAtualizacao: ultimaAtualizacaoMap.get(demanda.id) ?? null,
      };
    });
  }, [demandas, projetosMap, tiposMap, ultimaAtualizacaoMap]);

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
          demanda.tipoNome,
          demanda.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "all" || normalizeStatus(demanda.status) === statusFilter;
      const matchesProject =
        projectFilter === "all" || demanda.projeto_id === projectFilter;
      const matchesTipo =
        tipoFilter === "all" || demanda.tipo_trabalho_id === tipoFilter;

      return matchesSearch && matchesStatus && matchesProject && matchesTipo;
    });
  }, [demandasComContexto, projectFilter, searchTerm, statusFilter, tipoFilter]);

  const emAndamento = demandasComContexto.filter((demanda) =>
    ["pendente", "em andamento"].includes(normalizeStatus(demanda.status))
  ).length;
  const bloqueadas = demandasComContexto.filter((demanda) =>
    ["bloqueado", "cancelado"].includes(normalizeStatus(demanda.status))
  ).length;
  const aVencer = demandasComContexto.filter((demanda) => {
    const days = daysUntil(demanda.prazo_finalizacao);
    return days !== null && days >= 0 && days <= 7 && !isDone(demanda);
  }).length;
  const atrasadas = demandasComContexto.filter(
    (demanda) => isOverdue(demanda) && !isDone(demanda)
  ).length;
  const novasAtribuidas = demandasComContexto.filter(
    (demanda) =>
      isDemandAssignedByManager(demanda) &&
      normalizeStatus(demanda.status) === "pendente"
  );

  function limparFiltros() {
    setSearchTerm("");
    setStatusFilter("all");
    setProjectFilter("all");
    setTipoFilter("all");
  }

  function abrirAtualizacao(demanda: DemandaComContexto) {
    setSelectedDemanda(demanda);
    setWeeklyForm(
      getDefaultWeeklyForm(
        normalizeStatus(demanda.status) === "pendente"
          ? "em andamento"
          : normalizeStatus(demanda.status)
      )
    );
    setModalError("");
  }

  async function salvarAtualizacao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !selectedDemanda) {
      return;
    }

    const horas = Number(weeklyForm.horas);

    if (!Number.isFinite(horas) || horas < 0) {
      setModalError("Informe uma quantidade de horas válida.");
      return;
    }

    if (weeklyForm.comentario.trim().length < 10) {
      setModalError("O comentário precisa ter pelo menos 10 caracteres.");
      return;
    }

    setSaving(true);
    setModalError("");

    const { error } = await supabase
      .from("demanda_atualizacoes_semanais")
      .insert({
        demanda_id: selectedDemanda.id,
        profile_id: profile.id,
        status: weeklyForm.status,
        horas_trabalhadas: horas,
        comentario: weeklyForm.comentario.trim(),
        semana_inicio: weeklyForm.semanaInicio,
        semana_fim: weeklyForm.semanaFim,
      });

    if (error) {
      setModalError("Não foi possível salvar a atualização semanal.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSelectedDemanda(null);
    await carregarDemandas();
    window.dispatchEvent(new Event("demandas:notificacoes-atualizadas"));
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
          <p className="text-sm font-semibold text-slate-700">
            Olá, {firstName(profile?.nome)}!
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Minhas Demandas
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Acompanhe suas demandas, prazos e atualizações da semana.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="inline-flex min-w-64 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-left text-slate-700 shadow-sm hover:bg-slate-50">
            <Calendar size={18} />
            <span>
              <span className="block text-xs font-medium text-slate-500">
                Semana selecionada
              </span>
              <span className="text-sm font-semibold text-slate-950">
                {formatWeekRange(new Date())}
              </span>
            </span>
          </button>

          <Link
            to="/nova-demanda"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={18} />
            Nova Demanda
          </Link>
        </div>
      </header>

      {novasAtribuidas.length > 0 && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-blue-700">
                Novas demandas atribuídas
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                {novasAtribuidas.length} nova(s) demanda(s) chegaram para você
              </h2>
              <p className="mt-2 text-sm font-medium text-blue-800">
                Elas já estão na sua lista e podem ser iniciadas normalmente.
              </p>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:max-w-2xl">
              {novasAtribuidas.slice(0, 3).map((demanda) => (
                <button
                  key={demanda.id}
                  type="button"
                  onClick={() => abrirAtualizacao(demanda)}
                  className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-left shadow-sm hover:border-blue-200"
                >
                  <span className="block text-sm font-bold text-slate-950">
                    {demanda.titulo}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {demanda.projetoNome} • {demanda.horasEstimadas}h estimadas
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <KpiCard
          icon={<PlayCircle size={25} />}
          label="Em andamento"
          value={emAndamento}
          helper={`${percent(emAndamento, demandasComContexto.length)}% das suas demandas`}
          color="blue"
        />
        <KpiCard
          icon={<LockKeyhole size={25} />}
          label="Bloqueadas"
          value={bloqueadas}
          helper={`${percent(bloqueadas, demandasComContexto.length)}% das suas demandas`}
          color="red"
        />
        <KpiCard
          icon={<Clock3 size={25} />}
          label="A vencer"
          value={aVencer}
          helper={`${percent(aVencer, demandasComContexto.length)}% das suas demandas`}
          color="amber"
        />
        <KpiCard
          icon={<Calendar size={25} />}
          label="Atrasadas"
          value={atrasadas}
          helper={`${percent(atrasadas, demandasComContexto.length)}% das suas demandas`}
          color="purple"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_0.8fr_0.8fr_0.8fr_auto]">
        <label className="flex h-14 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-500 shadow-sm">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Buscar demanda ou projeto..."
          />
        </label>

        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "Pendente", value: "pendente" },
            { label: "Em andamento", value: "em andamento" },
            { label: "Bloqueada", value: "bloqueado" },
            { label: "Concluída", value: "concluido" },
          ]}
          placeholder="Todos"
        />

        <FilterSelect
          label="Projeto"
          value={projectFilter}
          onChange={setProjectFilter}
          options={projetos.map((projeto) => ({
            label: projeto.nome,
            value: projeto.id,
          }))}
          placeholder="Todos"
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
          placeholder="Todos"
        />

        <button
          type="button"
          onClick={limparFiltros}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Filter size={18} />
          Limpar filtros
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-950">Minhas Demandas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Demanda</th>
                <th className="px-5 py-4">Projeto</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Origem</th>
                <th className="px-5 py-4">Execução</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Horas Est.</th>
                <th className="px-5 py-4">Prazo</th>
                <th className="px-5 py-4">Última atualização</th>
                <th className="px-5 py-4">Ação</th>
                <th className="px-5 py-4 text-center">Mais</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {demandasFiltradas.map((demanda) => (
                <tr key={demanda.id} className="align-middle">
                  <td className="max-w-md px-5 py-4">
                    <p className="font-bold text-slate-950">{demanda.titulo}</p>
                    {demanda.descricao && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {demanda.descricao}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <Folder className="mt-0.5 text-blue-600" size={18} />
                      <div>
                        <p className="font-medium text-slate-800">
                          {demanda.projetoNome}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {demanda.projetoCodigo}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <TypeBadge label={demanda.tipoNome} />
                  </td>
                  <td className="px-5 py-4">
                    <OriginBadge demanda={demanda} />
                  </td>
                  <td className="px-5 py-4">
                    <ExecutionBadge value={demanda.execucao_tipo} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={demanda.status} />
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-700">
                    {demanda.horasEstimadas}h
                  </td>
                  <td className="px-5 py-4">
                    <DeadlineCell value={demanda.prazo_finalizacao} />
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {demanda.ultimaAtualizacao
                      ? formatDate(demanda.ultimaAtualizacao.created_at)
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => abrirAtualizacao(demanda)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                      <SquarePen size={15} />
                      Atualizar Semana
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                      title="Mais opções"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {demandasFiltradas.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            Nenhuma demanda encontrada para os filtros selecionados.
          </p>
        )}

        <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
          <span>
            Exibindo {demandasFiltradas.length} de {demandasComContexto.length}{" "}
            demanda(s)
          </span>

          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-blue-700">
            <Lightbulb size={17} />
            <span>
              Dica: clique em "Atualizar Semana" para registrar suas horas e
              status desta semana.
            </span>
          </div>
        </div>
      </section>

      {selectedDemanda && (
        <WeeklyUpdateModal
          demanda={selectedDemanda}
          form={weeklyForm}
          onChange={setWeeklyForm}
          onClose={() => setSelectedDemanda(null)}
          onSubmit={salvarAtualizacao}
          errorMessage={modalError}
          saving={saving}
        />
      )}
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
  icon: ReactNode;
  label: string;
  value: number;
  helper: string;
  color: "blue" | "red" | "amber" | "purple";
}) {
  const styles = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      bar: "bg-blue-600",
    },
    red: {
      icon: "bg-red-50 text-red-600",
      bar: "bg-red-600",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
    },
    purple: {
      icon: "bg-purple-50 text-purple-600",
      bar: "bg-purple-600",
    },
  }[color];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${styles.icon}`}>
        {icon}
      </div>
      <p className="mt-5 text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-bold text-slate-950">{value}</p>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
      <div className="mt-5 h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 w-2/3 rounded-full ${styles.bar}`} />
      </div>
    </div>
  );
}

function WeeklyUpdateModal({
  demanda,
  form,
  onChange,
  onClose,
  onSubmit,
  errorMessage,
  saving,
}: {
  demanda: DemandaComContexto;
  form: WeeklyForm;
  onChange: (form: WeeklyForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  errorMessage: string;
  saving: boolean;
}) {
  const workedPercent =
    demanda.horasEstimadas === 0
      ? 0
      : Math.round((demanda.horasRealizadas / demanda.horasEstimadas) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-950">
            Atualização Semanal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  {demanda.titulo}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Projeto:{" "}
                  <span className="font-bold text-blue-600">
                    {demanda.projetoNome}
                  </span>
                </p>
              </div>

              <StatusBadge status={demanda.status} />
            </div>

            <div className="grid grid-cols-2 divide-y divide-slate-200 text-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <ModalMetric label="Horas Estimadas" value={`${demanda.horasEstimadas}h`} />
              <ModalMetric
                label="Horas Já Trabalhadas"
                value={`${demanda.horasRealizadas}h`}
                helper={`${workedPercent}% do estimado`}
              />
              <ModalMetric
                label="Prazo"
                value={formatDate(demanda.prazo_finalizacao)}
                helper={getDeadlineText(demanda.prazo_finalizacao)}
              />
              <ModalMetric
                label="Status Atual"
                value={getStatusLabel(demanda.status)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Status da Demanda *
              <select
                value={form.status}
                onChange={(event) =>
                  onChange({ ...form, status: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Horas Trabalhadas na Semana *
              <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
                <input
                  value={form.horas}
                  onChange={(event) =>
                    onChange({ ...form, horas: event.target.value })
                  }
                  className="min-w-0 flex-1 px-3 text-sm outline-none"
                  min="0"
                  step="0.5"
                  type="number"
                  required
                />
                <span className="flex items-center border-l border-slate-200 px-4 text-sm text-slate-500">
                  h
                </span>
              </div>
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Comentário sobre o andamento *
            <textarea
              value={form.comentario}
              onChange={(event) =>
                onChange({ ...form, comentario: event.target.value })
              }
              className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              placeholder="Descreva o avanço, impedimentos e próximos passos..."
              required
            />
            <span className="mt-1 block text-xs font-medium text-slate-500">
              Mínimo 10 caracteres
            </span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Semana Inicial *
              <input
                value={form.semanaInicio}
                onChange={(event) =>
                  onChange({ ...form, semanaInicio: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                type="date"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Semana Final *
              <input
                value={form.semanaFim}
                onChange={(event) =>
                  onChange({ ...form, semanaFim: event.target.value })
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                type="date"
                required
              />
            </label>
          </div>

          <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p>
              <strong>Importante:</strong> ao salvar, esta atualização será
              registrada no histórico e o status da demanda será atualizado.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar Atualização"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ModalMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 font-bold text-slate-950">{value}</p>
      {helper && <p className="mt-1 text-xs font-semibold text-blue-600">{helper}</p>}
    </div>
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

function OriginBadge({ demanda }: { demanda: Demanda }) {
  const atribuidaPeloGestor = isDemandAssignedByManager(demanda);
  const pendente = normalizeStatus(demanda.status) === "pendente";

  if (!atribuidaPeloGestor) {
    return (
      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
        Criada por mim
      </span>
    );
  }

  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
        pendente ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {pendente ? "Nova do gestor" : "Atribuída pelo gestor"}
    </span>
  );
}

function ExecutionBadge({ value }: { value?: string | null }) {
  const externa = value === "externa";

  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
        externa ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {externa ? "Externa" : "Interna"}
    </span>
  );
}

function isDemandAssignedByManager(demanda: Demanda) {
  return (
    demanda.origem === "gestor" ||
    Boolean(
      demanda.criada_por_profile_id &&
        demanda.criada_por_profile_id !== demanda.colaborador_id
    )
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const styles: Record<string, string> = {
    pendente: "bg-amber-50 text-amber-700",
    "em andamento": "bg-emerald-50 text-emerald-700",
    bloqueado: "bg-red-50 text-red-700",
    concluido: "bg-blue-50 text-blue-700",
    cancelado: "bg-red-50 text-red-700",
  };
  const dotStyles: Record<string, string> = {
    pendente: "bg-amber-500",
    "em andamento": "bg-emerald-500",
    bloqueado: "bg-red-500",
    concluido: "bg-blue-500",
    cancelado: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-bold ${
        styles[normalized] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          dotStyles[normalized] ?? "bg-slate-400"
        }`}
      />
      {getStatusLabel(status)}
    </span>
  );
}

function DeadlineCell({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-slate-500">-</span>;
  }

  const days = daysUntil(value);
  const late = days !== null && days < 0;

  return (
    <div className={late ? "text-red-600" : "text-slate-700"}>
      <p className="font-bold">{formatDate(value)}</p>
      <p className="mt-1 text-xs font-semibold">{getDeadlineText(value)}</p>
    </div>
  );
}

function getDefaultWeeklyForm(status: string): WeeklyForm {
  const { start, end } = getWeekDates(new Date());

  return {
    status,
    horas: "",
    comentario: "",
    semanaInicio: toInputDate(start),
    semanaFim: toInputDate(end),
  };
}

function firstName(name?: string | null) {
  return name?.split(" ")[0] ?? "colaborador";
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace("concluído", "concluido");
}

function getStatusLabel(status: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, string> = {
    pendente: "Pendente",
    "em andamento": "Em andamento",
    bloqueado: "Bloqueada",
    concluido: "Concluída",
    cancelado: "Cancelada",
  };

  return labels[normalized] ?? status;
}

function isDone(demanda: Demanda) {
  return normalizeStatus(demanda.status) === "concluido";
}

function isOverdue(demanda: Demanda) {
  const days = daysUntil(demanda.prazo_finalizacao);
  return days !== null && days < 0;
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

  return isDone(demanda) ? getEstimatedHours(demanda) : 0;
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function daysUntil(value: string | null) {
  if (!value) {
    return null;
  }

  const today = startOfDay(new Date());
  const target = parseDate(value);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
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
    return "hoje";
  }

  return `${days} dia(s)`;
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

function getWeekDates(date: Date) {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

function formatWeekRange(date: Date) {
  const { start, end } = getWeekDates(date);
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
