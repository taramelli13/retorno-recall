import { expect, test } from "vitest";
import { consultaSchema, notasSchema, LIMITE_NOTAS } from "./consulta";

test("consulta aceita prontuário longo até o limite", () => {
  const r = consultaSchema.safeParse({
    data: "2026-08-10",
    status: "REALIZADA",
    notas: "a".repeat(LIMITE_NOTAS),
  });
  expect(r.success).toBe(true);
});

test("prontuário acima do limite é recusado com instrução", () => {
  const r = consultaSchema.safeParse({
    data: "2026-08-10",
    status: "REALIZADA",
    notas: "a".repeat(LIMITE_NOTAS + 1),
  });
  expect(r.success).toBe(false);
  expect(notasSchema.safeParse("a".repeat(LIMITE_NOTAS + 1)).success).toBe(false);
});

test("notas em branco viram null (apaga o registro, não guarda espaço)", () => {
  expect(notasSchema.parse("   ")).toBeNull();
  expect(notasSchema.parse("dieta ok")).toBe("dieta ok");
});

test("data e status inválidos são recusados", () => {
  expect(consultaSchema.safeParse({ data: "ontem", status: "REALIZADA" }).success).toBe(false);
  expect(consultaSchema.safeParse({ data: "2026-08-10", status: "TALVEZ" }).success).toBe(false);
});
