"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCalendar, IconUsers, IconUpload } from "./icons";
import { ThemeToggle } from "./theme-toggle";

export function HeaderNav() {
  const pathname = usePathname();

  // Se estiver na tela de login, não mostra a navbar principal
  if (pathname === "/entrar") return null;

  const links = [
    { href: "/", label: "Hoje", icon: IconCalendar },
    { href: "/pacientes", label: "Pacientes", icon: IconUsers },
    { href: "/pacientes/importar", label: "Importar", icon: IconUpload },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-transform active:scale-95"
        >
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold leading-none">R</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Retorno
            </span>
            <span className="text-[0.625rem] tracking-wider text-muted-foreground uppercase">
              Nutrição & Recall
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href) && link.href !== "/";
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`size-3.5 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
