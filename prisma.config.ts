import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";
import { existsSync } from "fs";

// Load .env.local file only if it exists (local development)
if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
