import { sincronizarGoogleAgenda } from "../lib/google-calendar";

async function main() {
  console.log("🔄 Sincronizando compromissos do Google Agenda...");
  try {
    const resultado = await sincronizarGoogleAgenda();
    console.log("✅ Sincronização concluída com sucesso!");
    console.log(`- Total de eventos lidos na agenda: ${resultado.totalEventos}`);
    console.log(`- Consultas sincronizadas/atualizadas: ${resultado.sincronizados}`);
    console.log(`- Eventos sem paciente correspondente: ${resultado.ignorados}`);
  } catch (error) {
    console.error("❌ Erro ao sincronizar Google Agenda:", error);
    process.exit(1);
  }
}

main();
