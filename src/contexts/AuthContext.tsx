// src/contexts/AuthContext.tsx - VERSION OPTIMISÉE
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { User } from "../types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UserWithCompany extends User {
  full_name?: string;
  companies?: { id: string; name: string } | null;
  company_name?: string | undefined;
}

interface AuthContextType {
  user: UserWithCompany | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // ✅ Ref pour éviter de vérifier la session trop souvent
  const lastCheckRef = useRef<number>(0);
  const CHECK_INTERVAL = 5000; // 5 secondes minimum entre 2 vérifications

  /**
   * ✅ Vérifie la session avec throttle intelligent
   */
  const checkUser = useCallback(async (force = false) => {
    const now = Date.now();
    
    // ✅ Throttle : ne pas vérifier si dernière vérification < 5s
    if (!force && (now - lastCheckRef.current) < CHECK_INTERVAL) {
      console.log("⏭️ Vérification session ignorée (throttle)");
      return;
    }
    
    lastCheckRef.current = now;

    try {
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (session?.user) {
        const baseUser = session.user as unknown as UserWithCompany;

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, full_name, role, company_id, companies(id, name)")
          .eq("email", session.user.email)
          .single<UserWithCompany>();

        if (userError) throw userError;

        if (userData) {
          const newUser = {
            ...baseUser,
            ...userData,
            name: userData.full_name || baseUser.email?.split("@")[0],
            company_name: userData.companies?.name ?? undefined,
          };
          
          // ✅ Ne mettre à jour que si les données ont changé
          setUser(prevUser => {
            if (JSON.stringify(prevUser) === JSON.stringify(newUser)) {
              return prevUser; // Pas de changement
            }
            return newUser;
          });
        } else {
          setUser(baseUser);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Error checking user:", err);
      setError("Erreur lors de la vérification de l'utilisateur");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel("supabase-auth");

    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await checkUser(true); // Force la première vérification
      } else {
        setUser(null);
        setIsLoading(false);
        navigate("/login");
      }
    };

    restoreSession();

    // ✅ onAuthStateChange : ne se déclenche que sur changement réel
    const { data: refreshSub } = supabase.auth.onAuthStateChange(async (event, _session) => {
      console.log("🔐 Auth event:", event);
      
      // Uniquement sur les événements importants
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        await checkUser(true);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        navigate("/login");
      }
    });
    
    supabase.auth.startAutoRefresh();

    channel.onmessage = async (msg) => {
      if (msg.data.event === "SIGNED_IN") await checkUser(true);
      if (msg.data.event === "SIGNED_OUT") {
        setUser(null);
        navigate("/login");
      }
    };

    // ✅ Throttle de la vérification au focus (5s minimum)
    const handleFocus = async () => {
      console.log("🔄 Onglet actif → vérification session");
      await checkUser(false); // Throttled
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      refreshSub.subscription.unsubscribe();
      channel.close();
      supabase.auth.stopAutoRefresh();
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkUser, navigate]);

  /**
   * 🔹 Connexion
   */
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        await checkUser(true);
        toast.success("Connexion réussie");
        navigate("/app");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de connexion";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🔹 Déconnexion
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      sessionStorage.clear();
      toast.success("Déconnexion réussie");
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}