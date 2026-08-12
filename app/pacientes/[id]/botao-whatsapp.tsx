"use client";

import { registrarContato } from "@/app/actions";
import { linkWhatsApp } from "@/lib/mensagem";

export function BotaoWhatsApp(p: {
  id: string;
  nome: string;
  telefone: string;
  dias: number;
}) {
  return (
    <a
      href={linkWhatsApp(p.telefone, p.nome, p.dias)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrarContato(p.id, "ENVIADO")}
      className="btn-suave"
    >
      Falar no WhatsApp
    </a>
  );
}
