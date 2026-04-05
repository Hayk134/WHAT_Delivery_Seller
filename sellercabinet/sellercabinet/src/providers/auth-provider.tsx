import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, toSession } from "@/lib/api";
import { clearSession, readSession, writeSession } from "@/lib/storage";
import type { AccountProfileResponse, ApiSession, LoginRequest, RegisterRequest } from "@/types/api";

type AuthStatus = "loading" | "guest" | "authenticated";

interface AuthContextValue {
  status: AuthStatus;
  session: ApiSession | null;
  profile: AccountProfileResponse | null;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<ApiSession | null>(null);
  const [profile, setProfile] = useState<AccountProfileResponse | null>(null);

  const loadProfile = useCallback(async (nextSession: ApiSession) => {
    const me = await api.me(nextSession.accessToken);

    if (me.role !== "MERCHANT_ADMIN") {
      throw new Error("Кабинет доступен только для аккаунтов торговых компаний.");
    }

    setSession(nextSession);
    setProfile(me);
    setStatus("authenticated");
    writeSession(nextSession);
  }, []);

  useEffect(() => {
    const stored = readSession();

    if (!stored) {
      setStatus("guest");
      return;
    }

    loadProfile(stored).catch(() => {
      clearSession();
      setSession(null);
      setProfile(null);
      setStatus("guest");
    });
  }, [loadProfile]);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const response = await api.login(payload);
      await loadProfile(toSession(response));
    },
    [loadProfile],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const response = await api.registerMerchant(payload);
      await loadProfile(toSession(response));
    },
    [loadProfile],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setProfile(null);
    setStatus("guest");
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) {
      return;
    }

    const me = await api.me(session.accessToken);
    setProfile(me);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [login, logout, profile, refreshProfile, register, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
