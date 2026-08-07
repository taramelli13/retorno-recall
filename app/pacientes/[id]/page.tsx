import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { FUSO } from "@/lib/recall";
import { formatarTelefone } from "@/lib/mensagem";
import {
  atualizarPaciente,
  consultaRealizadaHoje,
  registrarConsulta,
} from "../actions";
import { FormularioPaciente } from "../formulario-paciente";
import { RegistrarConsulta } from "./registrar-consulta";

export const dynamic = "force-dynamic";

const CONSULTA = {
  REALIZADA: "Consulta realizada",
  AGENDADA: "Consulta agendada",
  FALTOU: "Faltou",
  CANCELADA: "Consulta cancelada",
};

const CONTATO = {
  ENVIADO: "Mensagem enviada",
  RESPONDEU: "Respondeu",
  REMARCOU: "Remarcou",
  SEM_RESPOSTA: "Sem resposta",
};

export default async function Ficha({ params }: PageProps<"/pacientes/[id]">) {
  const { id } = await params;
  const paciente = await db.paciente.findUnique({
    where: { id },
    include: {
      consultas: { orderBy: { dataHora: "desc" } },
      contatos: { orderBy: { data: "desc" } },
    },
  });
  if (!paciente) notFound();

  const hoje = formatInTimeZone(new Date(), FUSO, "yyyy-MM-dd");

  const historico = [
    ...paciente.consultas.map((c) => ({
      data: c.dataHora,
      titulo: CONSULTA[c.status],
      notas: c.notas,
    })),
    ...paciente.contatos.map((c) => ({
      data: c.data,
      titulo: CONTATO[c.resultado],
      notas: null,
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      <header className="flex items-start justify-between gap-3 pt-8 pb-6">
        <div className="min-w-0">
          <p className="titulo-secao">
            retorno a cada {paciente.intervaloDias} dias
          </p>
          <h1 className="font-display text-3xl leading-tight font-semibold">
            {paciente.nome}
          </h1>
          <p className="mt-1 font-mono text-xs text-suave">
            {formatarTelefone(paciente.telefone)}
          </p>
        </div>
        <Link href="/pacientes" className="btn-suave shrink-0">
          Pacientes
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <form action={consultaRealizadaHoje.bind(null, paciente.id)}>
          <button type="submit" className="btn-primario">
            Consulta realizada hoje
          </button>
        </form>
        <RegistrarConsulta
          acao={registrarConsulta.bind(null, paciente.id)}
          hoje={hoje}
        />
      </div>

      <h2 className="titulo-secao mt-8 mb-2">Histórico</h2>
      {historico.length === 0 ? (
        <p className="cartao p-6 text-center text-sm text-suave">
          Nada registrado ainda.
        </p>
      ) : (
        <ul className="cartao divide-y divide-traco overflow-hidden">
          {historico.map((e, i) => (
            <li key={i} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
              <span className="shrink-0 font-mono text-xs text-suave tabular-nums">
                {formatInTimeZone(e.data, FUSO, "dd/MM/yy")}
              </span>
              <span>{e.titulo}</span>
              {e.notas && <span className="text-suave">— {e.notas}</span>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="titulo-secao mt-8 mb-2">Dados</h2>
      <div className="cartao">
        <FormularioPaciente
          acao={atualizarPaciente.bind(null, paciente.id)}
          valores={{ ...paciente, telefone: formatarTelefone(paciente.telefone) }}
          rotulo="Salvar alterações"
        />
      </div>
    </main>
  );
}
