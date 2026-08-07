"use client";

import { useActionState } from "react";
import type { ResultadoPaciente } from "./actions";

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
    <form action={enviar} className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1">
        <span className="titulo-secao">Nome</span>
        <input
          name="nome"
          defaultValue={campos.nome}
          required
          autoComplete="off"
          className="campo"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="titulo-secao">Telefone</span>
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

      <label className="flex flex-col gap-1">
        <span className="titulo-secao">Intervalo de retorno (dias)</span>
        <input
          name="intervaloDias"
          type="number"
          min={1}
          max={365}
          defaultValue={campos.intervaloDias ?? 30}
          required
          className="campo w-28 font-mono"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="titulo-secao">Observações</span>
        <textarea
          name="observacoes"
          defaultValue={campos.observacoes ?? ""}
          rows={2}
          maxLength={500}
          placeholder="prefere terça à tarde"
          className="campo"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          name="ativo"
          type="checkbox"
          defaultChecked={campos.ativo ?? true}
          className="size-4"
        />
        <span className="titulo-secao">Em acompanhamento</span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="btn-escuro"
        >
          {rotulo}
        </button>
        {estado.erro && (
          <p role="alert" className="text-sm text-vencido">
            {estado.erro}
          </p>
        )}
      </div>
    </form>
  );
}
