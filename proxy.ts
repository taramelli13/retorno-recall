import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, tokenValido } from "@/lib/sessao";

// Senha única, um usuário. Sem sessão no banco, sem tabela de login:
// o cookie é um token assinado que se valida sozinho (ver lib/sessao.ts).
export async function proxy(request: NextRequest) {
  const segredo = process.env.APP_SESSION_SECRET;
  if (!segredo) {
    // Falha fechada e barulhenta. Sem o segredo não dá para validar cookie nenhum,
    // e deixar passar seria abrir o prontuário para a internet inteira.
    return new NextResponse(
      "APP_SESSION_SECRET não está configurada. Defina a variável de ambiente para entrar.",
      { status: 500 },
    );
  }

  if (await tokenValido(request.cookies.get(COOKIE_SESSAO)?.value, segredo)) {
    return;
  }

  return NextResponse.redirect(new URL("/entrar", request.url));
}

export const config = {
  // O cron não tem cookie: ele se autentica pelo CRON_SECRET na própria rota.
  matcher: ["/((?!entrar|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
