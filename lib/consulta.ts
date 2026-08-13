import { z } from "zod";

export const LIMITE_NOTAS = 5000;

const notas = z
  .string()
  .trim()
  .max(LIMITE_NOTAS, "O prontuário pode ter até 5.000 caracteres.");

export const consultaSchema = z.object({
  data: z.iso.date(),
  hora: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  status: z.enum(["AGENDADA", "REALIZADA", "FALTOU", "CANCELADA"]),
  notas: notas.optional(),
});

/** Edição do prontuário: texto em branco significa "apagar", vira null. */
export const notasSchema = notas.transform((v) => v || null);
