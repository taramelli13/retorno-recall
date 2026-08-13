# Arquivar Paciente + Prontuário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botão Arquivar/Reativar paciente (soft-delete via `ativo`) e prontuário por consulta (notas longas editáveis, painel lateral ao histórico na ficha).

**Architecture:** Next.js App Router com server components e pequenas ilhas client. Validações puras em `lib/` (testáveis com Vitest), server actions finas em `app/pacientes/actions.ts`, UI com classes utilitárias próprias (`cartao`, `btn-suave`, `campo`, `selo`, `titulo-secao`). O histórico + painel de prontuário viram um componente client único que recebe dados já serializados/formatados do server.

**Tech Stack:** Next.js (App Router, server actions, `useActionState`), Prisma/Postgres, Zod, Vitest, Tailwind v4 com tokens próprios.

**Spec:** `docs/superpowers/specs/2026-08-12-arquivar-prontuario-design.md`

## Global Constraints

- Texto da UI em português brasileiro, seguindo o tom dos textos existentes.
- Limite do prontuário: **5.000 caracteres** (mensagem: "O prontuário pode ter até 5.000 caracteres.").
- Nada é apagado: "remover" = `ativo = false`.
- Contatos (mensagens WhatsApp) aparecem na linha do tempo mas NÃO são selecionáveis no prontuário.
- Erros de action seguem o padrão `Resultado = { erro: string | null }` já existente.
- Baseline de testes: `npx vitest run` → 19 passam; `app/actions.test.ts` e `lib/recall.test.ts` FALHAM sem o Postgres local (127.0.0.1:51214) — falha pré-existente, ignorar. Rodar testes com alvo: `npx vitest run lib/`.
- ATENÇÃO (AGENTS.md): este Next.js tem breaking changes vs. dados de treino. O código existente já segue as convenções corretas (`PageProps<"/rota">`, `searchParams`/`params` como Promise) — copie os padrões dos arquivos citados, não de memória.
- Commits sem trailer de coautoria de IA.

---

### Task 1: Validação de consulta/prontuário em `lib/consulta.ts`

Move o `consultaSchema` (hoje inline em `app/pacientes/actions.ts:74-78`, limite 500) para `lib/`, exportado e testável (arquivos `"use server"` só podem exportar funções async — por isso o schema precisa morar em `lib/`). Sobe o limite para 5.000 e cria `notasSchema` para a edição do prontuário.

**Files:**
- Create: `lib/consulta.ts`
- Create: `lib/consulta.test.ts`
- Modify: `app/pacientes/actions.ts` (remover schema inline, importar de `lib/consulta`)
- Modify: `app/pacientes/[id]/registrar-consulta.tsx` (input notas `maxLength` 500 → 5000)

**Interfaces:**
- Produces: `consultaSchema` (Zod object: `{ data: string ISO, status: enum, notas?: string }`), `notasSchema` (Zod: string → `string | null`, trim, máx 5000), `LIMITE_NOTAS = 5000`.

- [ ] **Step 1: Write the failing tests**

Criar `lib/consulta.test.ts`:

```ts
import { expect, test } from "vitest";
import { consultaSchema, notasSchema, LIMITE_NOTAS } from "./consulta";

test("consulta aceita prontuário longo até o limite", () => {
  const r = consultaSchema.safeParse({
    data: "2026-08-10",
    status: "REALIZADA",
    notas: "a".repeat(LIMITE_NOTAS),
  });
  expect(r.success).toBe(true);
});

test("prontuário acima do limite é recusado com instrução", () => {
  const r = consultaSchema.safeParse({
    data: "2026-08-10",
    status: "REALIZADA",
    notas: "a".repeat(LIMITE_NOTAS + 1),
  });
  expect(r.success).toBe(false);
  expect(notasSchema.safeParse("a".repeat(LIMITE_NOTAS + 1)).success).toBe(false);
});

test("notas em branco viram null (apaga o registro, não guarda espaço)", () => {
  expect(notasSchema.parse("   ")).toBeNull();
  expect(notasSchema.parse("dieta ok")).toBe("dieta ok");
});

test("data e status inválidos são recusados", () => {
  expect(consultaSchema.safeParse({ data: "ontem", status: "REALIZADA" }).success).toBe(false);
  expect(consultaSchema.safeParse({ data: "2026-08-10", status: "TALVEZ" }).success).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/consulta.test.ts`
