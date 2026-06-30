import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type { Area, Priority } from "../types/domain";

type ProjetoOption = {
  id: string;
  nome: string;
};

export function NovaDemanda() {
  const { profile } = useAuth();
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState<Area>("desenvolvimento");
  const [prioridade, setPrioridade] = useState<Priority>("media");
  const [prazo, setPrazo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarProjetos() {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome")
        .eq("status", "ATIVO")
        .order("nome", { ascending: true });

      if (error) {
        setErro("Não foi possível carregar os projetos ativos.");
        return;
      }

      const projetosAtivos = (data as ProjetoOption[]) ?? [];

      setProjetos(projetosAtivos);
      setProjetoId(projetosAtivos[0]?.id ?? "");
    }

    void carregarProjetos();
  }, []);

  async function salvarDemanda(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMensagem("");
    setErro("");

    if (!profile) {
      setErro("Usuário não autenticado.");
      setLoading(false);
      return;
    }

    if (!projetoId) {
      setErro("Selecione um projeto ativo para registrar a demanda.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("demandas").insert({
      projeto_id: projetoId,
      colaborador_id: profile.id,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      area,
      prioridade,
      status: "pendente",
      prazo_finalizacao: prazo || null,
    });

    if (error) {
      setErro(`Erro ao salvar: ${error.message}`);
      setLoading(false);
      return;
    }

    setTitulo("");
    setDescricao("");
    setArea("desenvolvimento");
    setPrioridade("media");
    setPrazo("");
    setMensagem("Demanda criada com sucesso.");
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Nova Demanda</h1>
      <p className="mt-1 text-sm text-slate-500">
        Registre uma nova demanda para acompanhamento.
      </p>

      <form
        onSubmit={salvarDemanda}
        className="mt-6 max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="text-sm font-medium text-slate-700">Projeto</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
            value={projetoId}
            onChange={(e) => setProjetoId(e.target.value)}
            required
          >
            {projetos.map((projeto) => (
              <option key={projeto.id} value={projeto.id}>
                {projeto.nome}
              </option>
            ))}
          </select>
        </div>

        <input
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
          placeholder="Título da demanda"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />

        <textarea
          className="min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3"
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-4">
          <select
            className="rounded-xl border border-slate-300 px-4 py-3"
            value={area}
            onChange={(e) => setArea(e.target.value as Area)}
          >
            <option value="produto">Produto</option>
            <option value="marketing">Marketing</option>
            <option value="desenvolvimento">Desenvolvimento</option>
            <option value="qa">QA</option>
            <option value="suporte">Suporte</option>
          </select>

          <select
            className="rounded-xl border border-slate-300 px-4 py-3"
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as Priority)}
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>

          <input
            className="rounded-xl border border-slate-300 px-4 py-3"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {mensagem && <p className="text-sm text-emerald-600">{mensagem}</p>}

        <button
          disabled={loading || projetos.length === 0}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar demanda"}
        </button>
      </form>
    </div>
  );
}
