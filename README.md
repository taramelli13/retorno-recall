# Retorno

**Toda manhã, uma lista curta e confiável de quem precisa remarcar consulta.**

Sistema de recall de pacientes para um consultório de nutrição. No ar, em uso real,
com cerca de 30 pacientes ativos. A URL não é divulgada: o sistema guarda dado de
saúde e o acesso é de uma pessoa só.

`Next.js 16` · `TypeScript` · `PostgreSQL` · `Prisma` · `Tailwind 4` · `Vitest` · `Vercel`

---

## O problema

O paciente termina a consulta, sai do consultório e some. Ninguém marca o retorno na
hora. Três semanas depois ele ainda lembra que precisa voltar; três meses depois já
desistiu do acompanhamento — e a nutricionista só percebe quando olha a agenda vazia
e não sabe dizer quem sumiu.

Não é um problema de agenda. É um problema de **memória**. A informação existe (todo
mundo tem um intervalo de retorno recomendado), mas ninguém consegue cruzar isso com
"quem já foi avisado" na cabeça, todo dia, para trinta pessoas.

O sistema resolve um problema só: **lembrar quem precisa remarcar.**

## A regra de negócio

É o coração do projeto e a parte que precisa estar certa antes de qualquer interface.
Um paciente entra na lista de hoje quando **todas** as cinco condições valem:

1. está ativo;
2. tem ao menos uma consulta realizada;
3. `última consulta + intervalo de retorno` já venceu ou vence nos próximos 7 dias;
4. **não** existe consulta agendada no futuro;
5. **não** houve contato nos últimos 5 dias.

As condições 1 a 3 são óbvias. **As condições 4 e 5 são o que separa uma lista útil de
uma lista que mente** — sem elas, o sistema cobra na segunda alguém que já remarcou na
sexta, e cobra de novo na quarta. Duas mensagens repetidas e a nutricionista para de
confiar na lista; a partir daí o sistema não serve mais pra nada.

As cinco condições são uma pergunta só, então são uma query só ([`lib/recall.ts`](lib/recall.ts)):

```sql
WITH ultima AS (
  SELECT "pacienteId", MAX("dataHora") AS data
  -- data futura em consulta realizada é erro de digitação: ignorar, para
  -- que o paciente continue aparecendo em vez de sumir em silêncio.
  FROM "Consulta" WHERE status = 'REALIZADA' AND "dataHora" <= NOW()
  GROUP BY "pacienteId"
)
SELECT p.id, p.nome, p.telefone, p."intervaloDias",
       u.data AS "ultimaConsulta",
       u.data + (p."intervaloDias" || ' days')::interval AS "venceEm"
FROM "Paciente" p
JOIN ultima u ON u."pacienteId" = p.id
WHERE p.ativo
  AND u.data + (p."intervaloDias" || ' days')::interval <= NOW() + INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM "Consulta" c
    WHERE c."pacienteId" = p.id AND c.status = 'AGENDADA' AND c."dataHora" > NOW()
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Contato" ct
    WHERE ct."pacienteId" = p.id AND ct.data > NOW() - INTERVAL '5 days'
  )
ORDER BY "venceEm" ASC, p.nome ASC;
```

O `AND "dataHora" <= NOW()` no CTE não estava na especificação original. Foi adicionado
depois de perceber o modo de falha: se alguém digitar 2027 no lugar de 2026 ao registrar
uma consulta realizada, o paciente sai da lista e **nunca mais volta**, sem erro nenhum.
Falha silenciosa é pior que falha barulhenta.

## A tela

<img src="docs/hoje.png" width="360" alt="Tela Hoje no celular: data, contagem de pacientes a contatar e cartões com a barra de ciclo">

O contexto de uso é específico: 8h da manhã, no celular, com café na mão, entre um
paciente e outro. A tela precisa ser lida em cinco segundos.

**A barra de ciclo** é o elemento que carrega isso. O trilho representa o intervalo de
retorno daquele paciente; o preenchimento, o tempo decorrido. Quem passou do prazo
transborda o trilho, e o excedente sai em vinho. Um traço de 1px marca o fim do prazo,
senão o transbordo vira só troca de cor.

<img src="docs/ciclo.png" width="360" alt="Quatro cartões mostrando os estados da barra: dois transbordando em vinho, um exatamente no limite em ocre, um ainda dentro do prazo em verde">

Os quatro cartões acima são o mesmo componente em quatro estados: 20 e 5 dias de atraso
(transbordo em vinho), vencendo hoje (trilho cheio, ocre) e faltando 3 dias (verde).
Dá pra varrer a lista sem ler número nenhum — e o tamanho do transbordo é literalmente a
métrica que importa. Repare no terceiro: o ciclo dela é de 15 dias, não 30, e a barra é
proporcional ao intervalo de cada paciente, não a uma escala fixa.

