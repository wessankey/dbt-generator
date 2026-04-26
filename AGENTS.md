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
