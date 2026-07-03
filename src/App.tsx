import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Login } from "./pages/Login";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { MinhasDemandas } from "./pages/MinhasDemandas";
import { NovaDemanda } from "./pages/NovaDemanda";
import { Kanban } from "./pages/Kanban";
import { ProjetoDetalhes } from "./pages/ProjetoDetalhes";
import { NovoProjeto } from "./pages/NovoProjeto";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { isSupabaseConfigured, missingSupabaseEnvVars } from "./lib/supabase";

export default function App() {
  if (!isSupabaseConfigured) {
    return <MissingConfig />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<ProtectedRoute allowedRoles={["GESTOR"]} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projetos" element={<Navigate to="/dashboard" replace />} />
              <Route path="/novo-projeto" element={<NovoProjeto />} />
              <Route path="/projetos/:id" element={<ProjetoDetalhes />} />
              <Route path="/kanban" element={<Kanban />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["COLABORADOR"]} />}>
              <Route path="/minhas-demandas" element={<MinhasDemandas />} />
              <Route path="/nova-demanda" element={<NovaDemanda />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function MissingConfig() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Demandas TI</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Configuração do Supabase pendente
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          O app não encontrou as variáveis de ambiente necessárias para conectar
          ao Supabase neste clone local.
        </p>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Variáveis ausentes
          </p>
          <ul className="mt-2 space-y-1 text-sm font-medium text-slate-800">
            {missingSupabaseEnvVars.map((envVar) => (
              <li key={envVar}>{envVar}</li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-sm text-slate-600">
          Crie um arquivo <code className="font-semibold">.env</code> na raiz do
          projeto usando o <code className="font-semibold">.env.example</code> e
          reinicie o servidor de desenvolvimento.
        </p>
      </section>
    </main>
  );
}
