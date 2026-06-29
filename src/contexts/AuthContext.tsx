import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role: "COLABORADOR" | "GESTOR";
  ativo: boolean;
};

type AuthContextData = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isGestor: boolean;
  isColaborador: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, nome, email, role, ativo")
      .eq("user_id", userId)
      .single();

    setProfile(data as Profile);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      const currentUser = data.session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser.id);
      }

      setLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isGestor: profile?.role === "GESTOR",
        isColaborador: profile?.role === "COLABORADOR",
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}