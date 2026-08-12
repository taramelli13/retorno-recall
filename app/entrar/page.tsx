import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, selo } from "@/lib/sessao";
import { IconAlertCircle } from "@/app/components/icons";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { erro } = await searchParams;

  async function entrar(dados: FormData) {
    "use server";
    const senha = process.env.APP_PASSWORD;
    const tentativa = String(dados.get("senha") ?? "");

    if (!senha || (await selo(tentativa)) !== (await selo(senha))) {
      redirect("/entrar?erro=1");
    }

    (await cookies()).set(COOKIE_SESSAO, await selo(senha), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 180,
    });
    redirect("/");
  }

  return (
    <main className="flex min-h-[85vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-tinta text-superficie shadow-md mb-3">
            <span className="font-display text-xl font-bold">R</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-tinta">
            Retorno
          </h1>
          <p className="mt-1 font-mono text-xs text-suave uppercase tracking-wider">
            Acesso Restrito ao Consultório
          </p>
        </div>

        <form action={entrar} className="cartao flex flex-col gap-4 p-6">
          <label htmlFor="senha" className="flex flex-col gap-1.5">
            <span className="titulo-secao">Senha de Acesso</span>
            <input
              id="senha"
              name="senha"
              type="password"
              autoFocus
              required
              placeholder="••••••••"
              className="campo font-mono"
            />
          </label>

          <button
            type="submit"
            className="btn-escuro w-full py-2.5"
          >
            Entrar no Sistema
          </button>

          {erro && (
            <div role="alert" className="flex items-center gap-1.5 text-sm text-vencido bg-vencido-suave p-3 rounded-lg border border-vencido/20">
              <IconAlertCircle className="size-4 shrink-0" />
              <span>Senha incorreta. Tente novamente.</span>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
