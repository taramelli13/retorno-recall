"use client";

import { useActionState } from "react";
import { importarPacientes } from "../actions";
import { IconUpload, IconCheck, IconAlertCircle } from "@/app/components/icons";

export function FormularioImportar() {
  const [estado, enviar, pendente] = useActionState(importarPacientes, {
    erro: null,
    resumo: null,
  });

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">Linhas do CSV</span>
        <textarea
          name="csv"
          rows={8}
          required
          placeholder={
            "Maria Silva, (14) 99999-1111, 12/05/2026\nJoão Souza; 14988882222; 01/04/2026\nAna Oliveira, 14977773333"
          }
          className="campo font-mono text-sm leading-relaxed"
        />
      </label>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pendente}
          className="btn-escuro"
        >
          <IconUpload className="size-4" />
          <span>{pendente ? "Importando..." : "Importar Dados"}</span>
        </button>

        {estado.resumo && (
          <div className="flex items-center gap-1.5 text-sm text-em-dia font-medium bg-em-dia-suave px-3 py-1.5 rounded-lg">
            <IconCheck className="size-4 shrink-0" />
            <span>{estado.resumo}</span>
          </div>
        )}

        {estado.erro && (
          <div role="alert" className="flex items-center gap-1.5 text-sm text-vencido font-medium bg-vencido-suave px-3 py-1.5 rounded-lg">
            <IconAlertCircle className="size-4 shrink-0" />
            <span>{estado.erro}</span>
          </div>
        )}
      </div>
    </form>
  );
}
