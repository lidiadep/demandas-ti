import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, Info, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type {
  AreaCadastro,
  PrioridadeCadastro,
  Projeto,
  TipoTrabalho,
} from "../types/domain";

type ProjetoOption = Pick<
  Projeto,
  "id" | "nome" | "codigo" | "cliente_id" | "status"
> & {
  clientes:
    | {
        nome: string;
      }
    | {
        nome: string;
      }[]
    | null;
};

const today = new Date().toISOString().slice(0, 10);

export function NovaDemanda() {
  const { profile } = useAuth();

  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [areas, setAreas] = useState<AreaCadastro[]>([]);
  const [tiposTrabalho, setTiposTrabalho] = useState<TipoTrabalho[]>([]);
  const [prioridades, setPrioridades] = useState<PrioridadeCadastro[]>([]);

  const [projetoId, setProjetoId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [tipoTrabalhoId, setTipoTrabalhoId] = useState("");
  const [prioridadeId, setPrioridadeId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [horasEstimadas, setHorasEstimadas] = useState("");
  const [dataInicio, setDataInicio] = useState(today);
  const [prazo, setPrazo] = useState("");

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const selectedProject = projetos.find((projeto) => projeto.id === projetoId);
  const selectedArea = areas.find((area) => area.id === areaId);
  const selectedType = tiposTrabalho.find((tipo) => tipo.id === tipoTrabalhoId);
  const selectedPriority = prioridades.find(
    (prioridade) => prioridade.id === prioridadeId
  );

  const canSubmit = Boolean(
    projetoId &&
      areaId &&
      tipoTrabalhoId &&
      prioridadeId &&
      titulo.trim() &&
      profile
  );

  const carregarOpcoes = useCallback(async () => {
    setLoadingOptions(true);
    setErro("");

    const [projetosRes, areasRes, tiposRes, prioridadesRes] = await Promise.all([
      supabase
        .from("projetos")
        .select("id,nome,codigo,cliente_id,status,clientes(nome)")
        .eq("status", "ATIVO")
        .order("nome", { ascending: true }),
      supabase
        .from("areas")
        .select("id,nome,slug,cor,ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("tipos_trabalho")
        .select("id,nome,slug,cor,ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("prioridades")
        .select("id,nome,slug,peso,cor,ordem,ativo")
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
    ]);

    const firstError =
      projetosRes.error ||
      areasRes.error ||
      tiposRes.error ||
      prioridadesRes.error;

    if (firstError) {
      setErro("Não foi possível carregar as opções do formulário.");
      setLoadingOptions(false);
      return;
    }

    const projetosAtivos = (projetosRes.data as ProjetoOption[]) ?? [];
    const areasAtivas = (areasRes.data as AreaCadastro[]) ?? [];
    const tiposAtivos = (tiposRes.data as TipoTrabalho[]) ?? [];
    const prioridadesAtivas =
      (prioridadesRes.data as PrioridadeCadastro[]) ?? [];

    setProjetos(projetosAtivos);
    setAreas(areasAtivas);
    setTiposTrabalho(tiposAtivos);
    setPrioridades(prioridadesAtivas);
    setProjetoId(projetosAtivos[0]?.id ?? "");
    setAreaId(areasAtivas[0]?.id ?? "");
    setTipoTrabalhoId(tiposAtivos[0]?.id ?? "");
    setPrioridadeId(
      prioridadesAtivas.find((prioridade) => prioridade.slug === "media")?.id ??
        prioridadesAtivas[0]?.id ??
        ""
    );
    setLoadingOptions(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarOpcoes();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarOpcoes]);

  async function salvarDemanda(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMensagem("");
    setErro("");

    if (!profile) {
      setErro("Usuário não autenticado.");
      setSaving(false);
      return;
    }

    if (!canSubmit || !selectedArea || !selectedPriority) {
      setErro("Preencha todos os campos obrigatórios.");
      setSaving(false);
      return;
    }

    const estimatedHours = Number(horasEstimadas || 0);

    const { error } = await supabase.from("demandas").insert({
      projeto_id: projetoId,
      colaborador_id: profile.id,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      area: selectedArea.slug,
      area_id: selectedArea.id,
      tipo_trabalho_id: tipoTrabalhoId,
      prioridade: selectedPriority.slug,
      prioridade_id: selectedPriority.id,
      status: "em andamento",
      horas_estimadas: Number.isFinite(estimatedHours) ? estimatedHours : 0,
      horas_realizadas: 0,
      data_inicio: dataInicio || null,
      prazo_finalizacao: prazo || null,
      origem: "colaborador",
      criada_por_profile_id: profile.id,
      visualizada_em: new Date().toISOString(),
    });

    if (error) {
      setErro(`Erro ao salvar: ${error.message}`);
      setSaving(false);
      return;
    }

    setTitulo("");
    setDescricao("");
    setHorasEstimadas("");
    setDataInicio(today);
    setPrazo("");
    setMensagem("Demanda criada com sucesso.");
    setSaving(false);
  }

  const projectClientName = getClientName(selectedProject?.clientes ?? null);

  const descriptionLength = useMemo(() => descricao.length, [descricao]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <Link
            to="/minhas-demandas"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
          >
            <ArrowLeft size={16} />
            Voltar para Minhas Demandas
          </Link>

          <h1 className="mt-6 text-3xl font-bold text-slate-950">
            Nova Demanda
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Preencha os dados abaixo para criar uma nova demanda sob sua
            responsabilidade.
          </p>
        </div>
      </header>

      <form onSubmit={salvarDemanda} className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Informações Gerais
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field label="Projeto" required>
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  value={projetoId}
                  onChange={(event) => setProjetoId(event.target.value)}
                  required
                >
                  {projetos.map((projeto) => (
                    <option key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Área" required>
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  value={areaId}
                  onChange={(event) => setAreaId(event.target.value)}
                  required
                >
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nome}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tipo de Trabalho" required>
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  value={tipoTrabalhoId}
                  onChange={(event) => setTipoTrabalhoId(event.target.value)}
                  required
                >
                  {tiposTrabalho.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_320px]">
              <Field label="Título da Demanda" required>
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Ex.: Desenvolvimento de relatório de performance"
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  required
                />
              </Field>

              <Field label="Prioridade" required>
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  value={prioridadeId}
                  onChange={(event) => setPrioridadeId(event.target.value)}
                  required
                >
                  {prioridades.map((prioridade) => (
                    <option key={prioridade.id} value={prioridade.id}>
                      {prioridade.nome}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-5">
              <Field label="Descrição">
                <textarea
                  className="min-h-36 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  maxLength={1000}
                  placeholder="Descreva os objetivos, contexto e detalhes da demanda..."
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                />
                <p className="mt-2 text-right text-xs text-slate-400">
                  {descriptionLength}/1000
                </p>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Planejamento</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field label="Horas Estimadas">
                <div className="flex rounded-xl border border-slate-300">
                  <input
                    className="w-full rounded-l-xl px-4 py-3 text-sm outline-none"
                    min={0}
                    step={0.5}
                    type="number"
                    placeholder="Ex.: 40"
                    value={horasEstimadas}
                    onChange={(event) => setHorasEstimadas(event.target.value)}
                  />
                  <span className="flex items-center rounded-r-xl border-l border-slate-300 px-4 text-sm font-semibold text-slate-500">
                    h
                  </span>
                </div>
              </Field>

              <Field label="Previsão de início">
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  type="date"
                  value={dataInicio}
                  onChange={(event) => setDataInicio(event.target.value)}
                />
              </Field>

              <Field label="Prazo sugerido">
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  type="date"
                  value={prazo}
                  onChange={(event) => setPrazo(event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Observações</h2>
            <div className="mt-4 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <Info size={18} />
              <p>
                Após criada, a demanda aparecerá em "Minhas Demandas" e poderá
                ser atualizada semanalmente.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <InfoCard
            icon={<Lightbulb size={20} />}
            title="Como funciona?"
            description="Ao criar uma demanda, você será definido automaticamente como responsável por ela."
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Resumo da Demanda
            </h2>

            <div className="mt-6 space-y-5 text-sm">
              <SummaryRow label="Responsável" value={profile?.nome ?? "-"} />
              <SummaryRow label="Cliente" value={projectClientName} />
              <SummaryRow label="Projeto" value={selectedProject?.nome ?? "-"} />
              <SummaryRow label="Área" value={selectedArea?.nome ?? "-"} />
              <SummaryRow label="Tipo" value={selectedType?.nome ?? "-"} />
              <SummaryRow
                label="Prioridade"
                value={selectedPriority?.nome ?? "-"}
              />
              <SummaryRow label="Status inicial" value="Em andamento" />
              <SummaryRow label="Data de criação" value={formatDate(today)} />
              <SummaryRow
                label="Previsão de início"
                value={formatDate(dataInicio)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ClipboardList size={20} className="text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-950">
                Status da Demanda
              </h2>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Toda demanda criada inicia como "Em andamento". Durante as
              atualizações semanais, o status poderá ser alterado.
            </p>

            <div className="mt-5 space-y-4 text-sm">
              <StatusLegend color="bg-emerald-500" title="Em andamento" />
              <StatusLegend color="bg-red-500" title="Bloqueado" />
              <StatusLegend color="bg-blue-500" title="Concluído" />
            </div>
          </section>
        </aside>

        <div className="xl:col-span-2">
          {erro && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}
          {mensagem && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {mensagem}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-5">
            <p className="text-xs text-slate-500">
              Os campos marcados com <span className="text-red-500">*</span> são
              obrigatórios.
            </p>

            <div className="flex gap-3">
              <Link
                to="/minhas-demandas"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </Link>
              <button
                disabled={!canSubmit || saving || loadingOptions}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Criando..." : "Criar Demanda"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <section className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mt-1 text-slate-600">{icon}</div>
      <div>
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function StatusLegend({
  color,
  title,
}: {
  color: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="font-semibold text-slate-800">{title}</span>
    </div>
  );
}

function getClientName(
  cliente:
    | {
        nome: string;
      }
    | {
        nome: string;
      }[]
    | null
) {
  if (Array.isArray(cliente)) {
    return cliente[0]?.nome ?? "-";
  }

  return cliente?.nome ?? "-";
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}
