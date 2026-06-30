import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type { Demanda } from "../types/domain";

type DemandaComProjeto = Pick<
  Demanda,
  "id" | "titulo" | "descricao" | "area" | "prioridade" | "status" | "prazo_finalizacao"
> & {
  projetos:
    | {
        nome: string;
      }
    | {
        nome: string;
      }[]
    | null;
};

export function MinhasDemandas() {
  const { profile } = useAuth();
  const [demandas, setDemandas] = useState<DemandaComProjeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const carregarDemandas = useCallback(async () => {
    if (!profile) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("demandas")
      .select(
        `
        id,
        titulo,
        descricao,
        area,
        prioridade,
        status,
        prazo_finalizacao,
        projetos (
          nome
        )
      `
      )
      .eq("colaborador_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage("Não foi possível carregar suas demandas.");
      setLoading(false);
      return;
    }

    setDemandas((data as DemandaComProjeto[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarDemandas();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarDemandas]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Minhas Demandas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Acompanhe as demandas registradas por você.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Carregando demandas...</p>
        ) : errorMessage ? (
          <p className="p-6 text-sm text-red-600">{errorMessage}</p>
        ) : demandas.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            Nenhuma demanda encontrada.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {demandas.map((demanda) => (
              <div key={demanda.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {demanda.titulo}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {getProjetoNome(demanda.projetos)}
                    </p>
                  </div>

                  <StatusBadge status={demanda.status} />
                </div>

                {demanda.descricao && (
                  <p className="mt-3 text-sm text-slate-600">
                    {demanda.descricao}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Área: {demanda.area}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Prioridade: {demanda.prioridade}
                  </span>
                  {demanda.prazo_finalizacao && (
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Prazo: {formatDate(demanda.prazo_finalizacao)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getProjetoNome(
  projeto:
    | {
        nome: string;
      }
    | {
        nome: string;
      }[]
    | null
) {
  if (Array.isArray(projeto)) {
    return projeto[0]?.nome ?? "Projeto não informado";
  }

  return projeto?.nome ?? "Projeto não informado";
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pendente: "bg-amber-100 text-amber-700",
    "em andamento": "bg-blue-100 text-blue-700",
    concluido: "bg-emerald-100 text-emerald-700",
    cancelado: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        colors[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}
