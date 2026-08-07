/** Editável. É o texto que abre no WhatsApp — ela ainda ajusta antes de enviar. */
export const MENSAGEM_PADRAO =
  "Oi {primeiroNome}! Aqui é a nutri 🙂 Vi que já faz {dias} dias desde nosso último encontro — bora marcar seu retorno? Me diz um dia que fica bom pra você.";

export function linkWhatsApp(telefone: string, nome: string, dias: number) {
  const texto = MENSAGEM_PADRAO.replace("{primeiroNome}", nome.split(" ")[0]).replace(
    "{dias}",
    String(dias),
  );
  return `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
}

/** Só exibição: o banco guarda sempre E.164 limpo. */
export function formatarTelefone(telefone: string) {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(telefone);
  // Estrangeiro não tem formato conhecido aqui; o "+" já diz que é de fora.
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${telefone}`;
}
