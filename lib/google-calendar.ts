import { db } from "./db";

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

    const textoEvento = `${evento.summary || ""} ${evento.description || ""}`.toLowerCase();
    const dataHoraStr = evento.start.dateTime || evento.start.date;
    if (!dataHoraStr) continue;

    const dataHora = new Date(dataHoraStr);

    // Tenta encontrar o paciente pelo nome ou telefone no título/descrição do evento
    const pacienteEncontrado = pacientes.find((p) => {
      const nomeMatch = p.nome.toLowerCase().split(" ").some(parte => parte.length > 2 && textoEvento.includes(parte.toLowerCase()));
      const telefoneMatch = p.telefone && textoEvento.replace(/\D/g, "").includes(p.telefone.replace(/\D/g, ""));
      return nomeMatch || telefoneMatch;
    });

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

