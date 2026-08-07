import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, selo } from "@/lib/sessao";

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
    <main className="mx-auto w-full max-w-xs px-4 pt-24">
      <h1 className="font-display text-2xl font-semibold">Retorno</h1>
      <form action={entrar} className="cartao mt-6 flex flex-col gap-3 p-5">
        <label htmlFor="senha" className="text-sm">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoFocus
          required
          className="campo"
        />
        <button
          type="submit"
          className="btn-escuro"
        >
          Entrar
        </button>
        {erro && (
          <p role="alert" className="text-sm text-vencido">
            Senha incorreta. Tente de novo.
          </p>
        )}
      </form>
    </main>
  );
}
