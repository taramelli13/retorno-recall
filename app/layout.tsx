import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HeaderNav } from "./components/header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Retorno — Recall de Pacientes",
  description: "Sistema de acompanhamento e recall de pacientes para consultório de nutrição",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica o tema salvo antes do primeiro paint, para não piscar claro→escuro */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(localStorage.tema==="dark"||(!localStorage.tema&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-fundo text-tinta">
        <HeaderNav />
        <div className="flex-1">{children}</div>
        <footer className="w-full border-t py-6 text-center text-xs text-muted-foreground">
          <p>© Retorno — Sistema de Recall & Acompanhamento de Pacientes</p>
        </footer>
      </body>
    </html>
  );
}
