import Link from "next/link";
import { FormularioImportar } from "./formulario-importar";
import { IconArrowLeft, IconUpload } from "@/app/components/icons";

export default function Importar() {
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
          <IconUpload className="size-3.5 text-em-dia" />
          <span>Importação em Lote</span>
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta mt-0.5">
          Importar do CSV
        </h1>
        <p className="mt-2 text-sm text-suave leading-relaxed">
          Cole abaixo as linhas do CSV. Formato esperado por linha: <br />
          <code className="font-mono text-xs bg-superficie px-1.5 py-0.5 rounded border border-traco text-tinta">
            Nome, Telefone, Data Última Consulta
          </code>
        </p>
      </header>

      <div className="cartao p-5">
        <FormularioImportar />
      </div>
    </main>
  );
}
