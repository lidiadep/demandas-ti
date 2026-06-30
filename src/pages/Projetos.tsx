import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, FolderKanban, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Cliente, Demanda, Projeto } from "../types/domain";

type ProjetoResumo = Pick<
  Projeto,
  "id" | "nome" | "descricao" | "status" | "cliente_id"
>;

export function Projetos() {
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const [projetosRes, clientesRes, demandasRes] = await Promise.all([
      supabase
        .from("projetos")
        .select("id,nome,descricao,status,cliente_id")
        .order("nome", { ascending: true }),
      supabase.from("clientes").select("id,nome"),
      supabase
        .from("demandas")
        .select(
          "id,titulo,descricao,area,prioridade,status,prazo_finalizacao,created_at,projeto_id,colaborador_id"
        ),
    ]);

    if (projetosRes.error || clientesRes.error || demandasRes.error) {
      setErrorMessage("Não foi possível carregar os projetos.");
      setLoading(false);
      return;
    }

    setProjetos((projetosRes.data as ProjetoResumo[]) ?? []);
    setClientes((clientesRes.data as Cliente[]) ?? []);
    setDemandas((demandasRes.data as Demanda[]) ?? []);
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

  const projetosComMetricas = useMemo(() => {
    return projetos.map((projeto) => {
      const demandasDoProjeto = demandas.filter(
        (demanda) => demanda.projeto_id === projeto.id
      );
      const concluidas = demandasDoProjeto.filter(
        (demanda) => demanda.status === "concluido"
      ).length;
      const atrasadas = demandasDoProjeto.filter((demanda) => {
        if (!demanda.prazo_finalizacao || demanda.status === "concluido") {
          return false;
        }

        return new Date(demanda.prazo_finalizacao) < new Date();
      }).length;
      const progresso =
        demandasDoProjeto.length === 0
          ? 0
          : Math.round((concluidas / demandasDoProjeto.length) * 100);

      return {
        ...projeto,
        clienteNome: clientesMap.get(projeto.cliente_id)?.nome ?? "-",
        totalDemandas: demandasDoProjeto.length,
        concluidas,
        atrasadas,
        progresso,
      };
    });
  }, [clientesMap, demandas, projetos]);

  const projetosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return projetosComMetricas;
    }

    return projetosComMetricas.filter((projeto) =>
      [projeto.nome, projeto.clienteNome, projeto.status, projeto.descricao]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term))
    );
  }, [projetosComMetricas, searchTerm]);

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando projetos...</p>;
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
          <h1 className="text-3xl font-bold text-slate-950">Projetos</h1>
          <p className="mt-2 text-sm text-slate-500">
            Acompanhe os projetos, clientes e volume de demandas vinculadas.
          </p>
        </div>

        <label className="flex min-w-80 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          <Search size={16} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Buscar projeto..."
          />
        </label>
      </header>

      <section className="grid grid-cols-3 gap-4">
        {projetosFiltrados.map((projeto) => (
          <article
            key={projeto.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FolderKanban size={22} />
              </div>

              <StatusBadge status={projeto.status} />
            </div>

            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-950">
                {projeto.nome}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {projeto.clienteNome}
              </p>
              {projeto.descricao && (
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {projeto.descricao}
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <Metric
                label="Demandas"
                value={projeto.totalDemandas}
                icon={<FileText size={15} />}
              />
              <Metric label="Concluídas" value={projeto.concluidas} />
              <Metric label="Atrasadas" value={projeto.atrasadas} />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Progresso</span>
                <span>{projeto.progresso}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${projeto.progresso}%` }}
                />
              </div>
            </div>

            <Link
              to={`/projetos/${projeto.id}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
            >
              Ver detalhes
              <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </section>

      {projetosFiltrados.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Nenhum projeto encontrado.
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
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
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        colors[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
