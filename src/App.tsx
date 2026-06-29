import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Login } from "./pages/Login";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { MinhasDemandas } from "./pages/MinhasDemandas";
import { NovaDemanda } from "./pages/NovaDemanda";
import { Projetos } from "./pages/Projetos";
import { Kanban } from "./pages/Kanban";
import { ProjetoDetalhes } from "./pages/ProjetoDetalhes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/minhas-demandas" element={<MinhasDemandas />} />
          <Route path="/nova-demanda" element={<NovaDemanda />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/projetos/:id" element={<ProjetoDetalhes />} />
          <Route path="/kanban" element={<Kanban />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}