import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("apex_theme");
      if (saved === "dark" || saved === "light") {
        return saved;
      }
      return "light";
    } catch {
      return "light";
    }
  });

  const applyThemeToDOM = (newTheme) => {
    const root = document.documentElement;
    const body = document.body;

    if (newTheme === "dark") {
      root.classList.add("dark");
      if (body) body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      if (body) body.classList.remove("dark");
    }

    try {
      localStorage.setItem("apex_theme", newTheme);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyThemeToDOM(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
