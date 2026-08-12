import { formatInTimeZone } from "date-fns-tz";
import { buscarPacientesParaContatar, diasDesde, FUSO } from "@/lib/recall";
import { tentarSincronizarGoogleAgenda } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

// LGPD: o e-mail sai do sistema. Vai nome e prazo, nunca telefone nem observação.
function corpo(
  pacientes: { nome: string; venceEm: Date }[],
  endereco: string,
  agora: Date,
) {
  const linhas = pacientes
    .map((p) => {
      const atraso = diasDesde(p.venceEm, agora);
      const prazo =
        atraso > 0
          ? `${atraso} dias atrasado`
          : atraso === 0
            ? "vence hoje"
            : `vence em ${-atraso} dias`;
      return `<li>${p.nome} — ${prazo}</li>`;
    })
    .join("");

  return pacientes.length === 0
    ? `<p>Ninguém para contatar hoje — todo mundo está em dia ou já foi avisado.</p>`
    : `<p>${pacientes.length} para contatar hoje:</p><ul>${linhas}</ul>
       <p><a href="${endereco}">Abrir a lista</a></p>`;
}

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const chave = process.env.RESEND_API_KEY;
  const para = process.env.EMAIL_RESUMO;
  const endereco = process.env.APP_URL ?? new URL(request.url).origin;
  const agora = new Date();
  await tentarSincronizarGoogleAgenda();
  const { paraContatar: pacientes } = await buscarPacientesParaContatar();

  if (!chave || !para) {
    return Response.json({
      enviado: false,
      motivo: "RESEND_API_KEY ou EMAIL_RESUMO não configurados.",
      pacientes: pacientes.length,
    });
  }

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE ?? "Retorno <onboarding@resend.dev>",
      to: para,
      subject: `Retorno · ${pacientes.length} para contatar (${formatInTimeZone(agora, FUSO, "dd/MM")})`,
      html: corpo(pacientes, endereco, agora),
    }),
  });

  if (!resposta.ok) {
    return Response.json(
      { enviado: false, motivo: await resposta.text() },
      { status: 502 },
    );
  }

  return Response.json({ enviado: true, pacientes: pacientes.length });
}
