"use client";

import { useState, useTransition } from "react";
import { marcarRetorno, registrarContato } from "./actions";
import { formatarTelefone, linkWhatsApp } from "@/lib/mensagem";
import {
  IconWhatsApp,
  IconCalendar,
  IconClock,
  IconPhone,
  IconAlertCircle,
  IconCheck,
} from "@/app/components/icons";

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
 * trilho, e o excedente sai em vermelho/vinho.
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
      className="relative h-2.5 w-full rounded-full bg-traco/60 overflow-hidden shadow-inner"
      role="img"
      aria-label={`${diasSemVir} de ${intervaloDias} dias do ciclo`}
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${corDentro} transition-all duration-300`}
        style={{ width: pct(Math.min(diasSemVir, intervaloDias)) }}
      />
      {diasSemVir > intervaloDias && (
        <div
          className="absolute inset-y-0 rounded-r-full bg-vencido transition-all duration-300"
          style={{ left: pct(intervaloDias), width: pct(diasSemVir - intervaloDias) }}
        />
      )}
      {/* O fim do prazo: alfinete indicador */}
      <div
        className="absolute inset-y-0 w-0.5 bg-tinta/70 z-10"
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
    <li className={`cartao overflow-hidden transition-all ${pendente ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Faixa superior de identificação rápida */}
      <div
        className={`h-1.5 w-full ${
          aguardando
            ? "bg-traco"
            : vencido
            ? "bg-vencido"
            : p.atraso === 0
            ? "bg-a-vencer"
            : "bg-em-dia"
        }`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl leading-tight font-semibold tracking-tight text-tinta">
              {p.nome}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-suave font-mono">
              <IconPhone className="size-3 text-suave/70" />
              <span>{formatarTelefone(p.telefone)}</span>
            </div>
          </div>
          <span
            className={`selo shrink-0 ${
              vencido
                ? "bg-vencido-suave text-vencido border border-vencido/20"
                : p.atraso === 0
                ? "bg-a-vencer-suave text-a-vencer border border-a-vencer/20"
                : "bg-em-dia-suave text-em-dia border border-em-dia/20"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                vencido ? "bg-vencido" : p.atraso === 0 ? "bg-a-vencer" : "bg-em-dia"
              }`}
            />
            {prazoEmTexto(p.atraso)}
          </span>
        </div>

        <div className="mt-4">
          <BarraDeCiclo {...p} />
          <div className="mt-2 flex justify-between font-mono text-[0.7rem] text-suave">
            <span>{p.diasSemVir} dias sem vir</span>
            <span>ciclo de {p.intervaloDias}d</span>
          </div>
        </div>

        {aguardando && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-fundo p-2.5 font-mono text-xs text-suave border border-traco/60">
            <IconClock className="size-3.5 text-suave shrink-0" />
            <span>
              Mensagem enviada{" "}
              <strong>{p.diasDesdeContato === 0 ? "hoje" : `há ${p.diasDesdeContato}d`}</strong>
              {" — "}sem retorno agendado
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a
            href={linkWhatsApp(p.telefone, p.nome, p.diasSemVir)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => acao(() => registrarContato(p.id, "ENVIADO"))}
            className={`btn-whatsapp ${aguardando ? "btn-suave !bg-superficie !text-tinta !border-traco hover:!bg-fundo" : "order-first"}`}
          >
            <IconWhatsApp className="size-4" />
            <span>Falar no WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => setMarcando((v) => !v)}
            aria-expanded={marcando}
            className={aguardando ? "btn-primario order-first" : "btn-suave"}
          >
            <IconCalendar className="size-4" />
            <span>Marcar retorno</span>
          </button>

          <button
            type="button"
            onClick={() => acao(() => registrarContato(p.id, "SEM_RESPOSTA"))}
            className="btn-suave"
          >
            <IconClock className="size-4" />
            <span>Sem resposta</span>
          </button>
        </div>

        {marcando && (
          <form
            className="mt-4 flex flex-col sm:flex-row gap-2 rounded-xl bg-fundo p-3 border border-traco/80"
            action={(dados) =>
              acao(() => marcarRetorno(p.id, String(dados.get("data"))))
            }
          >
            <label className="sr-only" htmlFor={`data-${p.id}`}>
              Data do retorno de {p.nome}
            </label>
            <div className="relative flex-1">
              <input
                id={`data-${p.id}`}
                name="data"
                type="date"
                min={p.hoje}
                defaultValue={p.hoje}
                required
                className="campo font-mono text-sm"
              />
            </div>
            <button type="submit" className="btn-escuro shrink-0">
              <IconCheck className="size-4" />
              <span>Salvar Agendamento</span>
            </button>
          </form>
        )}

        {erro && (
          <div role="alert" className="mt-3 flex items-center gap-2 text-sm text-vencido bg-vencido-suave p-2.5 rounded-lg border border-vencido/20">
            <IconAlertCircle className="size-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
      </div>
    </li>
  );
}
