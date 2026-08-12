"use client";

import { registrarContato } from "@/app/actions";
import { linkWhatsApp } from "@/lib/mensagem";
import { IconWhatsApp } from "@/app/components/icons";

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
      className="btn-whatsapp"
    >
      <IconWhatsApp className="size-4" />
      <span>Falar no WhatsApp</span>
    </a>
  );
}