A ficha junta consultas e contatos numa linha do tempo só, porque a pergunta que se faz
olhando pra ela é sempre "o que aconteceu com essa pessoa, em ordem":

<img src="docs/ficha.png" width="360" alt="Ficha de paciente com histórico misturando consultas realizadas e tentativas de contato sem resposta">

O botão de WhatsApp abre a conversa com o texto pré-preenchido **e** grava o contato no
mesmo clique — é isso que faz o paciente sumir da lista quando ela volta pro app, sem
checkbox e sem "marcar como feito".

## Decisões de engenharia

O que este projeto tem de interessante não é o que ele faz, é o que ele decidiu **não**
fazer. Cada decisão abaixo tem um trade-off explícito.

### `wa.me` em vez da WhatsApp Cloud API

A decisão mais importante do projeto, e a mais fácil de "melhorar" por engano.

O sistema **não envia mensagens**. Ele monta um link `wa.me` com o texto pronto; a
nutricionista clica, o WhatsApp abre, ela ajusta e envia com as próprias mãos.

Motivo técnico: a Cloud API exige conta business verificada, templates aprovados pela
Meta e custo por conversa — desproporcional para 30 pacientes. Motivo de produto, que
pesa mais: mensagem automática destrói o vínculo, e o vínculo é exatamente o que ela
vende. Um paciente que percebe que recebeu um robô não volta.

> **Automatize a memória, não a conversa.**

### Três tabelas, e a terceira é a que importa

`Paciente`, `Consulta`, `Contato`. A terceira parece supérflua — até você notar que sem
ela não existe resposta para "quem eu já avisei essa semana?", e a lista passa a cobrar
a mesma pessoa três vezes. Toda a condição 5 da regra vive nela.

### SQL cru para o recall

As cinco condições são uma pergunta só. Espalhadas em query builder, com um `NOT EXISTS`
virando subconsulta encadeada, fica mais difícil olhar e verificar que todas as cinco
estão lá. O resto do app usa Prisma normalmente — o SQL cru é para a única query que
precisa ser auditável de relance.

### UTC no banco, América/São_Paulo no cálculo

Um retorno que vence "hoje" precisa virar à meia-noite de Brasília, não de Londres.
Datas são gravadas ao meio-dia de Brasília (`date-fns-tz`), porque o sistema não é
agenda de horários — só precisa cair no dia certo, e meio-dia sobrevive a qualquer
mudança de fuso. A contagem de dias usa `differenceInCalendarDays` sobre datas já
convertidas para o fuso, nunca subtração de timestamps.

### Telefone validado contra o canal real, não contra a norma

Celular antigo de 8 dígitos é **recusado de propósito**: é formalmente um telefone
válido, mas não funciona mais no WhatsApp, que é o único canal que o sistema usa.
Validar contra a norma aceitaria um número que falha na entrega.

Número que começa com `+` e código de país diferente de 55 passa como está, validado só
pelo comprimento E.164 — duas pacientes moram fora do Brasil. Carregar uma tabela de
numeração de 200 países por causa de duas pessoas não se paga.

### Oito dependências de runtime

`next`, `react`, `react-dom`, `@prisma/client`, `@prisma/adapter-pg`, `zod`, `date-fns`,
`date-fns-tz`. Só isso.

| Em vez de | Foi feito com |
|---|---|
| NextAuth / Auth.js | SHA-256 via `crypto.subtle` + cookie httpOnly — 12 linhas ([`lib/sessao.ts`](lib/sessao.ts)) |
| SDK da Resend | `fetch` direto na API REST |
| Parser de CSV | 34 linhas com `split` e erro numerado por linha ([`lib/csv.ts`](lib/csv.ts)) |
| libphonenumber | um `Set` com os 67 DDDs brasileiros válidos |
| Biblioteca de formulário | Server Actions + `useActionState` |
| Date picker | `<input type="date" min>` nativo |

É um sistema de usuário único com uma senha. Uma biblioteca de auth traria banco de
sessões, provedores OAuth e superfície de ataque que não existe aqui.

### Server Components por padrão

Quatro componentes de cliente no app inteiro, exatamente onde há interação real: o card
da tela Hoje, e três formulários. Todo o resto renderiza no servidor.

## Testes

42 testes, **integração contra Postgres de verdade** — sem mock de banco. A regra de
negócio é uma query SQL; testá-la contra um mock testaria o mock.

O detalhe que vale mostrar está em [`prisma/seed.ts`](prisma/seed.ts): cada caso do seed
declara a própria expectativa.

```ts
type Caso = {
  nome: string;
  consultas: { dataHora: Date; status: StatusConsulta }[];
  contatos?: { data: Date; resultado?: ResultadoContato }[];
  /** verdade esperada da regra central */
  aparece: boolean;
  porque: string;
};
```

