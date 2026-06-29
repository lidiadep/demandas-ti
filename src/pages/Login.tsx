import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("gestor@demo.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setErrorMessage("Email ou senha inválidos.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, nome, email, role, ativo")
      .eq("user_id", data.user.id)
      .single();

    if (profileError || !profile) {
      setErrorMessage("Perfil não encontrado.");
      setLoading(false);
      return;
    }

    if (profile.role === "GESTOR") {
      navigate("/dashboard");
    } else {
      navigate("/minhas-demandas");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <p className="text-sm font-medium text-slate-500">Portal de Demandas</p>

        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Acesse sua conta
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Entre para registrar e acompanhar demandas.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Senha</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}