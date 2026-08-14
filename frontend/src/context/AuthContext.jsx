/**
 * AuthContext — JWT auth state management.
 * Provides: user, token, login, logout, isAuthenticated
 */
import { createContext, useContext, useState } from "react";
import { login as apiLogin, signup as apiSignup } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  const loginFn = async (mobile, password) => {
    const data = await apiLogin(mobile, password);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data));
    setToken(data.access_token);
    setUser(data);
    return data;
  };

  const signupFn = async (payload) => {
    const data = await apiSignup(payload);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data));
    setToken(data.access_token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login: loginFn, signup: signupFn, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
