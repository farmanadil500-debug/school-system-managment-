import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch, setAccessToken, setOnTokenExpired } from "./api-client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch (_err) {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // Set up token expiration callback
  useEffect(() => {
    setOnTokenExpired(() => {
      setUser(null);
    });
  }, []);

  // Attempt silent refresh on initial application load
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const res = await apiFetch("/api/v1/auth/refresh", { method: "POST" });
        if (res?.data?.accessToken && isMounted) {
          setAccessToken(res.data.accessToken);
          setUser(res.data.user);
        }
      } catch (_err) {
        // No valid session cookie found; user will see login screen
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier, password) => {
    const res = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    if (res?.data?.accessToken) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return res.data.user;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await apiFetch("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    // Update user local state to clear mustChangePassword
    if (user) {
      setUser({ ...user, mustChangePassword: false });
    }

    return res?.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

