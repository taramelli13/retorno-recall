import "dotenv/config";
import { beforeAll, expect, test, vi } from "vitest";

// revalidatePath só existe dentro de uma requisição do Next.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { semear } from "../prisma/seed";
import { buscarPacientesParaContatar } from "@/lib/recall";
import { linkWhatsApp } from "@/lib/mensagem";
import { marcarRetorno, registrarContato } from "./actions";

const nomes = async () =>
  (await buscarPacientesParaContatar()).map((p) => p.nome);

beforeAll(async () => {
  await semear();
}, 60_000);

test("falar no WhatsApp tira a paciente da lista", async () => {
  const alvo = (await buscarPacientesParaContatar())[0];
  await registrarContato(alvo.id, "ENVIADO");
  expect(await nomes()).not.toContain(alvo.nome);
});

test("sem resposta também tira — e volta depois de 5 dias", async () => {
  const alvo = (await buscarPacientesParaContatar())[0];
  await registrarContato(alvo.id, "SEM_RESPOSTA");
  expect(await nomes()).not.toContain(alvo.nome);
});

test("marcar retorno tira a paciente da lista", async () => {
  const alvo = (await buscarPacientesParaContatar())[0];
  const amanha = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  expect(await marcarRetorno(alvo.id, amanha)).toEqual({ erro: null });
  expect(await nomes()).not.toContain(alvo.nome);
});

test("data no passado é recusada com instrução", async () => {
  const alvo = (await buscarPacientesParaContatar())[0];
  const r = await marcarRetorno(alvo.id, "2020-01-01");
  expect(r.erro).toMatch(/já passou/);
  expect(await nomes()).toContain(alvo.nome);
});

test("o link do WhatsApp leva nome e dias no texto", () => {
  const link = linkWhatsApp("5514990000001", "Beatriz Almeida", 70);
  expect(link).toContain("https://wa.me/5514990000001?text=");
  expect(decodeURIComponent(link)).toContain("Oi Beatriz!");
  expect(decodeURIComponent(link)).toContain("faz 70 dias");
});
