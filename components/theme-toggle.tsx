"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const selected = document.documentElement.dataset.theme;
    setTheme(
      selected === "light" || selected === "dark"
        ? selected
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
    );
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("torob-theme", next);
    } catch {
      /* preference storage is optional */
    }
    setTheme(next);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تیره"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-muted transition hover:bg-surface-muted hover:text-text"
    >
      {theme === "dark" ? (
        <Sun size={20} aria-hidden="true" />
      ) : (
        <Moon size={20} aria-hidden="true" />
      )}
    </button>
  );
}
