import "dotenv/config";
import { beforeAll, expect, test } from "vitest";
import { CASOS, semear } from "../prisma/seed";
import { buscarPacientesParaContatar } from "./recall";

let paraContatar: string[];
let aguardando: string[];

beforeAll(async () => {
  await semear();
  const listas = await buscarPacientesParaContatar();
  paraContatar = listas.paraContatar.map((p) => p.nome);
  aguardando = listas.aguardando.map((p) => p.nome);
}, 60_000);

// Um teste por linha do seed: a expectativa mora no próprio caso.
test.each(CASOS.map((c) => [c.nome, c.aparece, !!c.aguarda, c.porque] as const))(
  "%s — contatar: %s, aguardando: %s (%s)",
  (nome, aparece, aguarda) => {
    expect(paraContatar.includes(nome)).toBe(aparece);
    expect(aguardando.includes(nome)).toBe(aguarda);
  },
);

test("não inventa nem esquece ninguém", () => {
  expect(paraContatar).toHaveLength(CASOS.filter((c) => c.aparece).length);
  expect(aguardando).toHaveLength(CASOS.filter((c) => c.aguarda).length);
});

test("ordena do mais atrasado para o menos", async () => {
  const vencimentos = (await buscarPacientesParaContatar()).paraContatar.map(
    (p) => p.venceEm.getTime(),
  );
  expect(vencimentos).toEqual([...vencimentos].sort((a, b) => a - b));
});
