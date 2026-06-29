import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Demanda = {
  id: string;
  titulo: string;
  descricao: string | null;
  area: string;
  prioridade: string;
  status: string;
  prazo_finalizacao: string | null;
  projetos: {
    nome: string;
  }[] | null;
};

export function MinhasDemandas() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDemandas();
  }, []);

  async function carregarDemandas() {
    setLoading(true);

    const { data } = await supabase
      .from("demandas")
      .select(`
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
      `)
      .order("created_at", { ascending: false });

    setDemandas((data as Demanda[]) ?? []);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Minhas Demandas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Acompanhe as demandas registradas por você.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Carregando demandas...</p>
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
                      {demanda.projetos?.[0]?.nome ?? "Projeto não informado"}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {demanda.status}
                  </span>
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
                      Prazo: {demanda.prazo_finalizacao}
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