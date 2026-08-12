"use client";

import { useState, useTransition } from "react";
import { marcarRetorno, registrarContato } from "./actions";
import { formatarTelefone, linkWhatsApp } from "@/lib/mensagem";

export type CardProps = {
  id: string;
  nome: string;
  telefone: string;
  diasSemVir: number;
  /** > 0 já venceu, 0 vence hoje, < 0 ainda vai vencer */
  atraso: number;
  intervaloDias: number;
  hoje: string;
  /** presente = já contatado, aguardando resposta (0 = hoje) */
  diasDesdeContato?: number;
};

function prazoEmTexto(atraso: number) {
  if (atraso > 0) return `${atraso}d atrasado`;
  if (atraso === 0) return "vence hoje";
  return `vence em ${-atraso}d`;
}

/**
 * A barra de ciclo: o trilho é o intervalo de retorno do paciente, o
 * preenchimento é o tempo decorrido. Quem passou do prazo transborda o
 * trilho, e o excedente sai em vinho.
 */
function BarraDeCiclo({
  diasSemVir,
  intervaloDias,
  atraso,
}: Pick<CardProps, "diasSemVir" | "intervaloDias" | "atraso">) {
  const total = Math.max(diasSemVir, intervaloDias);
  const pct = (dias: number) => `${(dias / total) * 100}%`;
  const corDentro = atraso >= 0 ? "bg-a-vencer" : "bg-em-dia";

  return (
    <div
      className="relative h-2 w-full"
      role="img"
      aria-label={`${diasSemVir} de ${intervaloDias} dias do ciclo`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-traco"
        style={{ width: pct(intervaloDias) }}
      />
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${corDentro}`}
        style={{ width: pct(Math.min(diasSemVir, intervaloDias)) }}
      />
      {diasSemVir > intervaloDias && (
        <div
          className="absolute inset-y-0 rounded-r-full bg-vencido"
          style={{ left: pct(intervaloDias), width: pct(diasSemVir - intervaloDias) }}
        />
      )}
      {/* O fim do prazo. Sem esta marca o transbordo vira só troca de cor. */}
      <div
        className="absolute -top-1 -bottom-1 w-px bg-tinta/60"
        style={{ left: pct(intervaloDias) }}
      />
    </div>
  );
}

export function CardPaciente(p: CardProps) {
  const [pendente, iniciar] = useTransition();
  const [marcando, setMarcando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const vencido = p.atraso > 0;
  const aguardando = p.diasDesdeContato !== undefined;

  const acao = (fn: () => Promise<{ erro: string | null } | void>) =>
    iniciar(async () => {
      const r = await fn();
      setErro(r?.erro ?? null);
    });

  return (
    <li
      className={`cartao overflow-hidden ${pendente ? "opacity-50" : ""}`}
    >
      {/* faixa de estado: dá pra ver o cartão certo sem ler nada */}
      <div
        className={`h-1 w-full ${
          aguardando ? "bg-traco" : vencido ? "bg-vencido" : "bg-a-vencer"
        }`}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl leading-tight font-semibold">
              {p.nome}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-suave">
              {formatarTelefone(p.telefone)}
            </p>
          </div>
          <span
            className={`selo shrink-0 ${
              vencido
                ? "bg-vencido/10 text-vencido"
                : "bg-a-vencer/12 text-a-vencer"
            }`}
          >
            {prazoEmTexto(p.atraso)}
          </span>
        </div>

        <div className="mt-4">
          <BarraDeCiclo {...p} />
          <div className="mt-1.5 flex justify-between font-mono text-[0.7rem] text-suave">
            <span>{p.diasSemVir} dias sem vir</span>
            <span>ciclo de {p.intervaloDias}d</span>
          </div>
        </div>

        {aguardando && (
          <p className="mt-3 font-mono text-xs text-suave">
            mensagem enviada{" "}
            {p.diasDesdeContato === 0 ? "hoje" : `há ${p.diasDesdeContato}d`}
            {" — "}sem retorno marcado
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMarcando((v) => !v)}
            aria-expanded={marcando}
            className={aguardando ? "btn-primario order-first" : "btn-suave"}
          >
            Marcar retorno
          </button>
          <a
            href={linkWhatsApp(p.telefone, p.nome, p.diasSemVir)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => acao(() => registrarContato(p.id, "ENVIADO"))}
            className={aguardando ? "btn-suave" : "btn-primario order-first"}
          >
            Falar no WhatsApp
          </a>
          <button
            type="button"
            onClick={() => acao(() => registrarContato(p.id, "SEM_RESPOSTA"))}
            className="btn-suave"
          >
            Sem resposta
          </button>
        </div>

        {marcando && (
          <form
            className="mt-3 flex gap-2"
            action={(dados) =>
              acao(() => marcarRetorno(p.id, String(dados.get("data"))))
            }
          >
            <label className="sr-only" htmlFor={`data-${p.id}`}>
              Data do retorno de {p.nome}
            </label>
            <input
              id={`data-${p.id}`}
              name="data"
              type="date"
              min={p.hoje}
              defaultValue={p.hoje}
              required
              className="campo font-mono text-sm"
            />
            <button type="submit" className="btn-escuro shrink-0">
              Salvar
            </button>
          </form>
        )}

        {erro && (
          <p role="alert" className="mt-3 text-sm text-vencido">
            {erro}
          </p>
        )}
      </div>
    </li>
  );
}
