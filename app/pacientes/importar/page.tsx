import Link from "next/link";
import { FormularioImportar } from "./formulario-importar";

export default function Importar() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      <header className="flex items-center justify-between gap-3 pt-8 pb-5">
        <h1 className="font-display text-3xl font-semibold">Importar do CSV</h1>
        <Link href="/pacientes" className="btn-suave shrink-0">
          Pacientes
        </Link>
      </header>
      <p className="text-sm text-suave">
        Uma linha por paciente: nome, telefone e a data da última consulta.
        A data é opcional — sem ela o paciente não entra na lista de hoje até a
        primeira consulta ser registrada.
      </p>
      <FormularioImportar />
    </main>
  );
}
