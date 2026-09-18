import type { Role } from "../types/domain";

export const managementRoles: Role[] = [
  "GESTOR",
  "DIRETOR",
  "ADMIN",
  "SUPERADMIN",
];

export const executiveRoles: Role[] = ["DIRETOR", "ADMIN", "SUPERADMIN"];

export function normalizeRole(role?: string | null): Role | null {
  const normalized = role?.trim().toUpperCase() as Role | undefined;

  if (
    normalized &&
    ["COLABORADOR", "GESTOR", "DIRETOR", "ADMIN", "SUPERADMIN"].includes(
      normalized
    )
  ) {
    return normalized;
  }

  return null;
}

export function isCollaboratorRole(role?: string | null) {
  return normalizeRole(role) === "COLABORADOR";
}

export function isManagementRole(role?: string | null) {
  const normalized = normalizeRole(role);

  return normalized ? managementRoles.includes(normalized) : false;
}

export function isExecutiveRole(role?: string | null) {
  const normalized = normalizeRole(role);

  return normalized ? executiveRoles.includes(normalized) : false;
}

export function isExecutiveProfile(profile?: {
  role?: string | null;
  cargo?: string | null;
} | null) {
  if (isExecutiveRole(profile?.role)) {
    return true;
  }

  const cargo = profile?.cargo?.trim().toLowerCase() ?? "";

  return ["diretor", "diretoria", "superadmin", "administrador"].some((term) =>
    cargo.includes(term)
  );
}

export function getRoleLabel(role?: string | null) {
  const labels: Record<Role, string> = {
    COLABORADOR: "Colaborador",
    GESTOR: "Gestor",
    DIRETOR: "Diretoria",
    ADMIN: "Admin",
    SUPERADMIN: "Superadmin",
  };
  const normalized = normalizeRole(role);

  return normalized ? labels[normalized] : "Perfil";
}
