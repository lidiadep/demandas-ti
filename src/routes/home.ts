import type { Role } from "../types/domain";

export function getHomePath(role: Role) {
  return role === "GESTOR" ? "/dashboard" : "/minhas-demandas";
}
