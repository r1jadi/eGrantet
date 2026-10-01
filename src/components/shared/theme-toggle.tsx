"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/client";

type ThemeMode = "light" | "dark";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

function applyMode(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem("theme", mode);
  } catch {
    /* private browsing: theme simply does not persist */
  }
}

/**
 * Light/Dark Mode toggle. The `dark` class on <html> is the single source of
 * truth (applied pre-paint by the script in the root layout), observed via
 * useSyncExternalStore so the icon never contradicts the applied theme.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => {
    applyMode(document.documentElement.classList.contains("dark") ? "light" : "dark");
  }, []);

  const label = mode === "dark" ? t("nav.switchToLight") : t("nav.switchToDark");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={mode === "dark"}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2",
        className,
      )}
    >
      <Sun className="size-5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-5 dark:block" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
