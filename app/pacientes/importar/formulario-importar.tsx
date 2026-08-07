"use client";

import { useActionState } from "react";
import { importarPacientes } from "../actions";

export function FormularioImportar() {
  const [estado, enviar, pendente] = useActionState(importarPacientes, {
    erro: null,
    resumo: null,
  });

  return (
    <form action={enviar} className="mt-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="sr-only">Linhas do CSV</span>
        <textarea
          name="csv"
          rows={8}
          required
          placeholder={"Maria Silva, (14) 99999-1111, 12/05/2026\nJoão Souza; 14988882222"}
          className="campo font-mono text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pendente}
        className="btn-escuro self-start"
      >
        Importar
      </button>
      {estado.resumo && <p className="text-sm">{estado.resumo}</p>}
      {estado.erro && (
        <p role="alert" className="text-sm text-vencido">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
