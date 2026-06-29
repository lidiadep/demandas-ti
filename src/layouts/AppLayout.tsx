import {
  BarChart3,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  PlusCircle,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, isGestor, isColaborador } = useAuth();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  const gestorLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projetos", label: "Projetos", icon: FolderKanban },
    { to: "/kanban", label: "Kanban", icon: BarChart3 },
  ];

  const colaboradorLinks = [
    { to: "/minhas-demandas", label: "Minhas Demandas", icon: ClipboardList },
    { to: "/nova-demanda", label: "Nova Demanda", icon: PlusCircle },
  ];

  const links = isGestor ? gestorLinks : isColaborador ? colaboradorLinks : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-200 bg-white px-5 py-6">
        <h1 className="text-xl font-bold text-slate-950">Demandas TI</h1>

        <nav className="mt-8 space-y-2">
          {links.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{profile?.nome}</p>
            <p className="mt-1 text-xs font-medium text-blue-600">
              {profile?.role}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen p-8">
        <Outlet />
      </main>
    </div>
  );
}