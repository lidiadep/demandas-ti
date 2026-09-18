import type { Role } from "../types/domain";
import { isManagementRole } from "../utils/roles";

export function getHomePath(role: Role) {
  return isManagementRole(role) ? "/dashboard" : "/minhas-demandas";
}
