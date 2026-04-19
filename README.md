# dbt-generator

This app now includes:

- Better Auth login with GitHub OAuth
- GitHub App installation flow
- Explicit repository connection per user
- Live read access to dbt project files on the default branch
- Draft PR creation on a fresh `dbt-generator/*` branch

## Local setup

1. Install dependencies (this repo uses [Bun](https://bun.sh)):

```bash
bun install
```

If Bun reports blocked postinstall scripts, run `bun pm untrusted` and approve **`prisma`** so the CLI/client tooling can install correctly. This repo lists `prisma` under `trustedDependencies` to reduce friction.

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in all required values in `.env.local`.

4. Create/update the database schema and generate Prisma client:

This project uses **Prisma ORM 7** with `prisma.config.ts` (database URL is no longer in `schema.prisma`) and a **PostgreSQL driver adapter** (`@prisma/adapter-pg` + `pg`). The generated client is written to `generated/prisma/` (gitignored).

```bash
bunx prisma generate
bunx prisma db push
```

`prisma.config.ts` loads `.env` then `.env.local` (with override) so the CLI picks up `DATABASE_URL` the same way you expect locally.

5. Run the app:

```bash
bun run dev
```

`bun run build` runs `prisma generate` before `next build`, so production builds also emit the client.

Open [http://localhost:3000](http://localhost:3000).

## GitHub configuration

You need two GitHub integrations:

- **GitHub OAuth App** for user login (used by Better Auth)
- **GitHub App** for repository access + PR creation

### OAuth App

- Set callback URL to:
  - `http://localhost:3000/api/auth/callback/github`

### GitHub App

- Permissions:
  - Repository metadata: **Read-only**
  - Contents: **Read & write**
  - Pull requests: **Read & write**
- Installation target: user + organizations
- Setup URL:
  - `http://localhost:3000/api/github/install/callback`
- After creating the app, copy:
  - App ID
  - App slug
  - Private key (PEM)

## Safety constraints implemented

- Repo writes are blocked outside dbt path allowlist (`models/**`, `macros/**`, `seeds/**`, `snapshots/**`, `analyses/**`, `tests/**`, and top-level dbt config files).
- PRs always target the default branch.
- Every generation uses a fresh branch.
- PRs are created as draft by default.
