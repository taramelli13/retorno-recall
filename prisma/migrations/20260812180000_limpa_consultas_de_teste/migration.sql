-- Limpeza única (12/08/2026): remove as consultas criadas nos testes do dia e o
-- lixo importado pelo matching antigo do sync (eventos pessoais casando por
-- substring, ex. "ana" dentro de "semanais"). Toda linha com googleEventId até
-- esta data veio desses testes — o recurso tinha um dia de vida. Em bancos
-- novos a tabela está vazia e isto é um no-op.
DELETE FROM "Consulta" WHERE "googleEventId" IS NOT NULL;
