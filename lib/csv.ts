import { fromZonedTime } from "date-fns-tz";
import { normalizarTelefone, telefoneValido } from "./paciente";
import { FUSO } from "./recall";

export type LinhaImportada = {
  nome: string;
  telefone: string;
  ultimaConsulta: Date | null;
};

/** Aceita dd/mm/aaaa e aaaa-mm-dd. Meio-dia de Brasília, o dia é o que importa. */
export function lerData(bruto: string) {
  const texto = bruto.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  const dia = br
    ? `${br[3]}-${br[2]}-${br[1]}`
    : iso
      ? `${iso[1]}-${iso[2]}-${iso[3]}`
      : null;
  if (!dia) return null;
  const data = fromZonedTime(`${dia}T12:00:00`, FUSO);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Uma linha por paciente: nome, telefone e (opcional) data da última consulta. */
export function analisarCsv(texto: string) {
  const validos: LinhaImportada[] = [];
  const erros: string[] = [];

  texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((linha, i) => {
      const numero = i + 1;
      const [nome = "", telefone = "", data = ""] = linha
        .split(/[,;\t]/)
        .map((c) => c.trim());

      if (nome.length < 2) return erros.push(`Linha ${numero}: falta o nome.`);

      const e164 = normalizarTelefone(telefone);
      if (!telefoneValido(e164)) {
        return erros.push(`Linha ${numero}: telefone inválido (${nome}).`);
      }

      const ultimaConsulta = data ? lerData(data) : null;
      if (data && !ultimaConsulta) {
        return erros.push(`Linha ${numero}: data ${data} não é dd/mm/aaaa (${nome}).`);
      }
      if (ultimaConsulta && ultimaConsulta > new Date()) {
        return erros.push(`Linha ${numero}: a data está no futuro (${nome}).`);
      }

      validos.push({ nome, telefone: e164, ultimaConsulta });
    });

  return { validos, erros };
}
