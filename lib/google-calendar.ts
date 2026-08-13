import { addDays, addHours } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { db } from "./db";
import { FUSO } from "./recall";

export type EventoGoogleCalendar = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
};

/**
 * Obtém um Access Token válido usando as credenciais do .env
 */
export async function obterAccessTokenGoogle(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Credenciais do Google Calendar não configuradas no .env");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Erro ao renovar token do Google: ${JSON.stringify(data)}`);
  }

  return data.access_token as string;
}

/**
 * Busca compromissos do Google Agenda a partir de uma data inicial (padrão: hoje)
 */
export async function buscarEventosGoogleCalendar(dataInicio = new Date()): Promise<EventoGoogleCalendar[]> {
  const token = await obterAccessTokenGoogle();
  const timeMin = dataInicio.toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&singleEvents=true&orderBy=startTime&maxResults=250`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Erro ao buscar eventos do Google Agenda: ${JSON.stringify(data)}`);
  }

  return (data.items || []) as EventoGoogleCalendar[];
}

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/**
 * Decide a qual paciente um evento da agenda pertence.
 *
 * Só palavras inteiras contam — "ana" não pode casar com "semanais" nem
 * "Juliana" — e é preciso acertar pelo menos duas partes do nome (ou o nome
 * todo, se ele só tiver uma parte útil). Telefone com 8+ dígitos também vale.
 */
export function encontrarPacienteDoEvento<
  P extends { nome: string; telefone: string },
>(textoEvento: string, pacientes: P[]): P | undefined {
  const palavras = new Set(normalizar(textoEvento).split(/[^a-z0-9]+/));
  const digitos = textoEvento.replace(/\D/g, "");

  return pacientes.find((p) => {
    const partes = normalizar(p.nome)
      .split(/\s+/)
      .filter((parte) => parte.length > 2);
    const acertos = partes.filter((parte) => palavras.has(parte)).length;
    const nomeMatch = partes.length > 0 && acertos >= Math.min(2, partes.length);

    const telefone = p.telefone.replace(/\D/g, "");
    const telefoneMatch = telefone.length >= 8 && digitos.includes(telefone);

    return nomeMatch || telefoneMatch;
  });
}

/**
 * Sincroniza os eventos do Google Agenda com o banco de dados do Retorno.
 * Associa cada evento ao paciente correspondente (pelo nome ou telefone).
 */
export async function sincronizarGoogleAgenda() {
  const eventos = await buscarEventosGoogleCalendar();
  const pacientes = await db.paciente.findMany({ where: { ativo: true } });

  let sincronizados = 0;
  let ignorados = 0;

  for (const evento of eventos) {
    if (evento.status === "cancelled" || !evento.start) continue;

    const textoEvento = `${evento.summary || ""} ${evento.description || ""}`;
    if (!evento.start.dateTime && !evento.start.date) continue;

    // Evento de dia inteiro não tem hora: meio-dia de Brasília, como o resto
    // do sistema — meia-noite UTC cairia no dia anterior no fuso local.
    const dataHora = evento.start.dateTime
      ? new Date(evento.start.dateTime)
      : fromZonedTime(`${evento.start.date}T12:00:00`, FUSO);

    const pacienteEncontrado = encontrarPacienteDoEvento(textoEvento, pacientes);

    if (pacienteEncontrado) {
      await db.consulta.upsert({
        where: { googleEventId: evento.id },
        update: {
          pacienteId: pacienteEncontrado.id,
          dataHora,
          status: "AGENDADA",
          notas: evento.summary || "Consulta via Google Agenda",
        },
        create: {
          googleEventId: evento.id,
          pacienteId: pacienteEncontrado.id,
          dataHora,
          status: "AGENDADA",
          notas: evento.summary || "Consulta via Google Agenda",
        },
      });
      sincronizados++;
    } else {
      ignorados++;
    }
  }

  return { sincronizados, ignorados, totalEventos: eventos.length };
}

/**
 * Cria o evento no Google Agenda quando uma consulta é marcada no app.
 * Com horário definido, o evento dura 1h; sem horário, é de dia inteiro.
 * Lembretes do Google: 1 dia e 1 hora antes.
 * Melhor esforço: sem credenciais ou com erro no Google, a consulta
 * continua salva no banco — o evento é conveniência, não fonte de verdade.
 */
export async function tentarCriarEventoConsulta(
  consultaId: string,
  nomePaciente: string,
  dataHora: Date,
  comHorario = false,
) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) return;
  try {
    const token = await obterAccessTokenGoogle();
    const dia = formatInTimeZone(dataHora, FUSO, "yyyy-MM-dd");
    const diaSeguinte = formatInTimeZone(addDays(dataHora, 1), FUSO, "yyyy-MM-dd");

    const periodo = comHorario
      ? {
          start: { dateTime: dataHora.toISOString(), timeZone: FUSO },
          end: { dateTime: addHours(dataHora, 1).toISOString(), timeZone: FUSO },
        }
      : { start: { date: dia }, end: { date: diaSeguinte } };

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Consulta — ${nomePaciente}`,
          ...periodo,
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 24 * 60 },
              { method: "popup", minutes: 60 },
            ],
          },
        }),
      },
    );

    const evento = await response.json();
    if (!response.ok) {
      throw new Error(`Erro ao criar evento: ${JSON.stringify(evento)}`);
    }

    // Liga a consulta ao evento: o sync reconhece pelo id e não duplica.
    await db.consulta.update({
      where: { id: consultaId },
      data: { googleEventId: evento.id as string },
    });
  } catch (err) {
    console.error("Erro ao criar evento no Google Agenda:", err);
  }
}

/**
 * Tenta sincronizar a agenda do Google em segundo plano sem quebrar a requisição em caso de erro.
 */
export async function tentarSincronizarGoogleAgenda() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    return;
  }
  try {
    await sincronizarGoogleAgenda();
  } catch (err) {
    console.error("Erro ao sincronizar Google Agenda automaticamente:", err);
  }
}

