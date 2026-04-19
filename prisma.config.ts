import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
