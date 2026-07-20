import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  LogOut,
  PlusCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import fortTechSidebarLogo from "../assets/forttech-sidebar-logo.jpg";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

type NavLinkItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, isGestor, isColaborador } = useAuth();
  const [novasDemandasCount, setNovasDemandasCount] = useState(0);

  useEffect(() => {
    if (!profile || !isColaborador) {
      setNovasDemandasCount(0);
      return;
    }

    let active = true;
    const profileId = profile.id;

    async function carregarNovasDemandas() {
      const { count, error } = await supabase
        .from("demandas")
        .select("id", { count: "exact", head: true })
        .eq("colaborador_id", profileId)
        .eq("origem", "gestor")
        .is("visualizada_em", null);

      if (!active || error) {
        return;
      }

      setNovasDemandasCount(count ?? 0);
    }

    void carregarNovasDemandas();
    window.addEventListener(
      "demandas:notificacoes-atualizadas",
      carregarNovasDemandas
    );

    return () => {
      active = false;
      window.removeEventListener(
        "demandas:notificacoes-atualizadas",
        carregarNovasDemandas
      );
    };
  }, [isColaborador, location.pathname, profile]);

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  const gestorLinks: NavLinkItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/kanban", label: "Kanban", icon: BarChart3 },
  ];

  const colaboradorLinks: NavLinkItem[] = [
    {
      to: "/minhas-demandas",
      label: "Minhas Demandas",
      icon: ClipboardList,
      badge: novasDemandasCount,
    },
    { to: "/nova-demanda", label: "Nova Demanda", icon: PlusCircle },
  ];

  const links = isGestor ? gestorLinks : isColaborador ? colaboradorLinks : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-200 bg-white px-5 py-6">
        <div className="flex h-20 items-center justify-center">
          <img
            src={fortTechSidebarLogo}
            alt="Fort Tech Solutions"
            className="max-h-20 w-full object-contain"
          />
        </div>
        <h1 className="sr-only">Demandas TI</h1>

        <nav className="mt-8 space-y-2">
          {links.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to === "/dashboard" &&
                (location.pathname.startsWith("/projetos/") ||
                  location.pathname === "/novo-projeto"));

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
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
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
