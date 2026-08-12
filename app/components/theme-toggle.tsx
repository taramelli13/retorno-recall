"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Alternar entre modo claro e escuro"
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        localStorage.setItem("tema", dark ? "dark" : "light");
      }}
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs transition-all hover:bg-accent hover:text-accent-foreground"
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </button>
  );
}
