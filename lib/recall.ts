import { differenceInCalendarDays, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "./db";

export const FUSO = "America/Sao_Paulo";

/** Dias inteiros entre duas datas no calendário de Brasília, não no UTC. */
export function diasDesde(data: Date, agora = new Date()) {
  return differenceInCalendarDays(toZonedTime(agora, FUSO), toZonedTime(data, FUSO));
}

export type PacienteParaContatar = {
  id: string;
  nome: string;
  telefone: string;
  intervaloDias: number;
  ultimaConsulta: Date;
  venceEm: Date;
  ultimoContato: Date | null;
};

/**
 * A lista de hoje. Um paciente entra quando as quatro condições valem:
 * ativo, tem realizada, vencimento em até 7 dias, sem agendada futura.
 * A quinta condição (contato nos últimos 5 dias) não esconde mais ninguém:
 * ela separa "para contatar" de "aguardando resposta" — quem foi contatado
 * só sai da tela quando a consulta é agendada. Ordenado do mais atrasado
 * para o menos.
 */
export async function buscarPacientesParaContatar() {
  const pacientes = await db.$queryRaw<PacienteParaContatar[]>`
    WITH ultima AS (
      SELECT "pacienteId", MAX("dataHora") AS data
      -- data futura em consulta realizada é erro de digitação: ignorar, para
      -- que o paciente continue aparecendo em vez de sumir em silêncio.
      FROM "Consulta" WHERE status = 'REALIZADA' AND "dataHora" <= NOW()
      GROUP BY "pacienteId"
    )
    SELECT p.id, p.nome, p.telefone, p."intervaloDias",
           u.data AS "ultimaConsulta",
           u.data + (p."intervaloDias" || ' days')::interval AS "venceEm",
           (SELECT MAX(ct.data) FROM "Contato" ct WHERE ct."pacienteId" = p.id)
             AS "ultimoContato"
    FROM "Paciente" p
    JOIN ultima u ON u."pacienteId" = p.id
    WHERE p.ativo
      AND u.data + (p."intervaloDias" || ' days')::interval <= NOW() + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM "Consulta" c
        WHERE c."pacienteId" = p.id AND c.status = 'AGENDADA' AND c."dataHora" > NOW()
      )
    ORDER BY "venceEm" ASC, p.nome ASC;
  `;

  const corte = subDays(new Date(), 5);
  return {
    paraContatar: pacientes.filter((p) => !p.ultimoContato || p.ultimoContato <= corte),
    aguardando: pacientes.filter((p) => p.ultimoContato && p.ultimoContato > corte),
  };
}
