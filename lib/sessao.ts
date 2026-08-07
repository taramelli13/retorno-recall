export const COOKIE_SESSAO = "retorno";

/** Hash da senha única. O cookie guarda o selo, nunca a senha em si. */
export async function selo(senha: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(senha),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
