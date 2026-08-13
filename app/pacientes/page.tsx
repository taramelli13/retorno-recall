import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { FUSO } from "@/lib/recall";
import { formatarTelefone } from "@/lib/mensagem";
import {
  IconSearch,
  IconUserPlus,
  IconUpload,
  IconCalendar,
  IconPhone,
  IconChevronRight,
} from "@/app/components/icons";

export const dynamic = "force-dynamic";

export default async function Pacientes({ searchParams }: PageProps<"/pacientes">) {
  const { q, arquivados } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const mostrarArquivados = arquivados === "1";

  const [pacientes, totalArquivados] = await Promise.all([
    db.paciente.findMany({
      where: {
        ...(busca ? { nome: { contains: busca, mode: "insensitive" as const } } : {}),
        ...(mostrarArquivados ? {} : { ativo: true }),
      },
      orderBy: { nome: "asc" },
      include: {
        consultas: {
          where: { status: "REALIZADA" },
          orderBy: { dataHora: "desc" },
          take: 1,
        },
      },
    }),
    db.paciente.count({ where: { ativo: false } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-20 pt-6">
      {/* Cabeçalho */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="titulo-secao flex items-center gap-1.5">
            <span>Base de Cadastros</span>
            <span className="selo bg-em-dia-suave text-em-dia">{pacientes.length} total</span>
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta mt-0.5">
            Pacientes
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/pacientes/novo" className="btn-escuro">
            <IconUserPlus className="size-4" />
            <span>Novo</span>
          </Link>
          <Link href="/pacientes/importar" className="btn-suave">
            <IconUpload className="size-4" />
            <span>CSV</span>
          </Link>
        </div>
      </header>

      {/* Formulário de Busca */}
      <form className="mb-6 flex gap-2">
        {mostrarArquivados && <input type="hidden" name="arquivados" value="1" />}
        <div className="relative flex-1">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-suave" />
          <input
            name="q"
            defaultValue={busca}
            placeholder="Buscar paciente por nome..."
            aria-label="Buscar por nome"
            className="campo pl-10"
          />
        </div>
        <button type="submit" className="btn-suave shrink-0">
          Buscar
        </button>
      </form>

      {totalArquivados > 0 && (
        <div className="mb-4 -mt-2 text-right">
          <Link
            href={{
              pathname: "/pacientes",
              query: {
                ...(busca ? { q: busca } : {}),
                ...(mostrarArquivados ? {} : { arquivados: "1" }),
              },
            }}
            className="font-mono text-xs text-suave hover:text-tinta transition-colors underline underline-offset-2"
          >
            {mostrarArquivados
              ? "Ocultar arquivados"
              : `Mostrar arquivados (${totalArquivados})`}
          </Link>
        </div>
      )}

      {/* Lista de Pacientes */}
      {pacientes.length === 0 ? (
        <div className="cartao p-10 text-center text-sm text-suave">
          {busca ? (
            <p>Nenhum paciente encontrado com &ldquo;<strong>{busca}</strong>&rdquo;.</p>
          ) : (
            <div className="flex flex-col items-center">
              <IconUserPlus className="size-8 text-suave/60 mb-2" />
              <p className="font-medium text-tinta">Nenhum paciente cadastrado ainda.</p>
              <p className="mt-1 text-xs text-suave">Cadastre o primeiro paciente ou importe um arquivo CSV.</p>
            </div>
          )}
        </div>
      ) : (
        <ul className="cartao divide-y divide-traco/70 overflow-hidden">
          {pacientes.map((p) => {
            // Inicial para Avatar
            const inicial = p.nome.trim().charAt(0).toUpperCase();

            return (
              <li key={p.id} className="group">
                <Link
                  href={`/pacientes/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-fundo/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-em-dia-suave font-display text-sm font-semibold text-em-dia group-hover:bg-em-dia group-hover:text-superficie transition-colors">
                      {inicial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-base font-medium text-tinta group-hover:text-em-dia transition-colors">
                          {p.nome}
                        </span>
                        {!p.ativo && (
                          <span className="selo bg-traco text-suave">Inativo</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs font-mono text-suave">
                        <IconPhone className="size-3 text-suave/60" />
                        <span>{formatarTelefone(p.telefone)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs text-suave">
                    {p.consultas[0] ? (
                      <span className="flex items-center gap-1.5 rounded-lg bg-fundo px-2.5 py-1 border border-traco/60">
                        <IconCalendar className="size-3 text-em-dia" />
                        <span>{formatInTimeZone(p.consultas[0].dataHora, FUSO, "dd/MM/yy")}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-suave/70 italic">Sem consultas</span>
                    )}
                    <IconChevronRight className="size-4 text-suave/40 group-hover:text-em-dia group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
