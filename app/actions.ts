"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { db } from "@/lib/db";
import { tentarCriarEventoConsulta } from "@/lib/google-calendar";
import { diasDesde, FUSO } from "@/lib/recall";

const id = z.string().min(1).max(64);

export async function registrarContato(
  pacienteId: string,
  resultado: "ENVIADO" | "SEM_RESPOSTA",
) {
  await db.contato.create({
    data: { pacienteId: id.parse(pacienteId), resultado },
  });
  revalidatePath("/");
  revalidatePath(`/pacientes/${pacienteId}`);
}

const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export async function marcarRetorno(pacienteId: string, data: string, hora?: string) {
  const dia = z.iso.date().parse(data);
  const h = hora ? horaSchema.parse(hora) : null;
  // Sem horário, meio-dia de Brasília: só precisa cair no dia certo.
  const dataHora = fromZonedTime(`${dia}T${h ?? "12:00"}:00`, FUSO);

  // Dia de calendário, não timestamp: "hoje" vale o dia inteiro, mesmo
  // depois do meio-dia (hora em que a consulta é gravada).
  if (diasDesde(dataHora) > 0) {
    return { erro: "Essa data já passou. Escolha hoje ou uma data futura." };
  }

  const consulta = await db.consulta.create({
    data: { pacienteId: id.parse(pacienteId), dataHora, status: "AGENDADA" },
    include: { paciente: { select: { nome: true } } },
  });
  await tentarCriarEventoConsulta(consulta.id, consulta.paciente.nome, dataHora, !!h);
  revalidatePath("/");
  return { erro: null };
}
