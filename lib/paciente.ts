import { z } from "zod";

// DDDs em uso no Brasil. Fora desta lista é digitação errada, não região nova.
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Entra "(14) 99000-0001" ou "+55 14 99000 0001", sai "5514990000001". */
export function normalizarTelefone(bruto: string) {
  const digitos = bruto.replace(/\D/g, "");
  // Quem escreve o "+" está declarando o país. Sem "+", é Brasil.
  if (bruto.trim().startsWith("+") && !digitos.startsWith("55")) return digitos;
  const local = digitos.length > 11 && digitos.startsWith("55")
    ? digitos.slice(2)
    : digitos;
  return `55${local}`;
}

export function telefoneValido(e164: string) {
  // Paciente que mora fora: sem DDD pra conferir, vale o tamanho do E.164.
  // ponytail: não vale carregar tabela de numeração de 200 países por 2 pacientes.
  if (!e164.startsWith("55")) return e164.length >= 8 && e164.length <= 15;

  const local = e164.slice(2);
  if (local.length !== 10 && local.length !== 11) return false;
  if (!DDDS.has(Number(local.slice(0, 2)))) return false;
  // Celular tem 11 dígitos e começa com 9; fixo tem 10 e começa de 2 a 5.
  // Celular antigo de 8 dígitos cai fora de propósito: não funciona mais no WhatsApp.
  return local.length === 11 ? local[2] === "9" : "2345".includes(local[2]);
}

export const pacienteSchema = z.object({
  nome: z.string().trim().min(2, "Escreva o nome do paciente."),
  telefone: z
    .string()
    .transform(normalizarTelefone)
    .refine(telefoneValido, "Telefone inválido. Use DDD + número: (14) 99999-9999."),
  intervaloDias: z.coerce
    .number()
    .int()
    .min(1, "O intervalo tem que ser de pelo menos 1 dia.")
    .max(365, "O intervalo máximo é 365 dias."),
  observacoes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
  ativo: z.coerce.boolean(),
});

export type DadosPaciente = z.infer<typeof pacienteSchema>;

/** Primeira mensagem de erro do Zod, que é a que a tela mostra. */
export function primeiroErro(erro: z.ZodError) {
  return erro.issues[0]?.message ?? "Não consegui salvar. Confira os campos.";
}
