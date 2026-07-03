import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Info, Lightbulb } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type {
  AreaCadastro,
  Cliente,
  PrioridadeCadastro,
  Profile,
} from "../types/domain";

type ResponsavelOption = Pick<
  Profile,
  "id" | "nome" | "email" | "role" | "ativo" | "cargo"
>;

const today = toInputDate(new Date());

export function NovoProjeto() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [areas, setAreas] = useState<AreaCadastro[]>([]);
  const [responsaveis, setResponsaveis] = useState<ResponsavelOption[]>([]);
  const [prioridades, setPrioridades] = useState<PrioridadeCadastro[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState(today);
  const [prazoFinal, setPrazoFinal] = useState("");
  const [horasEstimadas, setHorasEstimadas] = useState("");
  const [prioridadeId, setPrioridadeId] = useState("");

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const selectedClient = clientes.find((cliente) => cliente.id === clienteId);
  const selectedArea = areas.find((area) => area.id === areaId);
  const selectedResponsavel = responsaveis.find(
    (responsavel) => responsavel.id === responsavelId
  );
  const selectedPriority = prioridades.find(
    (prioridade) => prioridade.id === prioridadeId
  );

  const canSubmit = Boolean(
    clienteId &&
      areaId &&
      responsavelId &&
      titulo.trim() &&
      descricao.trim() &&
      dataInicio &&
      prazoFinal &&
      horasEstimadas &&
      prioridadeId
  );

  const carregarOpcoes = useCallback(async () => {
    setLoadingOptions(true);
    setErro("");

    const [clientesRes, areasRes, responsaveisRes, prioridadesRes] =
      await Promise.all([
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
          .from("profiles")
          .select("id,nome,email,role,ativo,cargo")
          .eq("ativo", true)
          .order("nome", { ascending: true }),
        supabase
          .from("prioridades")
          .select("id,nome,slug,peso,cor,ordem,ativo")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
      ]);

    const firstError =
      clientesRes.error ||
      areasRes.error ||
      responsaveisRes.error ||
      prioridadesRes.error;

    if (firstError) {
      if (import.meta.env.DEV) {
        console.error("Erro ao carregar novo projeto", firstError);
      }

      setErro("Não foi possível carregar as opções do formulário.");
      setLoadingOptions(false);
      return;
    }

    const clientesAtivos = (clientesRes.data as Cliente[]) ?? [];
    const areasAtivas = (areasRes.data as AreaCadastro[]) ?? [];
    const responsaveisAtivos =
      (responsaveisRes.data as ResponsavelOption[]) ?? [];
    const prioridadesAtivas =
      (prioridadesRes.data as PrioridadeCadastro[]) ?? [];

    setClientes(clientesAtivos);
    setAreas(areasAtivas);
    setResponsaveis(responsaveisAtivos);
    setPrioridades(prioridadesAtivas);
    setClienteId(clientesAtivos[0]?.id ?? "");
    setAreaId(areasAtivas[0]?.id ?? "");
    setResponsavelId(responsaveisAtivos[0]?.id ?? "");
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

  async function salvarProjeto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErro("");
    setMensagem("");

    if (!profile) {
      setErro("Usuário não autenticado.");
      setSaving(false);
      return;
    }

    if (!canSubmit) {
      setErro("Preencha todos os campos obrigatórios.");
      setSaving(false);
      return;
    }

    const estimatedHours = Number(horasEstimadas || 0);

    const { data, error } = await supabase
      .from("projetos")
      .insert({
        cliente_id: clienteId,
        nome: titulo.trim(),
        descricao: descricao.trim(),
        status: "ATIVO",
        codigo: codigo.trim() || null,
        area_id: areaId,
        responsavel_id: responsavelId,
        prioridade_id: prioridadeId,
        horas_estimadas: Number.isFinite(estimatedHours) ? estimatedHours : 0,
        data_inicio: dataInicio,
        prazo_final: prazoFinal,
      })
      .select("id")
      .single();

    if (error || !data) {
      setErro(`Erro ao criar projeto: ${error?.message ?? "registro vazio"}`);
      setSaving(false);
      return;
    }

    const projetoId = data.id as string;

    const [membroRes, historicoRes] = await Promise.all([
      supabase.from("projeto_membros").insert({
        projeto_id: projetoId,
        profile_id: responsavelId,
        papel: "Responsável",
        alocacao_percentual: 100,
        ativo: true,
      }),
      supabase.from("projeto_status_historico").insert({
        projeto_id: projetoId,
        profile_id: profile.id,
        status_anterior: null,
        status_novo: "ATIVO",
        comentario: "Projeto criado pela gestão.",
      }),
    ]);

    if (import.meta.env.DEV && (membroRes.error || historicoRes.error)) {
      console.warn(
        "Dados complementares do projeto não foram gravados",
        membroRes.error ?? historicoRes.error
      );
    }

    setMensagem("Projeto criado com sucesso.");
    setSaving(false);
    navigate(`/projetos/${projetoId}`);
  }

  if (loadingOptions) {
    return <p className="text-sm text-slate-500">Carregando formulário...</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
        >
          <ArrowLeft size={16} />
          Voltar para Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-950">Novo Projeto</h1>
        <p className="mt-2 text-sm text-slate-500">
          Preencha os dados abaixo para criar um novo projeto.
        </p>
      </header>

      <form onSubmit={salvarProjeto} className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Informações Gerais
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field label="Cliente" required>
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  value={clienteId}
                  onChange={(event) => setClienteId(event.target.value)}
                  required
                >
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
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

              <Field label="Responsável" required>
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  value={responsavelId}
                  onChange={(event) => setResponsavelId(event.target.value)}
                  required
                >
                  {responsaveis.map((responsavel) => (
                    <option key={responsavel.id} value={responsavel.id}>
                      {responsavel.nome}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_240px]">
              <Field label="Título do Projeto" required>
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Ex.: Portal de Demandas TI"
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  required
                />
              </Field>

              <Field label="Sigla (código)">
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Ex.: PRJ001"
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value)}
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field label="Descrição" required>
                <textarea
                  className="min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  maxLength={2000}
                  placeholder="Descreva o objetivo, escopo e entregas esperadas deste projeto..."
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  required
                />
                <p className="mt-2 text-right text-xs text-slate-400">
                  {descricao.length}/2000
                </p>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Planejamento</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Field label="Data de início" required>
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  type="date"
                  value={dataInicio}
                  onChange={(event) => setDataInicio(event.target.value)}
                  required
                />
              </Field>

              <Field label="Prazo final" required>
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  type="date"
                  value={prazoFinal}
                  onChange={(event) => setPrazoFinal(event.target.value)}
                  required
                />
              </Field>

              <Field label="Horas estimadas" required>
                <div className="flex rounded-xl border border-slate-300">
                  <input
                    className="w-full rounded-l-xl px-4 py-3 text-sm outline-none"
                    min={1}
                    step={0.5}
                    type="number"
                    placeholder="Ex.: 58"
                    value={horasEstimadas}
                    onChange={(event) => setHorasEstimadas(event.target.value)}
                    required
                  />
                  <span className="flex items-center rounded-r-xl border-l border-slate-300 px-4 text-sm font-semibold text-slate-500">
                    h
                  </span>
                </div>
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

          </section>
        </div>

        <aside className="space-y-5">
          <InfoCard
            icon={<Lightbulb size={20} />}
            title="Como funciona?"
            description="Ao criar um projeto, você poderá adicionar demandas, definir prazos e acompanhar o progresso geral na visão do projeto."
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Resumo do Projeto
            </h2>

            <div className="mt-6 space-y-5 text-sm">
              <SummaryRow label="Cliente" value={selectedClient?.nome ?? "-"} />
              <SummaryRow label="Área" value={selectedArea?.nome ?? "-"} />
              <SummaryRow
                label="Responsável"
                value={selectedResponsavel?.nome ?? "-"}
              />
              <SummaryRow
                label="Data de início"
                value={formatDate(dataInicio)}
              />
              <SummaryRow label="Prazo final" value={formatDate(prazoFinal)} />
              <SummaryRow
                label="Horas estimadas"
                value={horasEstimadas ? `${horasEstimadas}h` : "-"}
              />
              <SummaryRow
                label="Prioridade"
                value={selectedPriority?.nome ?? "-"}
              />
              <SummaryRow
                label="Status inicial"
                value="Ativo"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Info size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-950">
                Informações importantes
              </h2>
            </div>

            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              <li>O projeto será criado com status inicial ativo.</li>
              <li>Você poderá editar as informações posteriormente.</li>
              <li>As demandas poderão ser vinculadas após a criação.</li>
            </ul>
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

          <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-500">
              Os campos marcados com <span className="text-red-500">*</span> são
              obrigatórios.
            </p>

            <div className="flex justify-end gap-3">
              <Link
                to="/dashboard"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </Link>
              <button
                disabled={!canSubmit || saving || loadingOptions}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Criando..." : "Criar Projeto"}
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

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return parseDate(value).toLocaleDateString("pt-BR");
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}
