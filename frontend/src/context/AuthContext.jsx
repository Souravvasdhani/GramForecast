/**
 * AuthContext — JWT auth state management.
 * Provides: user, token, login, logout, isAuthenticated
 */
import { createContext, useContext, useState } from "react";
import { useTutorial } from "./TutorialContext";
import { login as apiLogin, signup as apiSignup } from "../api/client";

const AuthContext = createContext(null);

const clearAuthStorage = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
};

const isJwtExpired = (tokenValue) => {
  if (!tokenValue) return true;

  try {
    const payload = tokenValue.split(".")[1];
    if (!payload) return true;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    if (!decoded.exp) return false;
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
};

const getStoredToken = () => {
  const tokenValue = localStorage.getItem("access_token");
  if (!tokenValue || isJwtExpired(tokenValue)) {
    clearAuthStorage();
    return null;
  }
  return tokenValue;
};

const getStoredUser = () => {
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    clearAuthStorage();
    return null;
  }
};

export function AuthProvider({ children }) {
  const { syncUser } = useTutorial();
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());

  const persistAuth = (data) => {
    const nextToken = data?.access_token;
    if (!nextToken || isJwtExpired(nextToken)) {
      clearAuthStorage();
      setToken(null);
      setUser(null);
      return null;
    }

    localStorage.setItem("access_token", nextToken);
    localStorage.setItem("user", JSON.stringify(data));
    setToken(nextToken);
    setUser(data);
    syncUser(data);
    return data;
  };

  const loginFn = async (mobile, password) => {
    const data = await apiLogin(mobile, password);
    return persistAuth(data);
  };

  const signupFn = async (payload) => {
    const data = await apiSignup(payload);
    return persistAuth(data);
  };

  const logout = () => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    syncUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login: loginFn, signup: signupFn, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
