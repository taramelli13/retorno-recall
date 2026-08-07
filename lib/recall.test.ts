import "dotenv/config";
import { beforeAll, expect, test } from "vitest";
import { CASOS, semear } from "../prisma/seed";
import { buscarPacientesParaContatar } from "./recall";

let lista: string[];

beforeAll(async () => {
  await semear();
  lista = (await buscarPacientesParaContatar()).map((p) => p.nome);
}, 60_000);

// Um teste por linha do seed: a expectativa mora no próprio caso.
test.each(CASOS.map((c) => [c.nome, c.aparece, c.porque] as const))(
  "%s — %s (%s)",
  (nome, aparece) => {
    expect(lista.includes(nome)).toBe(aparece);
  },
);

test("não inventa nem esquece ninguém", () => {
  expect(lista).toHaveLength(CASOS.filter((c) => c.aparece).length);
});

test("ordena do mais atrasado para o menos", async () => {
  const vencimentos = (await buscarPacientesParaContatar()).map((p) =>
    p.venceEm.getTime(),
  );
  expect(vencimentos).toEqual([...vencimentos].sort((a, b) => a - b));
});
