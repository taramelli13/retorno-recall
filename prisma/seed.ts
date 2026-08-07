import { addDays, subDays, subHours } from "date-fns";
import { db } from "../lib/db";
import type {
  ResultadoContato,
  StatusConsulta,
} from "../app/generated/prisma/enums";

const agora = new Date();
const ha = (dias: number) => subDays(agora, dias);
const daqui = (dias: number) => addDays(agora, dias);

type Caso = {
  nome: string;
  telefone: string;
  intervaloDias?: number;
  ativo?: boolean;
  observacoes?: string;
  consultas: { dataHora: Date; status: StatusConsulta }[];
  contatos?: { data: Date; resultado?: ResultadoContato }[];
  /** verdade esperada da regra central — os testes da Fase 1 leem daqui */
  aparece: boolean;
  porque: string;
};

export const CASOS: Caso[] = [
  {
    nome: "Beatriz Almeida",
    telefone: "5514990000001",
    consultas: [{ dataHora: ha(70), status: "REALIZADA" }],
    aparece: true,
    porque: "vencido há 40 dias, sem contato",
  },
  {
    nome: "Carla Moreira",
    telefone: "5514990000002",
    consultas: [{ dataHora: ha(27), status: "REALIZADA" }],
    aparece: true,
    porque: "vence em 3 dias (dentro da janela de 7)",
  },
  {
    nome: "Daniela Rocha",
    telefone: "5514990000003",
    consultas: [{ dataHora: ha(30), status: "REALIZADA" }],
    aparece: true,
    porque: "vence hoje",
  },
  {
    nome: "Elaine Barros",
    telefone: "5514990000004",
    consultas: [
      { dataHora: ha(60), status: "REALIZADA" },
      { dataHora: daqui(4), status: "AGENDADA" },
    ],
    aparece: false,
    porque: "vencido, mas já tem consulta agendada no futuro",
  },
  {
    nome: "Fernanda Lima",
    telefone: "5514990000005",
    consultas: [{ dataHora: ha(60), status: "REALIZADA" }],
    contatos: [{ data: ha(1) }],
    aparece: false,
    porque: "vencido, mas contatada ontem",
  },
  {
    nome: "Gabriela Souza",
    telefone: "5514990000006",
    consultas: [{ dataHora: ha(60), status: "REALIZADA" }],
    contatos: [{ data: ha(9), resultado: "SEM_RESPOSTA" }],
    aparece: true,
    porque: "vencido e contatada há 9 dias — reentra na lista",
  },
  {
    nome: "Helena Castro",
    telefone: "5514990000007",
    consultas: [{ dataHora: daqui(2), status: "AGENDADA" }],
    aparece: false,
    porque: "nunca teve consulta realizada",
  },
  {
    nome: "Isabela Ferraz",
    telefone: "5514990000008",
    ativo: false,
    consultas: [{ dataHora: ha(90), status: "REALIZADA" }],
    aparece: false,
    porque: "inativa",
  },
  {
    nome: "Juliana Prado",
    telefone: "5514990000009",
    intervaloDias: 15,
    consultas: [{ dataHora: ha(20), status: "REALIZADA" }],
    aparece: true,
    porque: "intervalo customizado de 15 dias, vencido há 5",
  },
  {
    nome: "Kelly Nogueira",
    telefone: "5514990000010",
    consultas: [
      { dataHora: ha(50), status: "REALIZADA" },
      { dataHora: ha(10), status: "FALTOU" },
    ],
    aparece: true,
    porque: "faltou na última — vale a realizada de 50 dias atrás",
  },
  {
    nome: "Larissa Bueno",
    telefone: "5514990000011",
    consultas: [{ dataHora: ha(5), status: "REALIZADA" }],
    aparece: false,
    porque: "em dia, vence só daqui a 25 dias",
  },
  {
    nome: "Mariana Teixeira",
    telefone: "5514990000012",
    consultas: [{ dataHora: ha(22), status: "REALIZADA" }],
    aparece: false,
    porque: "vence em 8 dias — um dia fora da janela",
  },
  {
    nome: "Natália Campos",
    telefone: "5514990000013",
    consultas: [
      { dataHora: ha(60), status: "REALIZADA" },
      { dataHora: ha(3), status: "AGENDADA" },
    ],
    aparece: true,
    porque: "a agendada está no passado — não bloqueia",
  },
  {
    nome: "Olívia Nunes",
    telefone: "5514990000014",
    consultas: [
      { dataHora: ha(60), status: "REALIZADA" },
      { dataHora: daqui(5), status: "CANCELADA" },
    ],
    aparece: true,
    porque: "consulta futura cancelada não conta como agendada",
  },
  {
    nome: "Patrícia Vidal",
    telefone: "5514990000015",
    observacoes: "prefere terça à tarde",
    consultas: [{ dataHora: ha(60), status: "REALIZADA" }],
    contatos: [{ data: subHours(ha(5), 1), resultado: "SEM_RESPOSTA" }],
    aparece: true,
    porque: "contato completou 5 dias — a janela de silêncio expirou",
  },
  {
    nome: "Renata Villas",
    telefone: "5514990000016",
    consultas: [
      { dataHora: ha(60), status: "REALIZADA" },
      { dataHora: daqui(400), status: "REALIZADA" },
    ],
    aparece: true,
    porque: "ano digitado errado na realizada — não pode esconder a paciente",
  },
];

export async function semear() {
  // ponytail: seed é destrutivo e só roda em dev. Não existe dado real aqui.
  await db.paciente.deleteMany();

  for (const caso of CASOS) {
    await db.paciente.create({
      data: {
        nome: caso.nome,
        telefone: caso.telefone,
        intervaloDias: caso.intervaloDias ?? 30,
        ativo: caso.ativo ?? true,
        observacoes: caso.observacoes,
        consultas: { create: caso.consultas },
        contatos: { create: caso.contatos ?? [] },
      },
    });
  }

}

if (process.argv[1]?.endsWith("seed.ts")) {
  semear()
    .then(() => {
      const esperados = CASOS.filter((c) => c.aparece).length;
      console.log(
        `${CASOS.length} pacientes criados — ${esperados} devem aparecer na lista de hoje.`,
      );
    })
    .finally(() => db.$disconnect());
}
