import { defineConfig, env } from "prisma/config";

// Load .env.local file only if it exists (local development)

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
