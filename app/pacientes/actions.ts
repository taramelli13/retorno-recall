"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { db } from "@/lib/db";
import { FUSO } from "@/lib/recall";
import { analisarCsv } from "@/lib/csv";
import { pacienteSchema, primeiroErro } from "@/lib/paciente";
import { consultaSchema } from "@/lib/consulta";

export type Resultado = { erro: string | null };

/** O React limpa o formulário depois da ação: devolvemos o que foi digitado. */
export type ResultadoPaciente = Resultado & {
  digitado?: {
    nome: string;
    telefone: string;
    intervaloDias: string;
    observacoes: string;
    ativo: boolean;
  };
};

const id = z.string().min(1).max(64);

function lerFormulario(dados: FormData) {
  const digitado = {
    nome: String(dados.get("nome") ?? ""),
    telefone: String(dados.get("telefone") ?? ""),
    intervaloDias: String(dados.get("intervaloDias") ?? ""),
    observacoes: String(dados.get("observacoes") ?? ""),
    ativo: dados.get("ativo") === "on",
  };
  return {
    digitado,
    resultado: pacienteSchema.safeParse({
      ...digitado,
      observacoes: digitado.observacoes || undefined,
    }),
  };
}

export async function criarPaciente(
  _anterior: ResultadoPaciente,
  dados: FormData,
): Promise<ResultadoPaciente> {
  const { digitado, resultado } = lerFormulario(dados);
  if (!resultado.success) return { erro: primeiroErro(resultado.error), digitado };

  const paciente = await db.paciente.create({ data: resultado.data });
  revalidatePath("/pacientes");
  redirect(`/pacientes/${paciente.id}`);
}

export async function atualizarPaciente(
  pacienteId: string,
  _anterior: ResultadoPaciente,
  dados: FormData,
): Promise<ResultadoPaciente> {
  const { digitado, resultado } = lerFormulario(dados);
  if (!resultado.success) return { erro: primeiroErro(resultado.error), digitado };

  await db.paciente.update({
    where: { id: id.parse(pacienteId) },
    data: resultado.data,
  });
  revalidatePath("/");
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${pacienteId}`);
  return { erro: null };
}

export async function registrarConsulta(
  pacienteId: string,
  _anterior: Resultado,
  dados: FormData,
): Promise<Resultado> {
  const r = consultaSchema.safeParse({
    data: dados.get("data"),
    status: dados.get("status"),
    notas: dados.get("notas") || undefined,
  });
  if (!r.success) return { erro: primeiroErro(r.error) };

  await db.consulta.create({
    data: {
      pacienteId: id.parse(pacienteId),
      dataHora: fromZonedTime(`${r.data.data}T12:00:00`, FUSO),
      status: r.data.status,
      notas: r.data.notas ?? null,
    },
  });
  revalidatePath("/");
  revalidatePath(`/pacientes/${pacienteId}`);
  return { erro: null };
}

/** A operação mais frequente do consultório: um clique, sem formulário. */
export async function consultaRealizadaHoje(pacienteId: string) {
  await db.consulta.create({
    data: {
      pacienteId: id.parse(pacienteId),
      dataHora: new Date(),
      status: "REALIZADA",
    },
  });
  revalidatePath("/");
  revalidatePath(`/pacientes/${pacienteId}`);
}

export type ResultadoImportacao = { erro: string | null; resumo: string | null };

export async function importarPacientes(
  _anterior: ResultadoImportacao,
  dados: FormData,
): Promise<ResultadoImportacao> {
  const { validos, erros } = analisarCsv(String(dados.get("csv") ?? ""));

  for (const linha of validos) {
    await db.paciente.create({
      data: {
        nome: linha.nome,
        telefone: linha.telefone,
        consultas: linha.ultimaConsulta
          ? { create: { dataHora: linha.ultimaConsulta, status: "REALIZADA" } }
          : undefined,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/pacientes");
  return {
    erro: erros.length ? erros.join(" ") : null,
    resumo: `${validos.length} paciente(s) importado(s).`,
  };
}
