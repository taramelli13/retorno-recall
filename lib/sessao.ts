export const COOKIE_SESSAO = "retorno";

/** 180 dias. É o meu consultório e o meu celular; relogar toda semana é atrito à toa. */
export const DURACAO_SESSAO_S = 60 * 60 * 24 * 180;

const codificador = new TextEncoder();

// Web Crypto apenas: este módulo roda no proxy (Edge), onde não existe `node:crypto`.

function paraBase64url(bytes: Uint8Array) {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64url(texto: string) {
  const normal = texto.replace(/-/g, "+").replace(/_/g, "/");
  const completo = normal + "=".repeat((4 - (normal.length % 4)) % 4);
  const binario = atob(completo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function chaveDeAssinatura(segredo: string) {
  return crypto.subtle.importKey(
    "raw",
    codificador.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Token de sessão: `corpo.assinatura`, onde o corpo é `{ exp, nonce }`.
 *
 * O cookie antigo guardava SHA-256(senha) — um valor fixo, igual em toda sessão e
 * derivado da própria credencial. Quem o obtivesse tinha acesso para sempre, e
 * trocar isso exigia trocar a senha. Aqui o cookie é aleatório (nonce), expira
 * sozinho (exp) e não tem relação nenhuma com a senha: girar APP_SESSION_SECRET
 * invalida todas as sessões sem tocar em como eu entro.
 */
export async function criaToken(
  segredo: string,
  agoraMs: number = Date.now(),
  duracaoS: number = DURACAO_SESSAO_S,
) {
  const nonce = paraBase64url(crypto.getRandomValues(new Uint8Array(16)));
  const exp = Math.floor(agoraMs / 1000) + duracaoS;
  const corpo = paraBase64url(codificador.encode(JSON.stringify({ exp, nonce })));

  const chave = await chaveDeAssinatura(segredo);
  const assinatura = new Uint8Array(
    await crypto.subtle.sign("HMAC", chave, codificador.encode(corpo)),
  );

  return `${corpo}.${paraBase64url(assinatura)}`;
}

/**
 * Aceita o token só se a assinatura confere E o prazo não venceu.
 * Qualquer entrada malformada é `false` — nunca exceção: isto roda no proxy,
 * e um throw ali derruba a request inteira em vez de mandar para o login.
 */
export async function tokenValido(
  token: string | undefined | null,
  segredo: string,
  agoraMs: number = Date.now(),
) {
  if (!token) return false;

  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const [corpo, assinatura] = partes;
  if (!corpo || !assinatura) return false;

  try {
    const chave = await chaveDeAssinatura(segredo);
    const confere = await crypto.subtle.verify(
      "HMAC",
      chave,
      deBase64url(assinatura),
      codificador.encode(corpo),
    );
    if (!confere) return false;

    const { exp } = JSON.parse(new TextDecoder().decode(deBase64url(corpo)));
    return typeof exp === "number" && agoraMs / 1000 < exp;
  } catch {
    return false;
  }
}

/**
 * Compara a senha digitada com a configurada em tempo constante.
 * `===` em string vaza o tamanho do prefixo comum pelo tempo de resposta; com uma
 * senha só e sem rate limit, é o tipo de brecha que não custa nada fechar.
 */
export async function senhaConfere(tentativa: string, senha: string) {
  const [a, b] = await Promise.all([resumo(tentativa), resumo(senha)]);
  if (a.length !== b.length) return false;

  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a[i] ^ b[i];
  return diferenca === 0;
}

async function resumo(texto: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", codificador.encode(texto)),
  );
}
