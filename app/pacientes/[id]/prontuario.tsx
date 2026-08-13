"use client";

import { useActionState, useState } from "react";
import type { Resultado } from "../actions";
import { LIMITE_NOTAS } from "@/lib/consulta";
import { IconClock, IconEdit } from "@/app/components/icons";

export type EntradaHistorico = {
  /** null para contatos (mensagens): aparecem na linha do tempo, sem prontuário. */
  consultaId: string | null;
  data: string; // dd/MM/yy, já formatada no server
  titulo: string;
  notas: string | null;
  tom: "sucesso" | "alerta" | "neutro";
};

const COR = {
  sucesso: "bg-em-dia",
  alerta: "bg-vencido",
  neutro: "bg-a-vencer",
};

export function Prontuario({
  entradas,
  acao,
}: {
  entradas: EntradaHistorico[];
  acao: (anterior: Resultado, dados: FormData) => Promise<Resultado>;
}) {
  const [selecionada, setSelecionada] = useState<string | null>(
    entradas.find((e) => e.consultaId)?.consultaId ?? null,
  );
  const [editando, setEditando] = useState(false);
  const [erroConsultaId, setErroConsultaId] = useState<string | null>(null);
  const [estado, enviar, pendente] = useActionState(
    async (anterior: Resultado, dados: FormData) => {
      const consultaId = dados.get("consultaId");
      const r = await acao(anterior, dados);
      if (!r.erro) {
        setEditando(false);
        setErroConsultaId(null);
      } else {
        setErroConsultaId(typeof consultaId === "string" ? consultaId : null);
      }
      return r;
    },
    { erro: null },
  );

  const sel =
    entradas.find((e) => e.consultaId !== null && e.consultaId === selecionada) ?? null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-6">
      {/* Linha do tempo */}
      <section>
        <h2 className="titulo-secao mb-3 flex items-center gap-2">
          <IconClock className="size-3.5 text-em-dia" />
          <span>Histórico de Atendimentos &amp; Mensagens</span>
        </h2>

        {entradas.length === 0 ? (
          <div className="cartao p-8 text-center text-sm text-suave">
            Nenhum histórico registrado ainda para este paciente.
          </div>
        ) : (
          <ul className="cartao divide-y divide-traco/70 overflow-hidden">
            {entradas.map((e, i) => {
              const conteudo = (
                <>
                  <span className="shrink-0 pt-0.5 font-mono text-xs text-suave tabular-nums">
                    {e.data}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full shrink-0 ${COR[e.tom]}`} />
                      <span className="font-medium text-tinta">{e.titulo}</span>
                    </div>
                    {e.notas && (
                      <p className="mt-0.5 truncate text-xs text-suave pl-4">
                        &ldquo;{e.notas}&rdquo;
                      </p>
                    )}
                  </div>
                </>
              );

              if (!e.consultaId) {
                return (
                  <li key={i} className="flex items-start gap-3 px-5 py-3.5 text-sm">
                    {conteudo}
                  </li>
                );
              }

              const ativa = e.consultaId === selecionada;
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => {
                      setSelecionada(e.consultaId);
                      setEditando(false);
                      setErroConsultaId(null);
                    }}
                    className={`flex w-full items-start gap-3 px-5 py-3.5 text-left text-sm transition-colors ${
                      ativa ? "bg-em-dia-suave/60" : "hover:bg-fundo/50"
                    }`}
                  >
                    {conteudo}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Painel de prontuário */}
      <aside className="cartao mt-6 p-5 lg:sticky lg:top-6 lg:mt-0">
        <h2 className="titulo-secao mb-3">Prontuário da consulta</h2>

        {!sel ? (
          <p className="text-sm text-suave">
            Nenhuma consulta registrada ainda. O prontuário aparece aqui quando
            houver uma consulta no histórico.
          </p>
        ) : (
          <>
            <p className="font-mono text-xs text-suave">
              {sel.data} — {sel.titulo}
            </p>

            {editando ? (
              <form action={enviar} key={sel.consultaId}>
                <input type="hidden" name="consultaId" value={sel.consultaId!} />
                <textarea
                  name="notas"
                  defaultValue={sel.notas ?? ""}
                  maxLength={LIMITE_NOTAS}
                  rows={12}
                  autoFocus
                  placeholder="O que foi conversado e orientado nesta consulta..."
                  className="campo mt-3 w-full resize-y text-sm leading-relaxed"
                />
                <div className="mt-3 flex items-center gap-2">
                  <button type="submit" disabled={pendente} className="btn-escuro">
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="btn-suave"
                  >
                    Cancelar
                  </button>
                </div>
                {estado.erro && erroConsultaId === sel.consultaId && (
                  <p role="alert" className="mt-2 text-sm text-vencido">
                    {estado.erro}
                  </p>
                )}
              </form>
            ) : (
              <>
                {sel.notas ? (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-tinta">
                    {sel.notas}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-suave">
                    Sem registro para esta consulta.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="btn-suave mt-4"
                >
                  <IconEdit className="size-4" />
                  <span>{sel.notas ? "Editar prontuário" : "Escrever prontuário"}</span>
                </button>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
