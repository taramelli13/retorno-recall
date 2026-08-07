import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { FUSO } from "@/lib/recall";
import { formatarTelefone } from "@/lib/mensagem";

export const dynamic = "force-dynamic";

export default async function Pacientes({ searchParams }: PageProps<"/pacientes">) {
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";

  const pacientes = await db.paciente.findMany({
    where: busca ? { nome: { contains: busca, mode: "insensitive" } } : undefined,
    orderBy: { nome: "asc" },
    include: {
      consultas: {
        where: { status: "REALIZADA" },
        orderBy: { dataHora: "desc" },
        take: 1,
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      <header className="flex items-center justify-between gap-3 pt-8 pb-6">
        <div>
          <p className="titulo-secao">{pacientes.length} no total</p>
          <h1 className="font-display text-3xl font-semibold">Pacientes</h1>
        </div>
        <Link href="/" className="btn-suave shrink-0">
          Hoje
        </Link>
      </header>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome"
          aria-label="Buscar por nome"
          className="campo min-w-0 flex-1"
        />
        <button type="submit" className="btn-suave shrink-0">
          Buscar
        </button>
      </form>

      <div className="mt-3 mb-6 flex gap-2">
        <Link href="/pacientes/novo" className="btn-escuro">
          Novo paciente
        </Link>
        <Link href="/pacientes/importar" className="btn-suave">
          Importar do CSV
        </Link>
      </div>

      {pacientes.length === 0 ? (
        <div className="cartao p-8 text-center text-sm text-suave">
          {busca
            ? `Ninguém com "${busca}" no nome.`
            : "Nenhum paciente ainda. Cadastre o primeiro ou importe do CSV."}
        </div>
      ) : (
        <ul className="cartao divide-y divide-traco overflow-hidden">
          {pacientes.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pacientes/${p.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-fundo"
              >
                <span className="min-w-0 truncate font-display text-lg">
                  {p.nome}
                  {!p.ativo && (
                    <span className="selo ml-2 bg-traco text-suave">inativa</span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-xs text-suave">
                  {p.consultas[0]
                    ? formatInTimeZone(p.consultas[0].dataHora, FUSO, "dd/MM/yy")
                    : formatarTelefone(p.telefone)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
