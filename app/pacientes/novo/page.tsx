import Link from "next/link";
import { criarPaciente } from "../actions";
import { FormularioPaciente } from "../formulario-paciente";
import { IconArrowLeft, IconUserPlus } from "@/app/components/icons";

export default function NovoPaciente() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-20 pt-6">
      <div className="mb-4">
        <Link href="/pacientes" className="inline-flex items-center gap-1.5 text-xs text-suave hover:text-tinta transition-colors font-mono">
          <IconArrowLeft className="size-3.5" />
          <span>Voltar para pacientes</span>
        </Link>
      </div>

      <header className="mb-6">
        <p className="titulo-secao flex items-center gap-1.5">
          <IconUserPlus className="size-3.5 text-em-dia" />
          <span>Novo Cadastro</span>
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta mt-0.5">
          Cadastrar Paciente
        </h1>
      </header>

      <div className="cartao">
        <FormularioPaciente acao={criarPaciente} rotulo="Cadastrar Paciente" />
      </div>
    </main>
  );
}
