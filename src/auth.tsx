import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, Me, setToken } from "./api";

type Ctx = { me: Me | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ me: null, loading: true, refresh: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try { setMe((await api("/api/me")).user); } catch { setMe(null); }
    setLoading(false);
  };
  const logout = async () => { try { await api("/api/logout", { method: "POST", body: {} }); } catch {} setToken(""); setMe(null); };
  useEffect(() => { refresh(); }, []);
  return <AuthCtx.Provider value={{ me, loading, refresh, logout }}>{children}</AuthCtx.Provider>;
}
