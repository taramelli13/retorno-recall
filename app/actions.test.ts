import "dotenv/config";
import { beforeAll, expect, test, vi } from "vitest";

// revalidatePath só existe dentro de uma requisição do Next.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { semear } from "../prisma/seed";
import { buscarPacientesParaContatar } from "@/lib/recall";
import { linkWhatsApp } from "@/lib/mensagem";
import { marcarRetorno, registrarContato } from "./actions";

const listas = async () => {
  const { paraContatar, aguardando } = await buscarPacientesParaContatar();
  return {
    paraContatar: paraContatar.map((p) => p.nome),
    aguardando: aguardando.map((p) => p.nome),
  };
};

beforeAll(async () => {
  await semear();
}, 60_000);

test("falar no WhatsApp move a paciente para aguardando resposta", async () => {
  const alvo = (await buscarPacientesParaContatar()).paraContatar[0];
  await registrarContato(alvo.id, "ENVIADO");
  const l = await listas();
  expect(l.paraContatar).not.toContain(alvo.nome);
  expect(l.aguardando).toContain(alvo.nome);
});

test("sem resposta também move para aguardando", async () => {
  const alvo = (await buscarPacientesParaContatar()).paraContatar[0];
  await registrarContato(alvo.id, "SEM_RESPOSTA");
  const l = await listas();
  expect(l.paraContatar).not.toContain(alvo.nome);
  expect(l.aguardando).toContain(alvo.nome);
});

test("marcar retorno tira a paciente da tela, mesmo aguardando", async () => {
  const alvo = (await buscarPacientesParaContatar()).aguardando[0];
  const amanha = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  expect(await marcarRetorno(alvo.id, amanha)).toEqual({ erro: null });
  const l = await listas();
  expect(l.paraContatar).not.toContain(alvo.nome);
  expect(l.aguardando).not.toContain(alvo.nome);
});

test("data no passado é recusada com instrução", async () => {
  const alvo = (await buscarPacientesParaContatar()).paraContatar[0];
  const r = await marcarRetorno(alvo.id, "2020-01-01");
  expect(r.erro).toMatch(/já passou/);
  expect((await listas()).paraContatar).toContain(alvo.nome);
});

test("o link do WhatsApp leva nome e dias no texto", () => {
  const link = linkWhatsApp("5514990000001", "Beatriz Almeida", 70);
  expect(link).toContain("https://wa.me/5514990000001?text=");
  expect(decodeURIComponent(link)).toContain("Oi Beatriz!");
  expect(decodeURIComponent(link)).toContain("faz 70 dias");
});
