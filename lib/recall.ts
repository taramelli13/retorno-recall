import { differenceInCalendarDays } from "date-fns";
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
};

/**
 * A lista de hoje. Um paciente entra quando as cinco condições valem:
 * ativo, tem realizada, vencimento em até 7 dias, sem agendada futura,
 * sem contato nos últimos 5 dias. Ordenado do mais atrasado para o menos.
 */
export function buscarPacientesParaContatar() {
  return db.$queryRaw<PacienteParaContatar[]>`
    WITH ultima AS (
      SELECT "pacienteId", MAX("dataHora") AS data
      -- data futura em consulta realizada é erro de digitação: ignorar, para
      -- que o paciente continue aparecendo em vez de sumir em silêncio.
      FROM "Consulta" WHERE status = 'REALIZADA' AND "dataHora" <= NOW()
      GROUP BY "pacienteId"
    )
    SELECT p.id, p.nome, p.telefone, p."intervaloDias",
           u.data AS "ultimaConsulta",
           u.data + (p."intervaloDias" || ' days')::interval AS "venceEm"
    FROM "Paciente" p
    JOIN ultima u ON u."pacienteId" = p.id
    WHERE p.ativo
      AND u.data + (p."intervaloDias" || ' days')::interval <= NOW() + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM "Consulta" c
        WHERE c."pacienteId" = p.id AND c.status = 'AGENDADA' AND c."dataHora" > NOW()
      )
      AND NOT EXISTS (
        SELECT 1 FROM "Contato" ct
        WHERE ct."pacienteId" = p.id AND ct.data > NOW() - INTERVAL '5 days'
      )
    ORDER BY "venceEm" ASC, p.nome ASC;
  `;
}