Expected: FAIL — `lib/consulta.ts` não existe ("Failed to resolve import").

- [ ] **Step 3: Write minimal implementation**

Criar `lib/consulta.ts`:

```ts
import { z } from "zod";

export const LIMITE_NOTAS = 5000;

const notas = z
  .string()
  .trim()
  .max(LIMITE_NOTAS, "O prontuário pode ter até 5.000 caracteres.");

export const consultaSchema = z.object({
  data: z.iso.date(),
  status: z.enum(["AGENDADA", "REALIZADA", "FALTOU", "CANCELADA"]),
  notas: notas.optional(),
});

/** Edição do prontuário: texto em branco significa "apagar", vira null. */
export const notasSchema = notas.transform((v) => v || null);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/consulta.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Use the new schema in the action and widen the input**

Em `app/pacientes/actions.ts`: apagar o bloco inline (linhas 74-78):

```ts
const consultaSchema = z.object({
  data: z.iso.date(),
  status: z.enum(["AGENDADA", "REALIZADA", "FALTOU", "CANCELADA"]),
  notas: z.string().trim().max(500).optional(),
});
```

e adicionar ao bloco de imports do topo:

```ts
import { consultaSchema } from "@/lib/consulta";
```

Em `app/pacientes/[id]/registrar-consulta.tsx`, no input de notas, trocar `maxLength={500}` por `maxLength={5000}`.

- [ ] **Step 6: Run full unit suite + lint**

Run: `npx vitest run lib/ && npx eslint app lib`
Expected: lib/ tudo PASS; eslint sem erros novos.

- [ ] **Step 7: Commit**

```bash
git add lib/consulta.ts lib/consulta.test.ts app/pacientes/actions.ts "app/pacientes/[id]/registrar-consulta.tsx"
git commit -m "Validação de consulta em lib/ e limite de prontuário de 5.000 caracteres"
```

---

### Task 2: Action `definirAtivo` + botão Arquivar/Reativar na ficha

**Files:**
- Modify: `app/pacientes/actions.ts` (nova action no fim do arquivo)
- Modify: `app/components/icons.tsx` (novo `IconArchive`)
- Modify: `app/pacientes/[id]/page.tsx` (botão na barra de ações rápidas, linhas ~116-137)

**Interfaces:**
- Produces: `definirAtivo(pacienteId: string, ativo: boolean): Promise<void>` — server action; Task 3 depende do comportamento (inativos somem da lista por padrão).

- [ ] **Step 1: Add the action**

No fim de `app/pacientes/actions.ts`:

```ts
/** Arquivar = sair das listas sem apagar nada. Reversível com um clique. */
export async function definirAtivo(pacienteId: string, ativo: boolean) {
  await db.paciente.update({
    where: { id: id.parse(pacienteId) },
    data: { ativo },
  });
  revalidatePath("/");
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${pacienteId}`);
}
```

- [ ] **Step 2: Add the archive icon**

No fim de `app/components/icons.tsx` (mesmo estilo outline dos vizinhos):

```tsx
export function IconArchive({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}
```

- [ ] **Step 3: Add the button to the ficha**

Em `app/pacientes/[id]/page.tsx`, dentro da barra "Ações Rápidas" (`div` com `mt-6 flex flex-wrap...`), depois do bloco condicional do `BotaoWhatsApp`, adicionar:

```tsx
<form
  action={definirAtivo.bind(null, paciente.id, !paciente.ativo)}
  className="ml-auto"
>
  <button type="submit" className="btn-suave">
    <IconArchive className="size-4" />
    <span>{paciente.ativo ? "Arquivar" : "Reativar"}</span>
  </button>
</form>
```

Imports: adicionar `definirAtivo` ao import de `../actions` e `IconArchive` ao import de `@/app/components/icons`.

- [ ] **Step 4: Verify**

Run: `npx vitest run lib/ && npx eslint app`
Expected: PASS / sem erros. (Ação é fina sobre o Prisma; a cobertura dela é a verificação manual da Task 6.)

- [ ] **Step 5: Commit**

```bash
git add app/pacientes/actions.ts app/components/icons.tsx "app/pacientes/[id]/page.tsx"
git commit -m "Botão Arquivar/Reativar paciente na ficha"
```

---

### Task 3: Lista de pacientes esconde arquivados por padrão

**Files:**
- Modify: `app/pacientes/page.tsx`

**Interfaces:**
- Consumes: comportamento de `definirAtivo` (Task 2).
- Produces: query string `?arquivados=1` mostra também os inativos; padrão lista só ativos.

- [ ] **Step 1: Filter the query**

Em `app/pacientes/page.tsx`, trocar o início do componente (linhas 18-31) por:

```tsx
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
```

- [ ] **Step 2: Add the toggle link and keep the search working**

Logo abaixo do formulário de busca (depois do `</form>`, antes da lista), adicionar:

```tsx
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
```

No formulário de busca, preservar o filtro atual ao buscar: dentro do `<form>`, antes do input, adicionar:

```tsx
{mostrarArquivados && <input type="hidden" name="arquivados" value="1" />}
```

- [ ] **Step 3: Verify**

Run: `npx eslint app && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/pacientes/page.tsx
git commit -m "Lista de pacientes esconde arquivados por padrão, com toggle"
```

---

### Task 4: Action `atualizarNotasConsulta`

**Files:**
- Modify: `app/pacientes/actions.ts`

**Interfaces:**
- Consumes: `notasSchema` de `lib/consulta` (Task 1).
- Produces: `atualizarNotasConsulta(pacienteId: string, _anterior: Resultado, dados: FormData): Promise<Resultado>` — espera `dados` com `consultaId` (hidden input) e `notas` (textarea). Task 5 chama via `useActionState` com bind do `pacienteId`.

- [ ] **Step 1: Add the action**

No fim de `app/pacientes/actions.ts` (import de `notasSchema` junto ao de `consultaSchema`):

```ts
export async function atualizarNotasConsulta(
  pacienteId: string,
  _anterior: Resultado,
  dados: FormData,
): Promise<Resultado> {
  const rId = id.safeParse(dados.get("consultaId"));
  if (!rId.success) return { erro: "Consulta não encontrada." };

  const r = notasSchema.safeParse(String(dados.get("notas") ?? ""));
  if (!r.success) return { erro: primeiroErro(r.error) };

  // updateMany com pacienteId no where: consulta de outro paciente não é sua.
  const { count } = await db.consulta.updateMany({
    where: { id: rId.data, pacienteId: id.parse(pacienteId) },
    data: { notas: r.data },
  });
  if (count === 0) return { erro: "Consulta não encontrada." };

  revalidatePath(`/pacientes/${pacienteId}`);
  return { erro: null };
}
```

- [ ] **Step 2: Verify**

Run: `npx vitest run lib/ && npx eslint app && npx tsc --noEmit`
Expected: PASS / sem erros (a validação de limite/null já está coberta pelos testes da Task 1).

- [ ] **Step 3: Commit**

```bash
git add app/pacientes/actions.ts
git commit -m "Action para editar o prontuário de uma consulta"
```

---

### Task 5: Componente `Prontuario` + layout em duas colunas

O histórico atual (`app/pacientes/[id]/page.tsx:140-182`) vira um componente client que também renderiza o painel de prontuário. A page continua montando os dados (datas já formatadas, tudo serializável) e passa a action com bind.

**Files:**
- Create: `app/pacientes/[id]/prontuario.tsx`
- Modify: `app/pacientes/[id]/page.tsx`

**Interfaces:**
- Consumes: `atualizarNotasConsulta` (Task 4), `LIMITE_NOTAS` (Task 1), `Resultado` de `../actions`.
- Produces: `Prontuario({ entradas, acao })` com `EntradaHistorico = { consultaId: string | null; data: string; titulo: string; notas: string | null; tom: "sucesso" | "alerta" | "neutro" }`.

- [ ] **Step 1: Create the client component**

Criar `app/pacientes/[id]/prontuario.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import type { Resultado } from "../actions";
import { LIMITE_NOTAS } from "@/lib/consulta";
import { IconClock, IconEdit } from "@/app/components/icons";

export type EntradaHistorico = {
  /** null para contatos (mensagens): aparecem na linha do tempo, sem prontuário. */
  consultaId: string | null;
  data: string; // dd/MM/yy, já formatada no server
  titulo: string;
  notas: string | null;
  tom: "sucesso" | "alerta" | "neutro";
};

const COR = {
  sucesso: "bg-em-dia",
  alerta: "bg-vencido",
  neutro: "bg-a-vencer",
};

export function Prontuario({
  entradas,
  acao,
}: {
  entradas: EntradaHistorico[];
  acao: (anterior: Resultado, dados: FormData) => Promise<Resultado>;
}) {
  const [selecionada, setSelecionada] = useState<string | null>(
    entradas.find((e) => e.consultaId)?.consultaId ?? null,
  );
  const [editando, setEditando] = useState(false);
  const [estado, enviar, pendente] = useActionState(
    async (anterior: Resultado, dados: FormData) => {
      const r = await acao(anterior, dados);
      if (!r.erro) setEditando(false);
      return r;
    },
    { erro: null },
  );

  const sel = entradas.find((e) => e.consultaId === selecionada) ?? null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-6">
      {/* Linha do tempo */}
      <section>
        <h2 className="titulo-secao mb-3 flex items-center gap-2">
          <IconClock className="size-3.5 text-em-dia" />
          <span>Histórico de Atendimentos &amp; Mensagens</span>
        </h2>

        {entradas.length === 0 ? (
          <div className="cartao p-8 text-center text-sm text-suave">
            Nenhum histórico registrado ainda para este paciente.
          </div>
        ) : (
          <ul className="cartao divide-y divide-traco/70 overflow-hidden">
            {entradas.map((e, i) => {
              const conteudo = (
                <>
                  <span className="shrink-0 pt-0.5 font-mono text-xs text-suave tabular-nums">
                    {e.data}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full shrink-0 ${COR[e.tom]}`} />
                      <span className="font-medium text-tinta">{e.titulo}</span>
                    </div>
                    {e.notas && (
                      <p className="mt-0.5 truncate text-xs text-suave pl-4">
                        &ldquo;{e.notas}&rdquo;
                      </p>
                    )}
                  </div>
                </>
              );

              if (!e.consultaId) {
                return (
                  <li key={i} className="flex items-start gap-3 px-5 py-3.5 text-sm">
                    {conteudo}
                  </li>
                );
              }

              const ativa = e.consultaId === selecionada;
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => {
                      setSelecionada(e.consultaId);
                      setEditando(false);
                    }}
                    className={`flex w-full items-start gap-3 px-5 py-3.5 text-left text-sm transition-colors ${
                      ativa ? "bg-em-dia-suave/60" : "hover:bg-fundo/50"
                    }`}
                  >
                    {conteudo}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Painel de prontuário */}
      <aside className="cartao mt-6 p-5 lg:sticky lg:top-6 lg:mt-0">
        <h2 className="titulo-secao mb-3">Prontuário da consulta</h2>

        {!sel ? (
          <p className="text-sm text-suave">
            Nenhuma consulta registrada ainda. O prontuário aparece aqui quando
            houver uma consulta no histórico.
          </p>
        ) : (
          <>
            <p className="font-mono text-xs text-suave">
              {sel.data} — {sel.titulo}
            </p>

            {editando ? (
              <form action={enviar} key={sel.consultaId}>
                <input type="hidden" name="consultaId" value={sel.consultaId!} />
                <textarea
                  name="notas"
                  defaultValue={sel.notas ?? ""}
                  maxLength={LIMITE_NOTAS}
                  rows={12}
                  autoFocus
                  placeholder="O que foi conversado e orientado nesta consulta..."
                  className="campo mt-3 w-full resize-y text-sm leading-relaxed"
                />
                <div className="mt-3 flex items-center gap-2">
                  <button type="submit" disabled={pendente} className="btn-escuro">
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="btn-suave"
                  >
                    Cancelar
                  </button>
                </div>
                {estado.erro && (
                  <p role="alert" className="mt-2 text-sm text-vencido">
                    {estado.erro}
                  </p>
                )}
              </form>
            ) : (
              <>
                {sel.notas ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-tinta">
                    {sel.notas}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-suave">
                    Sem registro para esta consulta.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="btn-suave mt-4"
                >
                  <IconEdit className="size-4" />
                  <span>{sel.notas ? "Editar prontuário" : "Escrever prontuário"}</span>
                </button>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Add the edit icon**

No fim de `app/components/icons.tsx`:

```tsx
export function IconEdit({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
```

- [ ] **Step 3: Use it in the page and widen the layout**

Em `app/pacientes/[id]/page.tsx`:

1. `<main className="mx-auto w-full max-w-xl px-4 pb-20 pt-6">` → `max-w-xl lg:max-w-5xl`.
2. Substituir toda a `<section>` "Histórico do Paciente" (linhas 140-182) por:

```tsx
<section className="mb-8">
  <Prontuario
    entradas={historico.map((e) => ({
      consultaId: e.tipo === "CONSULTA" ? e.consultaId : null,
      data: formatInTimeZone(e.data, FUSO, "dd/MM/yy"),
      titulo: e.titulo,
      notas: e.notas,
      tom:
        e.status === "REALIZADA" || e.status === "RESPONDEU" || e.status === "REMARCOU"
          ? ("sucesso" as const)
          : e.status === "FALTOU" || e.status === "CANCELADA"
            ? ("alerta" as const)
            : ("neutro" as const),
    }))}
    acao={atualizarNotasConsulta.bind(null, paciente.id)}
  />
</section>
```

3. No array `historico` (linhas 59-74), incluir o id da consulta no map de consultas: `tipo, status, data, titulo, notas` ganham `consultaId: c.id` (e o map de contatos, `consultaId: null` — o objeto de contatos já tem `notas: null`).
4. A `<section>` "Dados Cadastrais" ganha `className="max-w-xl"` para o formulário não esticar em telas largas.
5. Imports: adicionar `Prontuario` de `./prontuario`, `atualizarNotasConsulta` de `../actions`; remover `IconClock` do import de icons se ficar sem uso na page.

- [ ] **Step 4: Verify**

Run: `npx vitest run lib/ && npx eslint app && npx tsc --noEmit`
Expected: PASS / sem erros.

- [ ] **Step 5: Commit**

```bash
git add "app/pacientes/[id]/prontuario.tsx" "app/pacientes/[id]/page.tsx" app/components/icons.tsx
git commit -m "Painel de prontuário ao lado do histórico na ficha do paciente"
```

---

### Task 6: Verificação manual no app rodando

**Files:** nenhum (verificação).

- [ ] **Step 1: Subir o app com banco local**

Run: `npm run dev` (o Prisma dev server local sobe junto se configurado; senão, conferir `.env`). Se necessário, `npm run seed` para dados de exemplo.

- [ ] **Step 2: Roteiro de verificação**

1. Ficha de um paciente ativo → botão "Arquivar" à direita da barra de ações; clicar → selo "Inativo" aparece, botão vira "Reativar".
2. `/pacientes` → paciente arquivado sumiu; link "Mostrar arquivados (N)" aparece; clicar → paciente listado com selo "Inativo"; buscar por nome mantém o filtro.
3. Home `/` → paciente arquivado não aparece em nenhuma lista de recall.
4. "Reativar" → paciente volta às listas.
5. Ficha com consultas → desktop largo: histórico à esquerda, painel à direita com a consulta mais recente selecionada; clicar em outra consulta troca o painel; contatos WhatsApp não são clicáveis.
6. "Escrever prontuário" → digitar texto multi-linha, salvar → painel mostra o texto, entrada do histórico mostra a prévia truncada.
7. Editar de novo, apagar tudo, salvar → volta a "Sem registro para esta consulta."
8. Janela estreita (mobile) → painel empilha abaixo do histórico.

- [ ] **Step 3: Suite completa + lint**

Run: `npx vitest run && npx eslint .`
Expected: mesmos resultados da baseline (só os 2 arquivos dependentes de banco falham se o banco não estiver de pé; com `npm run dev` ativo devem passar também).
