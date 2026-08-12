"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { db } from "@/lib/db";
import { tentarCriarEventoConsulta } from "@/lib/google-calendar";
import { FUSO } from "@/lib/recall";

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

export async function marcarRetorno(pacienteId: string, data: string) {
  const dia = z.iso.date().parse(data);
  // Meio-dia de Brasília: o sistema não é agenda de horários, só precisa cair no dia certo.
  const dataHora = fromZonedTime(`${dia}T12:00:00`, FUSO);

  if (dataHora < new Date()) {
    return { erro: "Essa data já passou. Escolha hoje ou uma data futura." };
  }

  const consulta = await db.consulta.create({
    data: { pacienteId: id.parse(pacienteId), dataHora, status: "AGENDADA" },
    include: { paciente: { select: { nome: true } } },
  });
  await tentarCriarEventoConsulta(consulta.id, consulta.paciente.nome, dataHora);
  revalidatePath("/");
  return { erro: null };
}