[`lib/recall.test.ts`](lib/recall.test.ts) gera **um teste por linha do seed**. Adicionar
um caso-limite adiciona um teste, e o motivo aparece no nome do teste quando ele quebra.

Os casos que mais dizem sobre o sistema:

| Caso | Espera | Por quê |
|---|---|---|
| Mariana | não aparece | vence em 8 dias — um dia fora da janela de 7 |
| Patrícia | aparece | último contato cruzou os 5 dias por 1 hora |
| Olívia | aparece | consulta futura **cancelada** não conta como agendada |
| Kelly | aparece | faltou na última, mas a realizada de 50 dias atrás ainda vale |
| Renata | aparece | ano digitado errado numa realizada não pode escondê-la |

E um teste que não é sobre nenhum caso específico:

```ts
test("não inventa nem esquece ninguém", ...)
```

Ele compara o tamanho da lista com `CASOS.filter(c => c.aparece).length`. Sem ele, os
testes pegariam falso negativo (alguém sumiu) mas não falso positivo (alguém apareceu
sem dever) — e falso positivo é justamente o que faz a nutricionista perder a confiança
na lista.

```bash
npm test
```

## Acessibilidade e piso de qualidade

Não é seção decorativa — está implementado e dá pra conferir no código:

- **Mobile-first de verdade**, não adaptação: o celular é o dispositivo principal.
- `prefers-reduced-motion` desliga todas as transições.
- Foco de teclado visível em tudo, via `:focus-visible`.
- Todo erro tem `role="alert"`; a barra de ciclo é `role="img"` com `aria-label` que diz
  o número de dias, para quem não enxerga a barra.
- **Erros dizem o que aconteceu e o que fazer, e não pedem desculpa:**
  *"Essa data já passou. Escolha hoje ou uma data futura."*
- O estado vazio da tela Hoje é uma boa notícia, e o texto diz isso: *"Tudo em dia."*
- Importação de CSV é parcial por design: as linhas boas entram, as ruins voltam com o
  número da linha e o motivo. Nada é tudo-ou-nada.

## LGPD

Dado de saúde é dado pessoal sensível, e isso mudou decisões concretas:

- **O resumo diário por e-mail leva nome e prazo, nunca telefone nem observação.** É o
  único ponto onde dado sai do sistema, então é onde menos dado deve passar.
- O seed é fictício por obrigação, não por conveniência: nenhum dado real versionado.
- Banco nunca exposto publicamente; conexão só por variável de ambiente.
- O campo `observacoes` é anotação operacional ("prefere terça à tarde"), não conteúdo
  clínico — e a interface não convida ao uso clínico dele.

## O que ficou de fora, de propósito

A lista mais importante do projeto. Nada abaixo é backlog; é escopo recusado:

- **Não é prontuário eletrônico.** Sem anamnese, exames, antropometria, evolução.
- **Não é software de prescrição.** Sem plano alimentar, cálculo de macros, tabela TACO.
- **Não é agenda de horários.** Sem grade semanal, blocos, disponibilidade, encaixe.
- **Não tem app nem login para o paciente.** O paciente nunca acessa o sistema.
- **Não tem multiusuário**, times, permissões ou papéis.
- **Não tem financeiro**, cobrança ou emissão de recibo.

Cada item desses é um produto inteiro, e cada um deles teria adiado indefinidamente a
única coisa que resolvia a dor real. O sistema chegou em produção rápido porque a
resposta para quase tudo foi não.

## Arquitetura

```
app/
  page.tsx                    tela Hoje — Server Component, chama a query do recall
  card-paciente.tsx           o card e a barra de ciclo (client)
  actions.ts                  registrar contato, marcar retorno
  entrar/                     login por senha única
  pacientes/                  lista, cadastro, ficha, importação de CSV
  api/cron/resumo/            e-mail diário das 7h (Vercel Cron + Resend)
lib/
  recall.ts                   a regra de negócio, em SQL
  paciente.ts                 normalização e validação de telefone (Zod)
  csv.ts                      importação por colagem
  mensagem.ts                 o texto e o link wa.me
  sessao.ts                   selo de sessão (SHA-256)
proxy.ts                      middleware de senha (Next 16 renomeou middleware.ts)
prisma/seed.ts                16 casos-limite com a expectativa declarada
```

O cron (`0 10 * * 1-5` = 7h de Brasília, dias úteis) chama exatamente a mesma função que
a interface usa. Uma regra, um lugar. Se o e-mail e a tela discordassem, a lista deixaria
de ser confiável — que é o único ativo do sistema.

## Rodando local

```bash
npm install
cp .env.example .env          # preencher DATABASE_URL e APP_PASSWORD
npx prisma migrate dev
npm run seed                  # 16 pacientes fictícios
npm run dev
```

```bash
npm test                      # 42 testes (precisa de banco)
npm run recall                # imprime a lista de hoje no terminal
```
