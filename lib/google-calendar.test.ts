import { describe, expect, it } from "vitest";
import { encontrarPacienteDoEvento } from "./google-calendar";

const ana = { nome: "Ana Laura Tavares Anaya", telefone: "17991321047" };
const juliana = { nome: "Juliana Souza", telefone: "11987654321" };
const jose = { nome: "José Camões", telefone: "21999990000" };
const pacientes = [ana, juliana, jose];

describe("encontrarPacienteDoEvento", () => {
  it("não casa pedaço de nome como substring de outra palavra", () => {
    // "ana" dentro de "semanais" causava a importação de eventos pessoais
    expect(encontrarPacienteDoEvento("Gastos semanais", pacientes)).toBeUndefined();
  });

  it("não casa parte do nome dentro do nome de outra pessoa", () => {
    // "ana" dentro de "Juliana" não casa a Ana; e só o primeiro nome também
    // não basta para casar a Juliana — evento ambíguo fica de fora
    expect(encontrarPacienteDoEvento("Consulta Juliana", pacientes)).toBeUndefined();
  });

  it("casa com duas partes do nome como palavras inteiras", () => {
    expect(encontrarPacienteDoEvento("Consulta ana Tavares", pacientes)).toBe(ana);
  });

  it("uma parte só do nome não basta quando o nome tem várias", () => {
    expect(encontrarPacienteDoEvento("Almoço com a Laura", pacientes)).toBeUndefined();
  });

  it("casa o evento criado pelo próprio app", () => {
    expect(
      encontrarPacienteDoEvento("Consulta — Ana Laura Tavares Anaya", pacientes),
    ).toBe(ana);
  });

  it("ignora acentos", () => {
    expect(encontrarPacienteDoEvento("Retorno Jose Camoes", pacientes)).toBe(jose);
  });

  it("casa pelo telefone com 8+ dígitos", () => {
    expect(
      encontrarPacienteDoEvento("Consulta (17) 99132-1047", pacientes),
    ).toBe(ana);
  });

  it("não casa número curto que aparece por coincidência", () => {
    expect(encontrarPacienteDoEvento("Sala 1799", pacientes)).toBeUndefined();
  });
});
