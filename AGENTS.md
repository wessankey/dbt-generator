<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Package manager: Bun

This project uses **Bun**, not npm or pnpm. Do not run `npm`, `npx`, `pnpm`, or `yarn` commands — use the Bun equivalents below.

| Task                                        | Command            |
| ------------------------------------------- | ------------------ |
| Start the dev server                        | `bun dev`          |
| Build for production                        | `bun run build`    |
| Start the production server                 | `bun start`        |
| Run the linter                              | `bun lint`         |
| Install all dependencies                    | `bun install`      |
| Add a dependency                            | `bun add <pkg>`    |
| Add a dev dependency                        | `bun add -d <pkg>` |
| Remove a dependency                         | `bun remove <pkg>` |
| Run a one-off package binary                | `bunx <pkg>`       |
| Run an arbitrary script from `package.json` | `bun run <script>` |

# Database: Prisma

This project uses **Prisma** as its ORM. The schema lives at `prisma/schema.prisma`.

Any change to the database schema must go through Prisma's tooling — do not edit SQL, run ad-hoc migrations, or modify generated client code by hand.

| Task                                              | Command                                      |
| ------------------------------------------------- | -------------------------------------------- |
| Create and apply a migration in development       | `bunx prisma migrate dev --name <migration>` |
| Apply pending migrations (e.g. in production/CI)  | `bunx prisma migrate deploy`                 |
| Regenerate the Prisma Client after schema changes | `bunx prisma generate`                       |
| Open Prisma Studio to inspect data                | `bunx prisma studio`                         |
| Reset the dev database (destructive)              | `bunx prisma migrate reset`                  |

After editing `prisma/schema.prisma`, always run `bunx prisma migrate dev` so a migration is generated and the client is regenerated. Never apply schema changes by editing the database directly.
