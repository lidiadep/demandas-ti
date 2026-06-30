import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types/domain";
import { getHomePath } from "./home";

type ProtectedRouteProps = {
  allowedRoles?: Role[];
  children?: ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm font-medium text-slate-500">Carregando sessão...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile || !profile.ativo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">
            Acesso indisponível
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Seu perfil não foi encontrado ou está inativo. Fale com a gestão de TI
            para regularizar o acesso.
          </p>
        </section>
      </main>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getHomePath(profile.role)} replace />;
  }

  return children ?? <Outlet />;
}
