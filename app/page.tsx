import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { CardPaciente } from "./card-paciente";
import { buscarPacientesParaContatar, diasDesde, FUSO } from "@/lib/recall";

export const dynamic = "force-dynamic";

export default async function Hoje() {
  const { paraContatar, aguardando } = await buscarPacientesParaContatar();
  const agora = new Date();
  const hoje = formatInTimeZone(agora, FUSO, "yyyy-MM-dd");
  const atrasadas = paraContatar.filter((p) => diasDesde(p.venceEm, agora) > 0).length;

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      <header className="flex items-center justify-between gap-3 pt-8 pb-6">
        <div>
          <p className="titulo-secao">
            {formatInTimeZone(agora, FUSO, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <h1 className="font-display text-3xl font-semibold">Hoje</h1>
        </div>
        <Link href="/pacientes" className="btn-suave shrink-0">
          Pacientes
        </Link>
      </header>

      {paraContatar.length === 0 && aguardando.length === 0 ? (
        <div className="cartao p-8 text-center">
          <p className="font-display text-xl">Tudo em dia.</p>
          <p className="mt-1 text-sm text-suave text-balance">
            Ninguém para contatar hoje — todo mundo está em dia ou já foi avisado.
          </p>
        </div>
      ) : (
        <>
          {paraContatar.length === 0 ? (
            <p className="cartao p-6 text-center text-sm text-suave">
              Ninguém novo para contatar.
            </p>
          ) : (
            <>
              <div className="mb-4 flex items-baseline gap-4 font-mono text-xs text-suave">
                <span>
                  <strong className="font-display text-2xl font-semibold text-tinta">
                    {paraContatar.length}
                  </strong>{" "}
                  para contatar
                </span>
                {atrasadas > 0 && (
                  <span className="selo bg-vencido/10 text-vencido">
                    {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <ul className="flex flex-col gap-3">
                {paraContatar.map((p) => (
                  <CardPaciente
                    key={p.id}
                    id={p.id}
                    nome={p.nome}
                    telefone={p.telefone}
                    intervaloDias={p.intervaloDias}
                    diasSemVir={diasDesde(p.ultimaConsulta, agora)}
                    atraso={diasDesde(p.venceEm, agora)}
                    hoje={hoje}
                  />
                ))}
              </ul>
            </>
          )}

          {aguardando.length > 0 && (
            <>
              <h2 className="titulo-secao mt-8 mb-3">
                Aguardando resposta ({aguardando.length})
              </h2>
              <ul className="flex flex-col gap-3">
                {aguardando.map((p) => (
                  <CardPaciente
                    key={p.id}
                    id={p.id}
                    nome={p.nome}
                    telefone={p.telefone}
                    intervaloDias={p.intervaloDias}
                    diasSemVir={diasDesde(p.ultimaConsulta, agora)}
                    atraso={diasDesde(p.venceEm, agora)}
                    hoje={hoje}
                    diasDesdeContato={diasDesde(p.ultimoContato!, agora)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
