import { defineConfig } from "vitest/config";

export default defineConfig({
  // O alias "@/" do tsconfig; o Vitest não lê tsconfig paths sozinho.
  resolve: { alias: { "@": import.meta.dirname } },
  // Os testes semeiam o mesmo banco: rodar dois arquivos em paralelo embaralha tudo.
  test: { fileParallelism: false },
});
