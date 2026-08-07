import { expect, test } from "vitest";
import { normalizarTelefone, pacienteSchema, telefoneValido } from "./paciente";
import { analisarCsv, lerData } from "./csv";

test.each([
  ["(14) 99000-0001", "5514990000001"],
  ["+55 14 99000 0001", "5514990000001"],
  ["14990000001", "5514990000001"],
  ["1433334444", "551433334444"],
  ["+351 937798497", "351937798497"],
  ["+34 624889260", "34624889260"],
])("normaliza %s para %s", (bruto, esperado) => {
  expect(normalizarTelefone(bruto)).toBe(esperado);
});

test.each([
  ["5514990000001", true, "celular com nono dígito"],
  ["551433334444", true, "fixo de 8 dígitos"],
  ["5500990000001", false, "DDD inexistente"],
  ["5514890000001", false, "celular sem o 9"],
  ["551499000000", false, "celular antigo de 8 dígitos"],
  ["55149900000", false, "dígitos de menos"],
  ["351937798497", true, "paciente em Portugal"],
  ["34624889260", true, "paciente na Espanha"],
  ["3519", false, "estrangeiro curto demais"],
])("%s é válido? %s (%s)", (telefone, esperado) => {
  expect(telefoneValido(telefone)).toBe(esperado);
});

test("intervalo fora de 1–365 é recusado com instrução", () => {
  const base = { nome: "Ana Teste", telefone: "14990000001", ativo: "on" };
  expect(pacienteSchema.safeParse({ ...base, intervaloDias: 0 }).success).toBe(false);
  expect(pacienteSchema.safeParse({ ...base, intervaloDias: 366 }).success).toBe(false);
  expect(pacienteSchema.safeParse({ ...base, intervaloDias: 30 }).success).toBe(true);
});

test("o telefone chega limpo no banco", () => {
  const r = pacienteSchema.parse({
    nome: "  Ana Teste ",
    telefone: "(14) 99000-0001",
    intervaloDias: "45",
    ativo: "on",
  });
  expect(r).toMatchObject({
    nome: "Ana Teste",
    telefone: "5514990000001",
    intervaloDias: 45,
    observacoes: null,
  });
});

test("lê data em dd/mm/aaaa e aaaa-mm-dd", () => {
  expect(lerData("12/05/2026")?.toISOString()).toBe(lerData("2026-05-12")?.toISOString());
  expect(lerData("31/31/2026")).toBeNull();
  expect(lerData("ontem")).toBeNull();
});

test("CSV: importa o que dá e diz linha por linha o que não deu", () => {
  const { validos, erros } = analisarCsv(
    [
      "Maria Silva, (14) 99999-1111, 12/05/2026",
      "João Souza; 14988882222",
      "Sem Telefone, 123",
      "Data Ruim, 14988882222, 45/13/2026",
      "Futuro, 14988882222, 01/01/2099",
      "",
    ].join("\n"),
  );

  expect(validos).toHaveLength(2);
  expect(validos[0]).toMatchObject({ nome: "Maria Silva", telefone: "5514999991111" });
  expect(validos[1].ultimaConsulta).toBeNull();
  expect(erros).toHaveLength(3);
  expect(erros[0]).toMatch(/Linha 3/);
  expect(erros[2]).toMatch(/futuro/);
});
