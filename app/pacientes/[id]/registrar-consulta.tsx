"use client";

import { useActionState, useState } from "react";
import type { Resultado } from "../actions";
import { IconCalendar, IconCheck } from "@/app/components/icons";

export function RegistrarConsulta({
  acao,
  hoje,
}: {
  acao: (anterior: Resultado, dados: FormData) => Promise<Resultado>;
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, enviar, pendente] = useActionState(acao, { erro: null });

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="btn-suave"
      >
        <IconCalendar className="size-4" />
        <span>Registrar consulta</span>
      </button>
    );
  }

  return (
    <form action={enviar} className="cartao flex w-full flex-wrap items-end gap-3 p-4 bg-fundo/60">
      <label className="flex flex-col gap-1">
        <span className="titulo-secao">Data</span>
        <input
          name="data"
          type="date"
          defaultValue={hoje}
          required
          className="campo font-mono text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="titulo-secao">Status</span>
        <select
          name="status"
          defaultValue="REALIZADA"
          className="campo text-sm"
        >
          <option value="REALIZADA">Realizada</option>
          <option value="AGENDADA">Agendada</option>
          <option value="FALTOU">Faltou</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1">
        <span className="titulo-secao">Notas</span>
        <input
          name="notas"
          maxLength={500}
          placeholder="Ex: retorno pós-dieta"
          className="campo text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pendente}
        className="btn-escuro"
      >
        <IconCheck className="size-4" />
        <span>Salvar</span>
      </button>
      {estado.erro && (
        <p role="alert" className="w-full text-sm text-vencido">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
