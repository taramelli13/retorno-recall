"use client";

import { useActionState } from "react";
import type { ResultadoPaciente } from "./actions";
import { IconCheck, IconAlertCircle } from "@/app/components/icons";

type Campos = {
  nome?: string;
  telefone?: string;
  intervaloDias?: number | string;
  observacoes?: string | null;
  ativo?: boolean;
};

export function FormularioPaciente({
  acao,
  valores = {},
  rotulo,
}: {
  acao: (
    anterior: ResultadoPaciente,
    dados: FormData,
  ) => Promise<ResultadoPaciente>;
  valores?: Campos;
  rotulo: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, { erro: null });
  // Depois de um erro, o que ela digitou vale mais que o valor do banco.
  const campos: Campos = estado.digitado ?? valores;

  return (
    <form action={enviar} className="flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1.5">
        <span className="titulo-secao">Nome Completo</span>
        <input
          name="nome"
          defaultValue={campos.nome}
          required
          autoComplete="off"
          placeholder="Ex: Maria Silva"
          className="campo font-medium text-base"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="titulo-secao">Telefone (WhatsApp)</span>
          <input
            name="telefone"
            type="tel"
            inputMode="tel"
            defaultValue={campos.telefone}
            required
            placeholder="(14) 99999-9999"
            className="campo font-mono"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="titulo-secao">Intervalo de retorno (dias)</span>
          <input
            name="intervaloDias"
            type="number"
            min={1}
            max={365}
            defaultValue={campos.intervaloDias ?? 30}
            required
            className="campo font-mono"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="titulo-secao">Observações Rápidas</span>
        <textarea
          name="observacoes"
          defaultValue={campos.observacoes ?? ""}
          rows={3}
          maxLength={500}
          placeholder="Ex: Prefere horários de terça-feira à tarde. Alergia a lactose."
          className="campo"
        />
      </label>

      <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
        <input
          name="ativo"
          type="checkbox"
          defaultChecked={campos.ativo ?? true}
          className="size-4 rounded accent-em-dia cursor-pointer"
        />
        <span className="text-sm font-medium text-tinta">Paciente em acompanhamento ativo</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pendente}
          className="btn-escuro"
        >
          <IconCheck className="size-4" />
          <span>{rotulo}</span>
        </button>
        {estado.erro && (
          <div role="alert" className="flex items-center gap-1.5 text-sm text-vencido font-medium">
            <IconAlertCircle className="size-4 shrink-0" />
            <span>{estado.erro}</span>
          </div>
        )}
      </div>
    </form>
  );
}
