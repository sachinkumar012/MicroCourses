import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      // Always set header when token exists
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // If we already have a user (e.g. just logged in/registered), skip re-fetch.
      if (user) {
        setLoading(false);
        return;
      }

      await fetchUser();
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // If the token is invalid (401), perform logout.
      // For other errors (network, temporary), don't immediately clear the auth state
      // so that flows which just set the token/user (e.g. register/login) are not undone.
      if (error.response && error.response.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token } = response.data;

      localStorage.setItem("token", token);
      setToken(token);
      // Ensure header is set immediately so subsequent requests use the token
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Refresh canonical user from server (ensures role/creatorStatus are authoritative)
      // If response contains user payload, set immediately to avoid race in redirects
      if (response.data.user) {
        setUser(response.data.user);
      } else {
        await fetchUser();
      }

      return { success: true, user: response.data.user || null };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || "Login failed",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      const { token } = response.data;

      localStorage.setItem("token", token);
      setToken(token);
      // Ensure header is set immediately so subsequent requests use the token
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Refresh canonical user from server (this will populate accurate role/creatorStatus)
      await fetchUser();

      return { success: true };
    } catch (error) {
      // Return full server error body when available to aid debugging in UI
      return {
        success: false,
        error: error.response?.data || {
          message: error.message || "Registration failed",
        },
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isCreator: user?.role === "creator",
    isLearner: user?.role === "learner",
    isApprovedCreator:
      user?.role === "creator" && user?.creatorStatus === "approved",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
