import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { diasDesde, FUSO } from "@/lib/recall";
import { formatarTelefone } from "@/lib/mensagem";
import {
  atualizarNotasConsulta,
  atualizarPaciente,
  consultaRealizadaHoje,
  definirAtivo,
  registrarConsulta,
} from "../actions";
import { FormularioPaciente } from "../formulario-paciente";
import { BotaoWhatsApp } from "./botao-whatsapp";
import { RegistrarConsulta } from "./registrar-consulta";
import { Prontuario } from "./prontuario";
import {
  IconArchive,
  IconCalendar,
  IconPhone,
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconWhatsApp,
} from "@/app/components/icons";

export const dynamic = "force-dynamic";

const CONSULTA = {
  REALIZADA: "Consulta realizada",
  AGENDADA: "Consulta agendada",
  FALTOU: "Faltou à consulta",
  CANCELADA: "Consulta cancelada",
};

const CONTATO = {
  ENVIADO: "Mensagem WhatsApp enviada",
  RESPONDEU: "Paciente respondeu",
  REMARCOU: "Paciente remarcou",
  SEM_RESPOSTA: "Registrado sem resposta",
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

  const agora = new Date();
  const hoje = formatInTimeZone(agora, FUSO, "yyyy-MM-dd");
  // mesma regra do recall: realizada com data futura é erro de digitação, ignorar
  const ultimaRealizada = paciente.consultas.find(
    (c) => c.status === "REALIZADA" && c.dataHora <= agora,
  );

  const historico = [
    ...paciente.consultas.map((c) => ({
      tipo: "CONSULTA" as const,
      status: c.status,
      data: c.dataHora,
      titulo: CONSULTA[c.status],
      notas: c.notas,
      consultaId: c.id,
    })),
    ...paciente.contatos.map((c) => ({
      tipo: "CONTATO" as const,
      status: c.resultado,
      data: c.data,
      titulo: CONTATO[c.resultado],
      notas: null,
      consultaId: null,
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  const inicial = paciente.nome.trim().charAt(0).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-xl lg:max-w-5xl px-4 pb-20 pt-6">
      {/* Botão de Voltar */}
      <div className="mb-4">
        <Link href="/pacientes" className="inline-flex items-center gap-1.5 text-xs text-suave hover:text-tinta transition-colors font-mono">
          <IconArrowLeft className="size-3.5" />
          <span>Voltar para lista de pacientes</span>
        </Link>
      </div>

      {/* Cartão de Perfil do Paciente */}
      <section className="cartao p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-em-dia-suave font-display text-2xl font-semibold text-em-dia">
              {inicial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-tinta leading-tight truncate">
                  {paciente.nome}
                </h1>
                {!paciente.ativo && (
                  <span className="selo bg-traco text-suave shrink-0">Inativo</span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-suave">
                <IconPhone className="size-3.5 text-suave/70" />
                <span>{formatarTelefone(paciente.telefone)}</span>
              </p>
            </div>
          </div>
          <span className="selo bg-em-dia-suave text-em-dia shrink-0 border border-em-dia/20">
            Retorno a cada {paciente.intervaloDias}d
          </span>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-traco/70">
          <form action={consultaRealizadaHoje.bind(null, paciente.id)}>
            <button type="submit" className="btn-primario">
              <IconCheck className="size-4" />
              <span>Consulta realizada hoje</span>
            </button>
          </form>

          <RegistrarConsulta
            acao={registrarConsulta.bind(null, paciente.id)}
            hoje={hoje}
          />

          {ultimaRealizada && (
            <BotaoWhatsApp
              id={paciente.id}
              nome={paciente.nome}
              telefone={paciente.telefone}
              dias={diasDesde(ultimaRealizada.dataHora, agora)}
            />
          )}

          <form
            action={definirAtivo.bind(null, paciente.id, !paciente.ativo)}
            className="ml-auto"
          >
            <button type="submit" className="btn-suave">
              <IconArchive className="size-4" />
              <span>{paciente.ativo ? "Arquivar" : "Reativar"}</span>
            </button>
          </form>
        </div>
      </section>

      {/* Histórico do Paciente */}
      <section className="mb-8">
        <Prontuario
          entradas={historico.map((e) => ({
            consultaId: e.tipo === "CONSULTA" ? e.consultaId : null,
            // 12:00 é a convenção de "sem horário" — só hora real aparece
            data:
              formatInTimeZone(e.data, FUSO, "HH:mm") !== "12:00"
                ? formatInTimeZone(e.data, FUSO, "dd/MM/yy HH:mm")
                : formatInTimeZone(e.data, FUSO, "dd/MM/yy"),
            titulo: e.titulo,
            notas: e.notas,
            tom:
              e.status === "REALIZADA" || e.status === "RESPONDEU" || e.status === "REMARCOU"
                ? ("sucesso" as const)
                : e.status === "FALTOU" || e.status === "CANCELADA"
                  ? ("alerta" as const)
                  : ("neutro" as const),
          }))}
          acao={atualizarNotasConsulta.bind(null, paciente.id)}
        />
      </section>

      {/* Edição de Dados */}
      <section className="max-w-xl">
        <h2 className="titulo-secao mb-3">Dados Cadastrais</h2>
        <div className="cartao">
          <FormularioPaciente
            acao={atualizarPaciente.bind(null, paciente.id)}
            valores={{ ...paciente, telefone: formatarTelefone(paciente.telefone) }}
            rotulo="Salvar alterações"
          />
        </div>
      </section>
    </main>
  );
}
