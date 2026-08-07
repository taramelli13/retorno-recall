import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, selo } from "@/lib/sessao";

// Senha única, um usuário. Sem sessão no banco, sem tabela de login.
export async function proxy(request: NextRequest) {
  const senha = process.env.APP_PASSWORD;
  if (!senha) {
    return new NextResponse(
      "APP_PASSWORD não está configurada. Defina a variável de ambiente para entrar.",
      { status: 500 },
    );
  }

  if (request.cookies.get(COOKIE_SESSAO)?.value === (await selo(senha))) return;

  return NextResponse.redirect(new URL("/entrar", request.url));
}

export const config = {
  // O cron não tem cookie: ele se autentica pelo CRON_SECRET na própria rota.
  matcher: ["/((?!entrar|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
