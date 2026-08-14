import { expect, test } from "vitest";
import {
  DURACAO_SESSAO_S,
  criaToken,
  senhaConfere,
  tokenValido,
} from "./sessao";

const SEGREDO = "segredo-de-teste-nao-usar-em-producao";
const AGORA = 1_770_000_000_000; // instante fixo: o teste não pode depender do relógio

test("o token que acabou de ser emitido é aceito", async () => {
  const token = await criaToken(SEGREDO, AGORA);
  expect(await tokenValido(token, SEGREDO, AGORA)).toBe(true);
});

test("o token não carrega a senha nem o segredo", async () => {
  const token = await criaToken(SEGREDO, AGORA);
  expect(token).not.toContain(SEGREDO);
});

test("dois logins geram tokens diferentes", async () => {
  // Sem isto, o cookie voltaria a ser um valor fixo — o defeito que motivou a troca.
  const a = await criaToken(SEGREDO, AGORA);
  const b = await criaToken(SEGREDO, AGORA);
  expect(a).not.toBe(b);
});

test("o token vence depois do prazo", async () => {
  const token = await criaToken(SEGREDO, AGORA, 60);
  expect(await tokenValido(token, SEGREDO, AGORA + 59_000)).toBe(true);
  expect(await tokenValido(token, SEGREDO, AGORA + 61_000)).toBe(false);
});

test("a duração padrão é de 180 dias", async () => {
  const token = await criaToken(SEGREDO, AGORA);
  const quaseNoFim = AGORA + (DURACAO_SESSAO_S - 10) * 1000;
  const depoisDoFim = AGORA + (DURACAO_SESSAO_S + 10) * 1000;
  expect(await tokenValido(token, SEGREDO, quaseNoFim)).toBe(true);
  expect(await tokenValido(token, SEGREDO, depoisDoFim)).toBe(false);
});

test("token assinado com outro segredo é recusado", async () => {
  const token = await criaToken("outro-segredo", AGORA);
  expect(await tokenValido(token, SEGREDO, AGORA)).toBe(false);
});

test("girar o segredo invalida as sessões existentes", async () => {
  const token = await criaToken(SEGREDO, AGORA);
  expect(await tokenValido(token, SEGREDO + "-girado", AGORA)).toBe(false);
});

test("assinatura adulterada é recusada", async () => {
  const token = await criaToken(SEGREDO, AGORA);
  const [corpo, assinatura] = token.split(".");
  const trocado = assinatura[0] === "A" ? "B" : "A";
  const forjado = `${corpo}.${trocado}${assinatura.slice(1)}`;
  expect(await tokenValido(forjado, SEGREDO, AGORA)).toBe(false);
});

test("esticar o prazo sem reassinar é recusado", async () => {
  // O ataque óbvio: pegar o cookie, empurrar o `exp` para 2099 e reenviar.
  const token = await criaToken(SEGREDO, AGORA, 60);
  const assinatura = token.split(".")[1];
  const corpoFalso = Buffer.from(
    JSON.stringify({ exp: 4_070_908_800, nonce: "x" }),
  ).toString("base64url");
  expect(await tokenValido(`${corpoFalso}.${assinatura}`, SEGREDO, AGORA)).toBe(
    false,
  );
});

test.each([
  ["vazio", ""],
  ["indefinido", undefined],
  ["nulo", null],
  ["sem ponto", "abcdef"],
  ["pontos demais", "a.b.c"],
  ["corpo vazio", ".abc"],
  ["assinatura vazia", "abc."],
  ["lixo", "%%%.%%%"],
  ["cookie do formato antigo", "a".repeat(64)],
])("entrada malformada (%s) é recusada sem lançar exceção", async (_, valor) => {
  await expect(
    tokenValido(valor as string | undefined | null, SEGREDO, AGORA),
  ).resolves.toBe(false);
});

test("senhaConfere aceita a senha certa e recusa as demais", async () => {
  expect(await senhaConfere("abacate", "abacate")).toBe(true);
  expect(await senhaConfere("abacaxi", "abacate")).toBe(false);
  expect(await senhaConfere("", "abacate")).toBe(false);
  expect(await senhaConfere("abacate ", "abacate")).toBe(false);
  expect(await senhaConfere("ABACATE", "abacate")).toBe(false);
});
