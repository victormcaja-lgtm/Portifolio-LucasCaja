/** URL do banco de teste; nunca aponta para o banco de desenvolvimento por padrão. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://portfolio:portfolio@localhost:5434/portfolio_test?schema=public";
