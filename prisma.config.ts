import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";
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
    url: env("DIRECT_URL"),
  },
});
