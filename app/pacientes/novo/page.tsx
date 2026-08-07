import Link from "next/link";
import { criarPaciente } from "../actions";
import { FormularioPaciente } from "../formulario-paciente";

export default function NovoPaciente() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      <header className="flex items-center justify-between gap-3 pt-8 pb-5">
        <h1 className="font-display text-3xl font-semibold">Novo paciente</h1>
        <Link href="/pacientes" className="btn-suave shrink-0">
          Pacientes
        </Link>
      </header>
      <div className="cartao">
        <FormularioPaciente acao={criarPaciente} rotulo="Cadastrar" />
      </div>
    </main>
  );
}
