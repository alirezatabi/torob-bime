"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const themeChange = "torob-theme-change";
function currentTheme(): Theme {
  const selected = document.documentElement.dataset.theme;
  return selected === "light" || selected === "dark"
    ? selected
    : matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
}
function subscribe(onChange: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const storage = (event: StorageEvent) => {
    if (event.key !== "torob-theme") return;
    if (event.newValue === "light" || event.newValue === "dark")
      document.documentElement.dataset.theme = event.newValue;
    else delete document.documentElement.dataset.theme;
    onChange();
  };
  media.addEventListener("change", onChange);
  window.addEventListener(themeChange, onChange);
  window.addEventListener("storage", storage);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(themeChange, onChange);
    window.removeEventListener("storage", storage);
  };
}
const serverTheme = (): Theme => "light";
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, serverTheme);
  function toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("torob-theme", next);
    } catch {
      /* preference storage is optional */
    }
    window.dispatchEvent(new Event(themeChange));
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
