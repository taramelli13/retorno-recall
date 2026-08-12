import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { CardPaciente } from "./card-paciente";
import { buscarPacientesParaContatar, diasDesde, FUSO } from "@/lib/recall";
import { tentarSincronizarGoogleAgenda } from "@/lib/google-calendar";
import {
  IconCalendar,
  IconClock,
  IconAlertCircle,
  IconCheck,
  IconUsers,
} from "./components/icons";

export const dynamic = "force-dynamic";

export default async function Hoje({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  await tentarSincronizarGoogleAgenda();
  const { paraContatar, aguardando } = await buscarPacientesParaContatar();
  const agora = new Date();
  const hoje = formatInTimeZone(agora, FUSO, "yyyy-MM-dd");
  const listaAtrasadas = paraContatar.filter((p) => diasDesde(p.venceEm, agora) > 0);
  const atrasadas = listaAtrasadas.length;

  const { filtro } = await searchParams;
  // Clicar no card ativo volta para a visão completa
  const alvo = (f: string) => (filtro === f ? "/" : `/?filtro=${f}`);
  const ativo = (f: string) => (filtro === f ? "ring-2 ring-ring" : "");
  const listaContatar = filtro === "atrasadas" ? listaAtrasadas : paraContatar;
  const mostraContatar = !filtro || filtro === "contatar" || filtro === "atrasadas";
  const mostraAguardando = !filtro || filtro === "aguardando";

  const dataFormatada = formatInTimeZone(agora, FUSO, "EEEE, d 'de' MMMM", { locale: ptBR });
  // Capitaliza o dia da semana
  const dataHeader = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-20 pt-6">
      {/* Cabeçalho principal */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="titulo-secao flex items-center gap-1.5">
            <IconCalendar className="size-3.5 text-em-dia" />
            <span>{dataHeader}</span>
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta mt-0.5">
            Hoje
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pacientes" className="btn-suave">
            <IconUsers className="size-4" />
            <span>Ver Pacientes</span>
          </Link>
        </div>
      </header>

      {/* Hero Metric KPI Cards — clicáveis: filtram as listas abaixo */}
      <div className="mb-8 grid grid-cols-3 gap-2.5">
        <Link href={alvo("contatar")} className={`cartao-interativo p-3.5 flex flex-col justify-between ${ativo("contatar")}`}>
          <div className="flex items-center justify-between text-suave">
            <span className="font-mono text-[0.65rem] tracking-wider uppercase font-medium">
              Contatar
            </span>
            <IconCalendar className="size-3.5 text-em-dia" />
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-tinta">
            {paraContatar.length}
          </p>
        </Link>

        <Link href={alvo("aguardando")} className={`cartao-interativo p-3.5 flex flex-col justify-between ${ativo("aguardando")}`}>
          <div className="flex items-center justify-between text-suave">
            <span className="font-mono text-[0.65rem] tracking-wider uppercase font-medium">
              Aguardando
            </span>
            <IconClock className="size-3.5 text-a-vencer" />
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-tinta">
            {aguardando.length}
          </p>
        </Link>

        <Link
          href={alvo("atrasadas")}
          className={`cartao-interativo p-3.5 flex flex-col justify-between ${atrasadas > 0 ? "border-vencido/30 bg-vencido-suave/30" : ""} ${ativo("atrasadas")}`}
        >
          <div className="flex items-center justify-between text-suave">
            <span className="font-mono text-[0.65rem] tracking-wider uppercase font-medium">
              Atrasadas
            </span>
            <IconAlertCircle className={`size-3.5 ${atrasadas > 0 ? "text-vencido" : "text-suave"}`} />
          </div>
          <p className={`mt-2 font-display text-2xl font-semibold ${atrasadas > 0 ? "text-vencido" : "text-tinta"}`}>
            {atrasadas}
          </p>
        </Link>
      </div>

      {paraContatar.length === 0 && aguardando.length === 0 ? (
        <div className="cartao p-10 text-center flex flex-col items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-em-dia-suave text-em-dia mb-3">
            <IconCheck className="size-7" />
          </div>
          <h2 className="font-display text-xl font-semibold text-tinta">Tudo em dia!</h2>
          <p className="mt-1 text-sm text-suave max-w-xs leading-relaxed">
            Nenhum paciente pendente para contatar hoje. Todos estão em dia ou já foram notificados.
          </p>
        </div>
      ) : (
        <>
          {/* Seção Para Contatar */}
          {mostraContatar && (listaContatar.length === 0 ? (
            <div className="cartao p-6 text-center text-sm text-suave">
              {filtro === "atrasadas"
                ? "Nenhuma consulta atrasada."
                : "Ninguém novo para contatar no momento."}
            </div>
          ) : (
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="titulo-secao flex items-center gap-2">
                  <span>{filtro === "atrasadas" ? "Consultas atrasadas" : "Pacientes para contatar"}</span>
                  <span className={`selo ${filtro === "atrasadas" ? "bg-vencido-suave text-vencido" : "bg-em-dia-suave text-em-dia"}`}>
                    {listaContatar.length}
                  </span>
                </h2>
              </div>

              <ul className="flex flex-col gap-3.5">
                {listaContatar.map((p) => (
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
            </section>
          ))}

          {/* Seção Aguardando Resposta */}
          {mostraAguardando && aguardando.length === 0 && filtro === "aguardando" && (
            <div className="cartao p-6 text-center text-sm text-suave">
              Ninguém aguardando resposta.
            </div>
          )}
          {mostraAguardando && aguardando.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="titulo-secao flex items-center gap-2">
                  <span>Aguardando resposta</span>
                  <span className="selo bg-a-vencer-suave text-a-vencer">
                    {aguardando.length}
                  </span>
                </h2>
              </div>
              <ul className="flex flex-col gap-3.5">
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
            </section>
          )}
        </>
      )}
    </main>
  );
}
