import { createContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "../types/domain";

export type AuthContextData = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isGestor: boolean;
  isColaborador: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextData | null>(null);
