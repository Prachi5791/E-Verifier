import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/auth/me", {
          credentials: "include",
        });
        if (!res.ok) {
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data.user || data);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Refresh user manually
  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/auth/me", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        return null;
      }
      const data = await res.json();

      // console.log("auth", data);

      setUser(data.user || data);
      return data.user || data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
