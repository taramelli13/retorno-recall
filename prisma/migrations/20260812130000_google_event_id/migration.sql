-- Coluna que a integração com Google Agenda usa para deduplicar eventos.
ALTER TABLE "Consulta" ADD COLUMN "googleEventId" TEXT;

CREATE UNIQUE INDEX "Consulta_googleEventId_key" ON "Consulta"("googleEventId");
