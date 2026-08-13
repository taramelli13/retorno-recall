# Design: Arquivar paciente + Prontuário por consulta

Data: 2026-08-12
Status: aprovado em conversa

## Contexto

O Retorno é um app de recall de pacientes (Next.js + Prisma/Postgres, server components com pequenas ilhas client). A ficha do paciente (`app/pacientes/[id]/page.tsx`) hoje é uma coluna única (`max-w-xl`) com: cartão de perfil, barra de ações rápidas, histórico de atendimentos & mensagens, e formulário de dados cadastrais.

Fatos relevantes do código atual:

- `Paciente.ativo` já existe; a home/recall (`lib/recall.ts`) já exclui inativos. A lista de pacientes (`app/pacientes/page.tsx`) mostra todos, com selo "Inativo".
- `Consulta.notas` já existe (`String?` no Postgres, sem limite físico), validado com máximo de 500 caracteres em `consultaSchema` (`app/pacientes/actions.ts`) e exibido no histórico.

## Decisões (com o usuário)

1. **Remoção = arquivar, nunca excluir.** Marcar `ativo = false`; nada é apagado.
2. **Prontuário = evoluir as notas da consulta.** Uma entrada de prontuário por consulta, texto longo e editável depois. Sem anotações avulsas desvinculadas de consulta.
3. **Layout em duas colunas** na ficha: histórico à esquerda, painel de prontuário à direita; empilha no mobile.

## Feature 1: Arquivar paciente

### Comportamento

- Botão **"Arquivar"** na barra de ações rápidas da ficha. Ao clicar, `ativo = false`. Sem diálogo de confirmação (reversível com um clique).
- Se o paciente já está arquivado, o mesmo lugar mostra **"Reativar"** (`ativo = true`).
- **Lista de pacientes**: por padrão lista só ativos. Um toggle/link "Mostrar arquivados (N)" (via query string, ex.: `?arquivados=1`) inclui os inativos, mantendo o selo "Inativo". A busca por nome respeita o mesmo filtro.
- Home/recall: nenhuma mudança (já exclui inativos).

### Implementação

- Server action `definirAtivo(pacienteId, ativo)` em `app/pacientes/actions.ts`, com `revalidatePath` de `/`, `/pacientes` e `/pacientes/[id]` (mesmo padrão de `atualizarPaciente`).
- Formulário `<form action={...}>` server-side na ficha, sem componente client novo.
- Filtro na query do `findMany` da lista + contagem de arquivados para o rótulo do toggle.

### Sem mudança de schema.

## Feature 2: Prontuário por consulta

### Dados

- Reutiliza `Consulta.notas`. Limite de validação sobe de 500 para **5.000 caracteres** (em `consultaSchema` e na nova action de edição). Sem migração de banco.

### Comportamento

- A ficha alarga para `max-w-5xl` em telas `lg+` e vira grid de duas colunas: **esquerda** = histórico (linha do tempo atual, consultas + contatos); **direita** = painel de prontuário (sticky).
- Clicar numa **consulta** do histórico a seleciona; o painel mostra data, status e o texto completo das notas, com modo de edição (textarea + salvar/cancelar).
- **Contatos (mensagens WhatsApp) não são selecionáveis** — prontuário é só de consultas.
- A consulta mais recente vem selecionada por padrão. Se o paciente não tem consultas, o painel mostra estado vazio.
- No mobile (< lg), o painel empilha abaixo do histórico.

### Implementação

- Novo componente client `app/pacientes/[id]/prontuario.tsx` que recebe o histórico serializado (consultas + contatos) e encapsula: linha do tempo (com seleção) + painel de prontuário. Estado de seleção via `useState`; sem navegação por clique.
- Server action `atualizarNotasConsulta(consultaId, pacienteId, notas)` em `app/pacientes/actions.ts`: valida (máx. 5.000), confere que a consulta pertence ao paciente, atualiza e revalida `/pacientes/[id]`. Segue o padrão `useActionState` de `RegistrarConsulta`.
- A page continua server component: busca os dados e passa props serializáveis (datas como ISO string ou timestamps) para o componente client.

## Fora de escopo (YAGNI)

- Exclusão permanente de pacientes.
- Anotações de prontuário desvinculadas de consulta.
- Histórico de versões/auditoria do prontuário.
- Rich text — o prontuário é texto puro.

## Testes

- Unit tests (Vitest) para validação das novas actions, seguindo o padrão de `lib/paciente.test.ts`: limites do texto do prontuário (5.000), rejeição de consulta de outro paciente, coerção do `ativo`.
- Verificação manual no app rodando: arquivar/reativar, filtro da lista, selecionar/editar prontuário, layout responsivo.

## Tratamento de erros

- Actions devolvem `{ erro }` no padrão existente (`Resultado`); o painel exibe a mensagem inline como os formulários atuais.
- `atualizarNotasConsulta` com consulta inexistente ou de outro paciente: erro genérico "Consulta não encontrada."
