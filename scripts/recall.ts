import { formatInTimeZone } from "date-fns-tz";
import { db } from "../lib/db";
import { buscarPacientesParaContatar, diasDesde, FUSO } from "../lib/recall";

async function main() {
  const pacientes = await buscarPacientesParaContatar();

  if (pacientes.length === 0) {
    console.log("\nNinguém para contatar hoje. Está tudo em dia.\n");
    return;
  }

  console.log(`\n${pacientes.length} para contatar hoje:\n`);
  for (const p of pacientes) {
    const atraso = diasDesde(p.venceEm); // > 0 = já venceu
    const prazo =
      atraso > 0
        ? `${atraso}d atrasado`
        : atraso === 0
          ? "vence hoje"
          : `vence em ${-atraso}d`;
    console.log(
      `${p.nome.padEnd(20)} ${String(diasDesde(p.ultimaConsulta)).padStart(4)}d sem vir` +
        `  ${prazo.padEnd(14)} ${formatInTimeZone(p.venceEm, FUSO, "dd/MM")}  ${p.telefone}`,
    );
  }
  console.log();
}

main().finally(() => db.$disconnect());
